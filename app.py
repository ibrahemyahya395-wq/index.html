from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
import os

app = Flask(__name__)
app.secret_key = 'smart-sorter-secret-key'

# Serve React static assets
@app.route('/assets/<path:filename>')
def serve_react_assets(filename):
    return send_from_directory('static/react/assets', filename)

@app.route('/')
def portal():
    return render_template('portal.html')

@app.route('/folder-creator')
def folder_creator():
    return render_template('folder-creator.html')

@app.route('/teacher-site')
def teacher_site():
    return render_template('science-teacher-site.html')

@app.route('/sorter', defaults={'path': ''})
@app.route('/sorter/<path:path>')
def serve_sorter(path):
    return send_from_directory('static/react', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=3000, host='0.0.0.0')
