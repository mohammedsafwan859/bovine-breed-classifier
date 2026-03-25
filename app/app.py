# Bovine Breed AI - Flask Backend
# CV model: ResNet-50 via fastai | LLM: Groq (llama-3.1-8b-instant)

# --- Windows Path Compatibility Fix ---
import pathlib
import platform
if platform.system() == "Windows":
    pathlib.PosixPath = pathlib.WindowsPath

import os
import traceback
import requests
from flask import Flask, request, render_template, jsonify
from groq import Groq

# --- Import fastai ---
try:
    from fastai.vision.all import load_learner, PILImage
except ImportError as e:
    print(f"FATAL: fastai import failed: {e}")
    exit()

# --- CONFIGURATION ---
MODEL_FILENAME = 'bovine_breed_model.pkl'
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# --- Setup Groq ---
client = Groq(api_key=GROQ_API_KEY)

# --- Load Model ---
print(f"Loading model...")
try:
    model_path = os.path.join(os.path.dirname(__file__), MODEL_FILENAME)
    learn = load_learner(model_path, cpu=True)
    BREED_NAMES = learn.dls.vocab
    print(f"Model loaded! {len(BREED_NAMES)} breeds.")
except Exception as e:
    print(f"FATAL: Could not load model: {e}")
    traceback.print_exc()
    exit()

learn.model.eval()

# --- Flask App ---
app = Flask(__name__)

# --- Routes ---

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/identify')
def identify():
    return render_template('index.html')

@app.route('/breeds')
def breeds():
    breed_list = [str(b) for b in BREED_NAMES]
    return render_template('breeds.html', breeds=breed_list)

@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/get_breed_image', methods=['POST'])
def get_breed_image():
    breed = request.json.get('breed', '').replace('_', ' ')
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{breed}_cattle"
        res = requests.get(url, timeout=5)
        data = res.json()
        img = data.get('thumbnail', {}).get('source', '')
        if not img:
            url2 = f"https://en.wikipedia.org/api/rest_v1/page/summary/{breed}"
            res2 = requests.get(url2, timeout=5)
            data2 = res2.json()
            img = data2.get('thumbnail', {}).get('source', '')
        return jsonify({'image': img})
    except Exception:
        return jsonify({'image': ''})

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        img_file = request.files['image']
        img = PILImage.create(img_file.read())
        pred_class, pred_idx, outputs = learn.predict(img)
        confidence = float(outputs[pred_idx.item()])

        # Top 3 predictions
        top3_idx = outputs.argsort(descending=True)[:3]
        top3 = [
            {
                'breed': str(BREED_NAMES[i]),
                'confidence': f"{float(outputs[i])*100:.2f}%"
            }
            for i in top3_idx
        ]

        return jsonify({
            'breed': str(pred_class),
            'confidence': f"{confidence*100:.2f}%",
            'top3': top3
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Prediction failed.'}), 500

@app.route('/get_details', methods=['POST'])
def get_breed_details():
    try:
        data = request.json
        breed_name = data.get('breed')
        if not breed_name:
            return jsonify({'error': 'No breed name provided'}), 400

        prompt = f"""Provide key information about the {breed_name} cattle breed.
Format as a bullet list with these details:
* Origin/Region
* Primary Use (Dairy/Draft/Dual-purpose)
* Average Milk Production
* Physical Characteristics
* Temperament

Be concise and factual. Start directly with the information."""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500
        )

        details_text = response.choices[0].message.content.strip()
        return jsonify({'details': details_text})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate details: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting server...")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
