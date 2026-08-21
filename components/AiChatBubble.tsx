"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo! 👋 Saya **SIJAGA Assistant**, asisten AI untuk verifikasi ijazah digital Universitas Tadulako.\n\nSaya dapat membantu Anda:\n- ✅ Mengecek keaslian ijazah\n- 🔍 Memverifikasi status mahasiswa\n- 🔗 Memberikan link bukti on-chain\n\nSilakan tanyakan apa saja!",
  timestamp: new Date(),
};

const SUGGESTED_QUESTIONS = [
  "Cek ijazah NIM C10121001",
  "Apakah Budi Santoso lulusan Untad?",
  "Apa itu SIJAGA?",
];

export default function AiChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll ke bawah
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input saat chat dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Track scroll position untuk show/hide scroll button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    setShowScrollBtn(!isNearBottom);
  };

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Auto-resize textarea back
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.answer ||
          data.error ||
          "Maaf, terjadi kesalahan. Silakan coba lagi.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Maaf, tidak dapat terhubung ke server. Silakan coba lagi nanti.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // Simple markdown to JSX (bold, links, line breaks)
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\n)/g);

    return parts.map((part, i) => {
      // Bold
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Links
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 underline underline-offset-2 font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      }
      // Line break
      if (part === "\n") {
        return <br key={i} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* ═══ FLOATING BUTTON ═══ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg 
          flex items-center justify-center transition-all duration-300 
          ${
            isOpen
              ? "bg-zinc-800 hover:bg-zinc-700 rotate-0 scale-90"
              : "bg-red-600 hover:bg-red-700 hover:scale-110 hover:shadow-xl"
          }
          group cursor-pointer`}
        aria-label={isOpen ? "Tutup AI Assistant" : "Buka AI Assistant"}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 pointer-events-none" />
          </>
        )}
      </button>

      {/* ═══ CHAT WINDOW ═══ */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] 
          transition-all duration-300 origin-bottom-right
          ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col h-[540px] max-h-[70vh]">
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm leading-tight">
                SIJAGA Assistant
              </h3>
              <p className="text-red-100 text-[11px] font-medium">
                AI Verifikasi Ijazah • Universitas Tadulako
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-red-100 font-semibold">
                Online
              </span>
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-zinc-50/50 relative"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                } animate-fade-in`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-zinc-800"
                      : "bg-red-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-red-600" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-zinc-800 text-white rounded-br-md"
                      : "bg-white text-zinc-700 border border-zinc-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "assistant"
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Menganalisis data...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-[140px] right-6 w-8 h-8 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50 transition-colors z-10"
            >
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>
          )}

          {/* ── Suggested Questions (hanya muncul di awal) ── */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-2 pt-0 flex flex-wrap gap-1.5 shrink-0 bg-zinc-50/50">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Area ── */}
          <div className="p-3 bg-white border-t border-zinc-100 shrink-0">
            <div className="flex items-end gap-2 bg-zinc-50 rounded-xl border border-zinc-200 px-3 py-2 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan verifikasi ijazah..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-zinc-400 outline-none min-h-[24px] max-h-[120px] leading-normal"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer
                  ${
                    input.trim() && !isLoading
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Didukung oleh AI • Data terverifikasi on-chain
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
