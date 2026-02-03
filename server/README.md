# N:OVA Server

Node.js (Express) backend that serves the React build and exposes chat + TTS APIs.

## Requirements
- Node.js 18+ (for built-in `fetch`)
- Ollama running locally (default: `http://localhost:11434`)

## Setup
1. Install dependencies
   - `npm install`
2. Copy env file
   - `copy .env.example .env`
3. Start development (API + Vite dev server)
   - `npm run dev`

## Build + Production
1. Build the front-end
   - `npm run build`
2. Run the server (static hosting)
   - `npm start`

## Environment Variables
- `PORT=3000`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=gpt-oss:20b`
- `PY_TTS_URL=http://localhost:8001` (optional)

## API
- `GET /api/health` -> `{ ok: true }`
- `POST /api/chat` -> `{ sessionId, directive }`
- `POST /api/tts` -> `audio/wav`

## SPA Fallback
All non-API GET requests are routed to `front/dist/index.html` so browser refreshes work with client routing.

## Notes
- If Ollama returns invalid JSON, the server retries once with stricter prompts, then falls back to a neutral directive.
- If `PY_TTS_URL` is not set (or fails), the server returns a short silent WAV as a safe stub.
