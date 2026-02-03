import { useState } from "react";

export type ChatMessage = {
  role: "user" | "avatar";
  text: string;
};

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, isLoading, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="panel chat-panel">
      <div className="chat-list">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
            {message.text}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="status">대화를 시작해 보세요.</div>
        )}
      </div>
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="메시지를 입력하세요..."
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <button type="button" onClick={handleSend} disabled={isLoading}>
          {isLoading ? "생성 중" : "전송"}
        </button>
      </div>
      <div className="status">
        Shift+Enter 줄바꿈 | Enter 전송
      </div>
    </div>
  );
}
