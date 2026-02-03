import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { z } from "zod";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "front", "dist");
const indexHtml = path.join(distPath, "index.html");

const PORT = Number(process.env.PORT || 3000);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:20b";
const PY_TTS_URL = process.env.PY_TTS_URL || "";

const AvatarDirectiveSchema = z.object({
  spokenText: z.string(),
  emotion: z.enum([
    "neutral",
    "happy",
    "sad",
    "angry",
    "shy",
    "excited",
    "tired",
    "surprised"
  ]),
  intensity: z.number().min(0).max(1),
  gesture: z.object({
    motion: z.string().nullable(),
    priority: z.enum(["idle", "normal", "force"])
  }),
  expression: z.string().nullable(),
  microTimeline: z
    .array(
      z.object({
        t: z.number().min(0),
        params: z.array(
          z.object({
            id: z.string(),
            value: z.number(),
            fade: z.number().min(0)
          })
        )
      })
    )
    .default([]),
  tts: z.object({
    voice: z.string().nullable(),
    speed: z.number().nullable(),
    pitch: z.number().nullable()
  })
});

const SYSTEM_PROMPT = `You are N:OVA, a friendly virtual avatar.
Respond ONLY with a single JSON object that matches the AvatarDirective schema.
Do not include markdown, code fences, or any extra text.

AvatarDirective schema:
{
  spokenText: string,
  emotion: "neutral"|"happy"|"sad"|"angry"|"shy"|"excited"|"tired"|"surprised",
  intensity: number (0.0-1.0),
  gesture: { motion: string|null, priority: "idle"|"normal"|"force" },
  expression: string|null,
  microTimeline: [
    { t: number, params: [ { id: string, value: number, fade: number } ] }
  ],
  tts: { voice: string|null, speed: number|null, pitch: number|null }
}
`;

const sessions = new Map();
const MAX_HISTORY = 8;

function fallbackDirective(message) {
  return {
    spokenText:
      "미안, 응답을 생성하는 데 문제가 있었어. 다시 한 번 말해줄래?",
    emotion: "neutral",
    intensity: 0.2,
    gesture: { motion: null, priority: "idle" },
    expression: null,
    microTimeline: [],
    tts: { voice: null, speed: null, pitch: null }
  };
}

function extractJson(text) {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

async function requestOllama(messages, temperature) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      format: "json",
      options: { temperature }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data?.message?.content || "";
}

async function generateDirective(userText, sessionId, attempt = 0) {
  const history = sessions.get(sessionId) || [];
  const retryNote =
    attempt === 0
      ? ""
      : "JSON only. Ensure every field exists and types are correct.";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + "\n" + retryNote },
    ...history,
    { role: "user", content: userText }
  ];

  const temperature = attempt === 0 ? 0.7 : 0.2;
  const raw = await requestOllama(messages, temperature);
  const jsonText = extractJson(raw) ?? raw;

  try {
    const parsed = JSON.parse(jsonText);
    const validated = AvatarDirectiveSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch (error) {
    // fall through to retry
  }

  if (attempt === 0) {
    return generateDirective(userText, sessionId, 1);
  }

  return fallbackDirective(userText);
}

function updateSession(sessionId, userText, spokenText) {
  const history = sessions.get(sessionId) || [];
  const next = [...history, { role: "user", content: userText }];
  if (spokenText) {
    next.push({ role: "assistant", content: spokenText });
  }
  const trimmed = next.slice(-MAX_HISTORY);
  sessions.set(sessionId, trimmed);
}

function buildSilentWav(durationSeconds = 1, sampleRate = 22050) {
  const numSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  buffer.write("RIFF", offset);
  offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset);
  offset += 4;
  buffer.write("WAVE", offset);
  offset += 4;
  buffer.write("fmt ", offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset);
  offset += 4;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(sampleRate * 2, offset);
  offset += 4;
  buffer.writeUInt16LE(2, offset);
  offset += 2;
  buffer.writeUInt16LE(16, offset);
  offset += 2;
  buffer.write("data", offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);

  return buffer;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const { sessionId, userText } = req.body || {};
  if (!userText || typeof userText !== "string") {
    res.status(400).json({ error: "userText is required" });
    return;
  }

  const id = sessionId && typeof sessionId === "string" ? sessionId : crypto.randomUUID();

  try {
    const directive = await generateDirective(userText, id);
    updateSession(id, userText, directive.spokenText);
    res.json({ sessionId: id, directive });
  } catch (error) {
    const directive = fallbackDirective(userText);
    updateSession(id, userText, directive.spokenText);
    res.json({ sessionId: id, directive, warning: "fallback" });
  }
});

app.post("/api/tts", async (req, res) => {
  const { text, voice, speed, pitch } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (!PY_TTS_URL) {
    const wav = buildSilentWav(Math.min(3, Math.max(1, text.length * 0.04)));
    res.setHeader("Content-Type", "audio/wav");
    res.send(wav);
    return;
  }

  try {
    const response = await fetch(`${PY_TTS_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voice ?? null, speed: speed ?? null, pitch: pitch ?? null })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`TTS error ${response.status}: ${body}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/wav");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    const wav = buildSilentWav(Math.min(3, Math.max(1, text.length * 0.04)));
    res.setHeader("Content-Type", "audio/wav");
    res.send(wav);
  }
});

app.use(express.static(distPath));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (path.extname(req.path)) {
    res.status(404).send("Not found");
    return;
  }

  const acceptsHtml = req.accepts("html");
  if (!acceptsHtml) {
    res.status(404).send("Not found");
    return;
  }

  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
    return;
  }

  res.status(500).send("Front-end is not built. Run npm --prefix front run build.");
});

app.listen(PORT, () => {
  console.log(`N:OVA server running on http://localhost:${PORT}`);
});
