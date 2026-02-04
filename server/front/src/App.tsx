import { useCallback, useEffect, useRef, useState } from "react";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import { sendChat, requestTts } from "./api/client";
import { AvatarController } from "./avatar/AvatarController";
import { PixiLive2DDriver } from "./avatar/PixiLive2DDriver";
import { LipSync } from "./avatar/LipSync";
import { ensureCubismCore } from "./avatar/loadCubismCore";
import type { AvatarDirective } from "./avatar/types";

const DEFAULT_MODEL_URL = "/live2d/YourModel/model3.json";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lipSyncRef = useRef(new LipSync());
  const lipSyncRaf = useRef<number | null>(null);

  const [controller, setController] = useState<AvatarController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [subtitle, setSubtitle] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL_URL);
  const [status, setStatus] = useState<string>("Live2D 모델을 로드하세요.");
  const [isModelLoading, setIsModelLoading] = useState(false);

  const [gazeCenter, setGazeCenter] = useState({ x: 0.15, y: -1.0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const driver = new PixiLive2DDriver(canvasRef.current);
    const avatarController = new AvatarController(driver, {
      gazeCenter
    });
    setController(avatarController);

    return () => {
      avatarController.dispose();
    };
  }, []);

  useEffect(() => {
    controller?.setGazeConfig({ gazeCenter });
  }, [controller, gazeCenter]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => stopLipSync();
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handleEnded);
    };
  }, [controller]);

  const startLipSync = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !controller) return;

    lipSyncRef.current.connect(audio);
    const loop = () => {
      if (!audio.paused) {
        const value = lipSyncRef.current.getValue();
        controller.setLipSync(value);
        lipSyncRaf.current = requestAnimationFrame(loop);
      }
    };
    loop();
  }, [controller]);

  const stopLipSync = useCallback(() => {
    if (lipSyncRaf.current !== null) {
      cancelAnimationFrame(lipSyncRaf.current);
      lipSyncRaf.current = null;
    }
    lipSyncRef.current.disconnect();
    controller?.setLipSync(0);
  }, [controller]);

  const playAudio = useCallback(
    async (blob: Blob) => {
      const audio = audioRef.current;
      if (!audio) return;

      stopLipSync();
      const url = URL.createObjectURL(blob);
      audio.src = url;

      try {
        await audio.play();
        startLipSync();
      } finally {
        audio.onended = () => {
          URL.revokeObjectURL(url);
        };
      }
    },
    [startLipSync, stopLipSync]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!controller) return;
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: "user", text }]);

      try {
        const response = await sendChat(sessionId, text);
        const directive: AvatarDirective = response.directive;
        setSessionId(response.sessionId);
        setMessages((prev) => [
          ...prev,
          { role: "avatar", text: directive.spokenText }
        ]);
        setSubtitle(directive.spokenText);
        controller.applyDirective(directive);

        try {
          const audioBlob = await requestTts(directive.spokenText, directive.tts);
          await playAudio(audioBlob);
        } catch (ttsError) {
          console.warn("TTS failed", ttsError);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { role: "avatar", text: "응답을 가져오지 못했어. 다시 시도해줘." }
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [controller, playAudio, sessionId]
  );

  const handleLoadModel = useCallback(async () => {
    if (!controller) return;
    setIsModelLoading(true);
    setStatus("모델 로딩 중...");

    try {
      await ensureCubismCore();
      await controller.loadModel(modelUrl);
      setStatus("모델 로드 완료");
    } catch (error) {
      if (error instanceof Error) {
        setStatus(error.message);
      } else {
        setStatus("모델 로드 실패. 경로를 확인하세요.");
      }
    } finally {
      setIsModelLoading(false);
    }
  }, [controller, modelUrl]);

  return (
    <div className="app">
      <div className="panel avatar-shell">
        <div className="controls">
          <input
            value={modelUrl}
            onChange={(event) => setModelUrl(event.target.value)}
            placeholder="/live2d/YourModel/model3.json"
          />
          <button type="button" onClick={handleLoadModel} disabled={isModelLoading}>
            {isModelLoading ? "로딩 중" : "모델 로드"}
          </button>
          <div className="status">{status}</div>
        </div>
        <div className="canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
        <div className="subtitle">{subtitle || "..."}</div>
      </div>

      <ChatPanel messages={messages} isLoading={isLoading} onSend={handleSend} />

      <audio ref={audioRef} />
    </div>
  );
}
