import { AvatarDirectiveSchema, type AvatarDirective } from "../avatar/types";

export async function sendChat(
  sessionId: string | null,
  userText: string
): Promise<{ sessionId: string; directive: AvatarDirective }> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, userText })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Chat error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const parsed = AvatarDirectiveSchema.safeParse(data.directive);
  if (!parsed.success) {
    throw new Error("Invalid AvatarDirective from server");
  }

  return { sessionId: data.sessionId, directive: parsed.data };
}

export async function requestTts(
  text: string,
  options?: { voice?: string | null; speed?: number | null; pitch?: number | null }
): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...options })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TTS error ${response.status}: ${body}`);
  }

  return await response.blob();
}
