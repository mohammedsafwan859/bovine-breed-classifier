# Bovine Breed Classifier

An AI-powered web application that identifies cattle breeds from images using a ResNet-50 deep learning model trained on 41 bovine breeds.

## Features

- Upload any cattle image and get instant breed identification
- Confidence score for each prediction
- Detailed breed information powered by Groq AI
- Identification history tracking
- Downloadable result cards

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, Flask
- **ML Model:** ResNet-50 (fastai) trained on 41 cattle breeds
- **AI Details:** Groq API (LLaMA)
- **Deployment:** Render

## How It Works

1. Upload a cattle image
2. ResNet-50 model classifies the breed with a confidence score
3. Get detailed breed information via Groq AI

## Live Demo

[bovine-breed-classifier1.onrender.com](https://bovine-breed-classifier1.onrender.com)

## Local Setup
```bash
git clone https://github.com/mohammedsafwan859/bovine-breed-classifier.git
cd bovine-breed-classifier/app
pip install -r requirements.txt
python app.py
```

## Model

- Architecture: ResNet-50
- Breeds: 41 cattle breeds
- Framework: fastai / PyTorch

## Author

Mohammed Safwan — LPU CSE 2026