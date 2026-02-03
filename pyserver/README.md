# N:OVA Python TTS Stub

This is a minimal TTS stub server. It returns a short WAV tone so the UI can play audio and drive lip sync.

## Requirements
- Python 3.10+

## Install
- `python -m venv .venv`
- `.venv\Scripts\activate`
- `pip install -r requirements.txt`

## Run
- `uvicorn pyserver:app --host 0.0.0.0 --port 8001`

## API
- `POST /api/tts` with JSON `{ "text": "...", "voice": null, "speed": null, "pitch": null }`

## Swapping to a Real TTS
Replace `synth_stub` in `pyserver/pyserver.py` with your TTS engine and keep the `/api/tts` response as `audio/wav`.
