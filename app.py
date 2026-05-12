from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import os
import json
import uuid
import shutil
from werkzeug.utils import secure_filename
from folders_structure import FOLDERS_STRUCTURE, ALL_SUBFOLDERS
from ocr_processor import process_file

app = Flask(__name__)
app.secret_key = 'smart-sorter-secret-key'

DATA_FILE = 'data/teachers.json'
REPORTS_FILE = 'data/reports.json'
UPLOAD_FOLDER = 'uploads'
os.makedirs('data', exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

if not os.path.exists(REPORTS_FILE):
    with open(REPORTS_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

def get_teachers():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_teachers(teachers):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(teachers, f, ensure_ascii=False, indent=4)

def get_reports():
    with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_reports(reports):
    with open(REPORTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(reports, f, ensure_ascii=False, indent=4)

def setup_teacher_folders(teacher_id):
    base_path = os.path.join(UPLOAD_FOLDER, teacher_id)
    os.makedirs(base_path, exist_ok=True)
    for folder in ALL_SUBFOLDERS:
        os.makedirs(os.path.join(base_path, folder), exist_ok=True)

@app.route('/')
def index():
    teachers = get_teachers()
    return render_template('index.html', teachers=teachers)

@app.route('/add_teacher', methods=['POST'])
def add_teacher():
    name = request.form.get('name')
    link = request.form.get('link')

    if not name or not link:
        flash('يرجى إدخال اسم المعلم ورابط المجلد', 'error')
        return redirect(url_for('index'))

    teachers = get_teachers()
    teacher_id = str(uuid.uuid4())

    teachers.append({
        'id': teacher_id,
        'name': name,
        'link': link
    })
    save_teachers(teachers)
    setup_teacher_folders(teacher_id)

    flash('تم إضافة المعلم بنجاح', 'success')
    return redirect(url_for('index'))

@app.route('/delete_teacher/<teacher_id>', methods=['POST'])
def delete_teacher(teacher_id):
    teachers = get_teachers()
    teachers = [t for t in teachers if t['id'] != teacher_id]
    save_teachers(teachers)

    # Remove teacher's folder
    teacher_path = os.path.join(UPLOAD_FOLDER, teacher_id)
    if os.path.exists(teacher_path):
        shutil.rmtree(teacher_path)

    flash('تم حذف المعلم بنجاح', 'success')
    return redirect(url_for('index'))

@app.route('/teacher/<teacher_id>')
def teacher_dashboard(teacher_id):
    teachers = get_teachers()
    teacher = next((t for t in teachers if t['id'] == teacher_id), None)
    if not teacher:
        flash('المعلم غير موجود', 'error')
        return redirect(url_for('index'))
    return render_template('dashboard.html', teacher=teacher)

@app.route('/upload/<teacher_id>', methods=['POST'])
def upload_files(teacher_id):
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files[]')
    results = []

    for file in files:
        if file.filename == '':
            continue

        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, 'temp_' + filename)
        file.save(temp_path)

        # Process file using OCR to classify
        category_path, new_name = process_file(temp_path)

        # Move to correct folder
        dest_dir = os.path.join(UPLOAD_FOLDER, teacher_id, category_path)
        os.makedirs(dest_dir, exist_ok=True)

        # Handle duplicate names
        base, ext = os.path.splitext(new_name)
        counter = 1
        final_name = new_name
        while os.path.exists(os.path.join(dest_dir, final_name)):
            final_name = f"{base}_{counter}{ext}"
            counter += 1

        shutil.move(temp_path, os.path.join(dest_dir, final_name))
        results.append({'original': file.filename, 'classified_as': category_path, 'saved_as': final_name})

    return jsonify({'success': True, 'results': results})

@app.route('/analyze/<teacher_id>')
def analyze_files(teacher_id):
    teachers = get_teachers()
    teacher = next((t for t in teachers if t['id'] == teacher_id), None)
    if not teacher:
        return "المعلم غير موجود", 404

    teacher_path = os.path.join(UPLOAD_FOLDER, teacher_id)

    report = {}
    for main_folder, subfolders in FOLDERS_STRUCTURE.items():
        report[main_folder] = {'present': [], 'missing': []}
        for sub in subfolders:
            sub_path = os.path.join(teacher_path, main_folder, sub)
            if os.path.exists(sub_path) and os.listdir(sub_path):
                files = os.listdir(sub_path)
                report[main_folder]['present'].append({'folder': sub, 'files': files})
            else:
                report[main_folder]['missing'].append(sub)

    return render_template('analysis.html', teacher=teacher, report=report)

@app.route('/teacher/<teacher_id>/reports')
def teacher_reports(teacher_id):
    teachers = get_teachers()
    teacher = next((t for t in teachers if t['id'] == teacher_id), None)
    if not teacher:
        flash('المعلم غير موجود', 'error')
        return redirect(url_for('index'))

    reports_data = get_reports()
    teacher_reports_list = reports_data.get(teacher_id, [])

    return render_template('reports_list.html', teacher=teacher, reports=teacher_reports_list)

@app.route('/teacher/<teacher_id>/report/new')
def new_report(teacher_id):
    teachers = get_teachers()
    teacher = next((t for t in teachers if t['id'] == teacher_id), None)
    if not teacher:
        flash('المعلم غير موجود', 'error')
        return redirect(url_for('index'))

    return render_template('report_editor.html', teacher=teacher, report=None)

@app.route('/teacher/<teacher_id>/report/<report_id>/edit')
def edit_report(teacher_id, report_id):
    teachers = get_teachers()
    teacher = next((t for t in teachers if t['id'] == teacher_id), None)
    if not teacher:
        flash('المعلم غير موجود', 'error')
        return redirect(url_for('index'))

    reports_data = get_reports()
    teacher_reports_list = reports_data.get(teacher_id, [])
    report = next((r for r in teacher_reports_list if r['id'] == report_id), None)

    if not report:
        flash('التقرير غير موجود', 'error')
        return redirect(url_for('teacher_reports', teacher_id=teacher_id))

    return render_template('report_editor.html', teacher=teacher, report=report)

@app.route('/api/teacher/<teacher_id>/reports/save', methods=['POST'])
def save_report(teacher_id):
    try:
        data = request.json
        reports_data = get_reports()

        if teacher_id not in reports_data:
            reports_data[teacher_id] = []

        report_id = data.get('id')
        if not report_id:
            # Create new report
            report_id = str(uuid.uuid4())
            data['id'] = report_id
            reports_data[teacher_id].append(data)
        else:
            # Update existing report
            for i, r in enumerate(reports_data[teacher_id]):
                if r['id'] == report_id:
                    reports_data[teacher_id][i] = data
                    break
            else:
                # If report id not found, append as new (shouldn't happen but safe)
                reports_data[teacher_id].append(data)

        save_reports(reports_data)
        return jsonify({'success': True, 'report_id': report_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/teacher/<teacher_id>/reports/<report_id>/delete', methods=['POST'])
def delete_report(teacher_id, report_id):
    reports_data = get_reports()

    if teacher_id in reports_data:
        reports_data[teacher_id] = [r for r in reports_data[teacher_id] if r['id'] != report_id]
        save_reports(reports_data)

    flash('تم حذف التقرير بنجاح', 'success')
    return redirect(url_for('teacher_reports', teacher_id=teacher_id))


if __name__ == '__main__':
    app.run(debug=True, port=3000, host='0.0.0.0')
