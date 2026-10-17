from flask import Flask, render_template, jsonify, request
import json
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max upload
app.config['UPLOAD_EXTENSIONS'] = ['.txt']

# Load stories
STORIES_PATH = os.path.join(app.static_folder, 'stories', 'stories.json')

def load_stories():
    try:
        with open(STORIES_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"stories": []}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stories')
def get_stories():
    data = load_stories()
    return jsonify(data)

@app.route('/api/story/<int:index>')
def get_story(index):
    data = load_stories()
    stories = data.get('stories', [])
    if 0 <= index < len(stories):
        return jsonify(stories[index])
    return jsonify({"error": "Story not found"}), 404

@app.route('/api/random-story')
def random_story():
    import random
    data = load_stories()
    stories = data.get('stories', [])
    if stories:
        story = random.choice(stories)
        return jsonify(story)
    return jsonify({"error": "No stories available"}), 404

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        if not filename.lower().endswith('.txt'):
            return jsonify({"error": "Only .txt files are allowed"}), 400
        try:
            content = file.read().decode('utf-8', errors='replace')
            # Basic sanitization - strip null bytes etc.
            content = content.replace('\x00', '')
            word_count = len(content.split())
            if word_count > 30000:
                return jsonify({
                    "error": f"Text exceeds 30,000 word limit. Found {word_count} words."
                }), 400
            return jsonify({
                "content": content,
                "word_count": word_count,
                "char_count": len(content)
            })
        except Exception as e:
            return jsonify({"error": f"Failed to read file: {str(e)}"}), 400
    return jsonify({"error": "Upload failed"}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
