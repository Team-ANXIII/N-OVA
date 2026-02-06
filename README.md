# N:OVA - Neural: Omnivoice Virtual Avatar

Local LLM + Live2D + (optional) TTS pipeline that drives a virtual avatar from chat.

## Features
- Local LLM (Ollama) generates an `AvatarDirective` JSON payload.
- Live2D (Pixi) driver applies expressions, motions, gaze, and micro-timeline params.
- Optional Python TTS stub for audio + lip sync.
- Optional WPF host for a transparent desktop overlay.

## Requirements
- Node.js 18+
- Ollama (local LLM)
- Live2D Cubism core runtime file (required for Cubism 4 models)
- Python 3.10+ (optional TTS stub)
- .NET 6 SDK (optional WPF host)

## Repo Layout
- `server/` Node.js backend + static hosting
- `server/front/` React + Vite front-end
- `pyserver/` Python TTS stub
- `csharp/` WPF + WebView2 host

## Quick Start (Dev)
1. Start Ollama.

   ```powershell
   ollama serve
   ollama pull gpt-oss:20b
   ```

2. Prepare Live2D assets (see `Live2D Assets` below).
3. (Optional) Start the TTS stub.

   ```powershell
   cd pyserver
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn pyserver:app --host 0.0.0.0 --port 8001
   ```
   
   Or run it directly (same server):
   
   ```powershell
   cd pyserver
   python pyserver.py
   ```

4. Start backend + front-end.

   ```powershell
   cd server
   npm install
   copy .env.example .env
   npm run dev
   ```

5. Open `http://localhost:5173` (Vite dev server). The Vite proxy forwards `/api/*` to `http://localhost:3000`.

## Live2D Assets
Place your model and the Cubism core runtime under `server/front/public/live2d/`.

Example layout:

```text
server/front/public/live2d/YourModel/
  YourModel.model3.json
  motions/
  textures/
  expressions/
server/front/public/live2d/live2dcubismcore.min.js
```

Notes:
- You must supply `live2dcubismcore.min.js` from the official Live2D SDK. Do not commit it.
- If you already built the front-end, rebuild or copy the file into `server/front/dist/live2d/`.
- In the UI, use `/live2d/YourModel/YourModel.model3.json` as the model path.

## Build (Static Hosting)

```powershell
cd server
npm run build
npm start
```

Then open `http://localhost:3000`.

## Environment Variables
These live in `server/.env`:
- `PORT=3000`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=gpt-oss:20b`
- `PY_TTS_URL=http://localhost:8001` (optional)

## API
- `GET /api/health` -> `{ ok: true }`
- `POST /api/chat` -> `{ sessionId, directive }`
- `POST /api/tts` -> `audio/wav`

## WPF Desktop Host
See `csharp/README.md` for transparent overlay notes and WebView2 requirements.
