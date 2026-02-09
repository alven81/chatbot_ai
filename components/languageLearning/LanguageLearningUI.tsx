"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import "./LanguageLearning.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  translation?: string;
  corrections?: string;
  isStreaming?: boolean;
}

const API_URL = "http://localhost:3001";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Japanese",
  "Korean",
  "Chinese (Mandarin)",
  "Russian",
  "Arabic",
  "Hindi",
  "Turkish",
  "Dutch",
  "Polish",
  "Swedish",
  "Czech",
  "Ukrainian",
  "Greek",
  "Hebrew",
];

export default function LanguageLearningUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [learningLanguage, setLearningLanguage] = useState("Spanish");
  const [userLanguage, setUserLanguage] = useState("English");
  const [sessionId] = useState(() => `lang-session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = `msg-${Date.now()}-assistant`;

    // Add a placeholder for the assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/api/language-learning/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          learningLanguage,
          userLanguage,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + data.chunk }
                        : msg
                    )
                  );
                }
                if (data.translation) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, translation: data.translation }
                        : msg
                    )
                  );
                }
                if (data.corrections) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, corrections: data.corrections }
                        : msg
                    )
                  );
                }
                if (data.done) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  );
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "Error: Failed to get response",
                isStreaming: false,
              }
            : msg
        )
      );
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = async () => {
    try {
      await fetch(`${API_URL}/api/language-learning/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setMessages([]);
    } catch (error) {
      console.error("Clear error:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app language-learning">
      <header className="header">
        <div>
          <h1>🌍 AI Language Learning</h1>
          <p className="tutor-info">
            Powered by GPT-4o &middot; Your personal language tutor
          </p>
          <Link href="/" className="home-link">
            Go back to Home
          </Link>
        </div>
        <div className="controls">
          <div className="language-selectors">
            <label className="selector-label">
              I speak:
              <select
                value={userLanguage}
                onChange={(e) => setUserLanguage(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
            <label className="selector-label">
              Learning:
              <select
                value={learningLanguage}
                onChange={(e) => setLearningLanguage(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="clear-btn" onClick={clearChat}>
            Clear Chat
          </button>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>
                🌍 Hello! I&apos;m your language tutor. Start typing in{" "}
                <strong>{learningLanguage}</strong> (or{" "}
                <strong>{userLanguage}</strong> and I&apos;ll help you
                translate).
              </p>
              <p className="subtitle">
                I&apos;ll respond in {learningLanguage}, translate your messages
                to {userLanguage}, and correct any mistakes you make.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? "👤" : "🌍"}
              </div>
              <div className="message-content">
                {msg.content}
                {msg.isStreaming && <span className="cursor">▌</span>}

                {/* Translation block */}
                {msg.role === "assistant" && msg.translation && (
                  <div className="translation-block">
                    <strong>📝 Translation of your message:</strong>
                    <p>{msg.translation}</p>
                  </div>
                )}

                {/* Corrections block */}
                {msg.role === "assistant" && msg.corrections && (
                  <div className="corrections-block">
                    <strong>✏️ Corrections:</strong>
                    <p>{msg.corrections}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyUp={handleKeyPress}
          placeholder={`Type in ${learningLanguage} or ${userLanguage}...`}
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          {isLoading ? "..." : "Send"}
        </button>
      </footer>
    </div>
  );
}
