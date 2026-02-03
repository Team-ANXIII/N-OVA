from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import math
import struct
import wave

import uvicorn

app = FastAPI()

class TTSRequest(BaseModel):
    text: str
    voice: str | None = None
    speed: float | None = None
    pitch: float | None = None


def synth_stub(text: str, pitch: float | None, speed: float | None) -> bytes:
    base_duration = 0.04 * max(1, len(text))
    duration = max(0.6, min(4.0, base_duration))

    sample_rate = 22050
    freq = 220.0
    if pitch is not None:
        freq *= max(0.5, min(2.0, 1.0 + pitch * 0.05))

    num_samples = int(sample_rate * duration)
    amplitude = 0.2

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)

        frames = bytearray()
        for i in range(num_samples):
            value = int(amplitude * 32767 * math.sin(2 * math.pi * freq * i / sample_rate))
            frames.extend(struct.pack("<h", value))
        wf.writeframes(frames)

    return buffer.getvalue()


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.post("/api/tts")
async def tts(payload: TTSRequest):
    wav_bytes = synth_stub(payload.text, payload.pitch, payload.speed)
    return StreamingResponse(io.BytesIO(wav_bytes), media_type="audio/wav")


if __name__ == "__main__":
    uvicorn.run("pyserver:app", host="0.0.0.0", port=8001, reload=False)
