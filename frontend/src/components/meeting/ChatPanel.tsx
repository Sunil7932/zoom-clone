"use client";

import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

/** In-meeting chat side panel. */
export function ChatPanel({ messages, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  };

  return (
    <aside className="flex h-full w-full flex-col bg-room-800 text-white sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Chat</h3>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="dark-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-white/40">
            No messages yet. Say hello 👋
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.self ? "text-right" : "text-left"}>
            <div className="mb-0.5 flex items-baseline gap-2 text-xs text-white/50">
              {m.self ? (
                <span className="ml-auto">{formatTime(m.ts)}</span>
              ) : (
                <>
                  <span className="font-medium text-white/80">{m.name}</span>
                  <span>{formatTime(m.ts)}</span>
                </>
              )}
            </div>
            <div
              className={`inline-block max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm ${
                m.self
                  ? "rounded-br-sm bg-zoom-blue text-white"
                  : "rounded-bl-sm bg-room-700 text-white/90"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-room-700 px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            className="text-zoom-blue-light transition hover:text-white disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}
