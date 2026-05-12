from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import os
import json
import uuid
import shutil
import base64
from werkzeug.utils import secure_filename
from folders_structure import FOLDERS_STRUCTURE, ALL_SUBFOLDERS
from ocr_processor import process_file
from google import genai

app = Flask(__name__)
app.secret_key = 'smart-sorter-secret-key'

# Initialize Gemini Client
# Assumes GEMINI_API_KEY is in environment variables.
from dotenv import load_dotenv
load_dotenv('.env.local')
load_dotenv()
try:
    ai = genai.Client()
except Exception as e:
    print(f"Failed to initialize Gemini client: {e}")
    ai = None

DATA_FILE = 'data/teachers.json'
UPLOAD_FOLDER = 'uploads'
os.makedirs('data', exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

def get_teachers():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_teachers(teachers):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(teachers, f, ensure_ascii=False, indent=4)

def setup_teacher_folders(teacher_id):
    base_path = os.path.join(UPLOAD_FOLDER, teacher_id)
    os.makedirs(base_path, exist_ok=True)
    for folder in ALL_SUBFOLDERS:
        os.makedirs(os.path.join(base_path, folder), exist_ok=True)

@app.route('/')
def index():
    teachers = get_teachers()
    return render_template('index.html', teachers=teachers)

@app.route('/react')
@app.route('/react/<path:path>')
def serve_react(path=''):
    return app.send_static_file('react/index.html')

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

@app.route('/api/classify', methods=['POST'])
def api_classify():
    if not ai:
        return jsonify({"error": "Gemini client not initialized"}), 500

    data = request.json
    base64_data = data.get('base64Data')
    mime_type = data.get('mimeType')
    original_name = data.get('originalName')

    if not base64_data or not mime_type or not original_name:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Strip data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]

        file_bytes = base64.b64decode(base64_data)

        categories_list = ""
        for i, (main_folder, subfolders) in enumerate(FOLDERS_STRUCTURE.items(), 1):
            categories_list += f"الفئة {i}: {main_folder}\n"
            categories_list += f"البنود الفرعية: [{', '.join(subfolders)}]\n\n"

        prompt = f"""
        أنت خبير في تقييم أداء المعلمين. مهمتك هي تحليل الملف المرفق (قد يكون صورة أو مستند ب دي اف) وتصنيفه بدقة.
        كما يجب عليك اقتراح اسم جديد وواضح للملف يعبر عن محتواه ونوعه (بدون امتداد الملف).

        اسم الملف الأصلي: {original_name}

        الهيكل التنظيمي للفرز والمجلدات المتاح للتصنيف فيه:
        {categories_list}

        المطلوب:
        1. استخراج أو تخمين اسم مناسب للملف يصف محتواه بدقة ليكون اسمه الجديد (مثال: "تحضير درس الرياضيات الأسبوع الأول", "شهادة دورة التقنية").
        2. تحديد جميع الفئات والبنود الفرعية المناسبة للملف (يمكن أن ينتمي لأكثر من بند). استخدم الأسماء الدقيقة للبنود كما هي مكتوبة وتأكد من مطابقتها.

        يجب أن يكون ردك بصيغة JSON فقط كالتالي، ولا تقم بإضافة أي نص خارج الـ JSON:
        {{
          "suggestedName": "الاسم الجديد المقترح هنا",
          "tags": [
            {{ "categoryId": رقم_الفئة, "subCategoryName": "الاسم الدقيق للبند الفرعي" }}
          ]
        }}
        """

        response = ai.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
            ],
            config=genai.types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        text = response.text.strip()
        # Clean up any markdown code block wrap if present
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]

        result = json.loads(text.strip())

        if "tags" not in result:
            result["tags"] = []

        return jsonify(result)

    except Exception as e:
        print(f"Classification error: {e}")
        return jsonify({
            "suggestedName": original_name.split('.')[0],
            "tags": [{"categoryId": 1, "subCategoryName": "غير مصنف"}]
        })

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    if not ai:
        return jsonify({"error": "Gemini client not initialized"}), 500

    data = request.json
    teacher_name = data.get('teacherName')
    files_list_str = data.get('filesListStr')

    if not teacher_name or files_list_str is None:
         return jsonify({"error": "Missing required fields"}), 400

    prompt = f"""
    أنت مستشار تقييم معلمين في السعودية وتوجيه وارشاد مهني للمعلمين. قم بكتابة تقرير تحليلي احترافي للمعلم "{teacher_name}" بناءً على الشواهد والأدلة التي تم التعرف عليها وتسليمها ومطابقتها مع معايير التقييم الـ 11.

    البيانات (الملفات المدرجة والفئات التي صنفت لها):
    {files_list_str}

    المطلوب:
    اكتب تقريراً نصياً، منظماً ومرتباً ومميزاً يشمل:
    1. نقاط القوة: أين يبرز المعلم بشكل مشوق وماهي المجلدات والمعايير المكتملة بصورة مميزة.
    2. النواقص أو الثغرات: ما هي المجالات والشواهد والمجلدات المفقودة أو التي لم يتم تسليم شواهد بها ويجب على المعلم أضافتها والعمل عليها لتكملة ملفه.
    3. توصيات تطويرية: نصيحة مهنية قصيرة ومباشرة في نقطتين لرفع الأداء المهني وسد الثغرات.

    صيغ التقرير بلغة عربية فصحى مشوقه بتنسيق Markdown.
    """

    try:
        response = ai.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.5,
            )
        )
        return jsonify({"report": response.text})
    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({"report": "تعذر إنشاء التقرير. يرجى المحاولة لاحقاً أو التحقق من وجود الشواهد."})


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

if __name__ == '__main__':
    app.run(debug=True, port=8501, host='0.0.0.0')
