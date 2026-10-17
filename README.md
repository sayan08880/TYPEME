# TypeLux — Premium Typing Practice Web Application

A beautiful, fully functional typing tutor with luxury black-glassmorphism design, harmonious keyboard sounds, custom text support, line targets, and detailed WPM/accuracy statistics.

## Features

- **Modern Typing Engine** — Character-by-character highlighting (green/red), current position glow, auto-scroll
- **Line Target System** — Practice 5, 10, 25, 50, 100 or any custom number of lines
- **Custom Text** — Paste up to 30,000 words or upload `.txt` files (client-side)
- **Harmonious Sounds** — Soft Piano, Gentle Synth, and Classic Typewriter styles via Web Audio API
- **Live Stats** — Real-time WPM, accuracy, timer, correct/incorrect counts
- **Results Modal** — Net/Gross WPM, accuracy, time, character breakdown
- **Luxury Glassmorphism UI** — Dark (default) and Light themes, fully responsive
- **No Database Required** — Stories loaded from JSON; settings saved in localStorage

## Tech Stack

- **Backend:** Python Flask
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Audio:** Web Audio API
- **Icons:** Lucide Icons
- **Fonts:** Inter + JetBrains Mono (Google Fonts)

## Project Structure

```
typing-practice/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js
    │   ├── typing.js
    │   └── sounds.js
    └── stories/
        └── stories.json
```

## Setup & Run Instructions

### 1. Prerequisites

- Python 3.8 or higher
- pip

### 2. Create and activate a virtual environment

**Linux / macOS:**
```bash
cd typing-practice
python3 -m venv venv
source venv/bin/activate
```

**Windows (Command Prompt):**
```cmd
cd typing-practice
python -m venv venv
venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```powershell
cd typing-practice
python -m venv venv
venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the Flask development server

```bash
python app.py
```

### 5. Open in browser

Navigate to: **http://127.0.0.1:5000**

The typing practice page loads immediately with a default story.

## Usage Tips

1. **Start typing** in the input field — the timer begins automatically.
2. **Green** characters = correct · **Red** characters = incorrect · **Glowing** = current character.
3. Adjust **line target** on the right panel (or via mobile drawer).
4. Paste your own text or upload a `.txt` file from the left settings panel.
5. Toggle keyboard sounds, volume, and sound style in Settings.
6. Switch between Dark Glass and Light Glass themes.
7. When you finish the selected lines, a results modal shows detailed statistics.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main typing practice page |
| `/api/stories` | GET | List all practice stories |
| `/api/story/<index>` | GET | Get a specific story by index |
| `/api/random-story` | GET | Get a random story |
| `/api/upload` | POST | Optional server-side .txt upload (max 2 MB) |

## Browser Support

Works on modern desktop, laptop, tablet, and mobile browsers that support:
- CSS `backdrop-filter`
- Web Audio API
- ES6 JavaScript

## License

MIT — free to use, modify, and distribute.
