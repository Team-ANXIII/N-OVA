# N:OVA - Neural: Omnivoice Virtual Avatar

Ollama + Live2D(Web) + TTS pipeline for a virtual girlfriend avatar that speaks and animates based on LLM output.

## Requirements
- Node.js 18+
- Ollama (local LLM)
- Python 3.10+ (optional TTS stub)
- .NET 6 SDK (optional WPF host)

## Folder Structure
- `server/` Node.js backend + static hosting
- `server/front/` React + Vite front-end
- `pyserver/` Python TTS stub
- `csharp/` WPF + WebView2 host

## Quick Start (Dev)
1. Start Ollama
   - `ollama serve`
   - `ollama pull gpt-oss:20b`
2. (Optional) Start TTS stub
   - `cd pyserver`
   - `python -m venv .venv`
   - `.venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `uvicorn pyserver:app --host 0.0.0.0 --port 8001`
3. Start backend + front
   - `cd server`
   - `npm install`
   - `npm run dev`
4. Open `http://localhost:5173` (Vite dev server) or `http://localhost:3000` (Express).

## Build (Static Hosting)
- `cd server`
- `npm run build`
- `npm start`

## Live2D Models
Model files are not included. Place them under:
- `server/front/public/live2d/YourModel/YourModel.model3.json`

Then use `/live2d/YourModel/YourModel.model3.json` in the UI.

## WPF Desktop Host
See `csharp/README.md` for transparent overlay notes and WebView2 requirements.
