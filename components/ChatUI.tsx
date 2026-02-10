"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

interface ChatUIProps {
    initialStatus: any;
}

const API_URL = "http://localhost:3001";

const ChatUI = ({ initialStatus }: ChatUIProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [useStreaming, setUseStreaming] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sessionId] = useState(() => `session-${Date.now()}`);
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

        if (useStreaming) {
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
                const response = await fetch(`${API_URL}/api/chat/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userMessage.content,
                        sessionId,
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
                                                    ? {
                                                          ...msg,
                                                          content:
                                                              msg.content +
                                                              data.chunk,
                                                      }
                                                    : msg
                                            )
                                        );
                                    }
                                    if (data.done) {
                                        setMessages((prev) =>
                                            prev.map((msg) =>
                                                msg.id === assistantMessageId
                                                    ? {
                                                          ...msg,
                                                          isStreaming: false,
                                                      }
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
        } else {
            try {
                const response = await fetch(`${API_URL}/api/chat/history`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userMessage.content,
                        sessionId,
                    }),
                });

                const data = await response.json();
                setMessages((prev) => [
                    ...prev,
                    {
                        id: assistantMessageId,
                        role: "assistant",
                        content: data.response,
                    },
                ]);
            } catch (error) {
                console.error("Chat error:", error);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: assistantMessageId,
                        role: "assistant",
                        content: "Error: Failed to get response",
                    },
                ]);
            }
        }

        setIsLoading(false);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    const clearChat = async () => {
        try {
            await fetch(`${API_URL}/api/chat/clear`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            setMessages([]);
        } catch (error) {
            console.error("Clear error:", error);
        }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app d-flex flex-column vh-100 mx-auto bg-white shadow-lg">
            <header className="app-header-gradient d-flex justify-content-between align-items-center p-3 text-white">
                <div>
                    <h1 className="h5 fw-semibold mb-0">🤖 AI Chatbot</h1>
                    <p className="small opacity-75 mb-1">
                        Running on: {initialStatus.llm}
                    </p>
                    <Link
                        href="/"
                        className="text-white text-decoration-underline small"
                    >
                        Go back to Home
                    </Link>
                </div>
            </header>

            <div className="position-relative bg-light border-bottom">
                <div
                    className={`settings-accordion ${
                        isSettingsOpen ? "open" : "collapsed"
                    }`}
                >
                    <div className="d-flex justify-content-between align-items-center p-3">
                        <div className="d-flex gap-3 align-items-center">
                            <label
                                className="d-flex align-items-center gap-2 small fw-semibold text-secondary text-uppercase"
                                role="button"
                                style={{ letterSpacing: "0.5px" }}
                            >
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={useStreaming}
                                    onChange={(e) =>
                                        setUseStreaming(e.target.checked)
                                    }
                                />
                                <span>Enable Streaming</span>
                            </label>
                        </div>
                        <button
                            className="btn btn-outline-danger btn-sm fw-semibold"
                            onClick={clearChat}
                        >
                            Clear Chat History
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="btn btn-light btn-sm position-absolute start-50 translate-middle-x d-flex align-items-center justify-content-center shadow-sm"
                    style={{
                        bottom: "-12px",
                        zIndex: 10,
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        padding: 0,
                        border: "1px solid #dee2e6",
                        fontSize: "0.6rem",
                    }}
                    title={
                        isSettingsOpen ? "Collapse settings" : "Expand settings"
                    }
                >
                    {isSettingsOpen ? "▲" : "▼"}
                </button>
            </div>

            <main className="flex-grow-1 overflow-hidden d-flex flex-column">
                <div className="chat-messages d-flex flex-column gap-3 p-4">
                    {messages.length === 0 && (
                        <div className="d-flex justify-content-center align-items-center h-100 text-secondary fs-5">
                            <p>👋 Hello! Ask me anything...</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message d-flex gap-2 ${
                                msg.role === "user"
                                    ? "align-self-end flex-row-reverse"
                                    : "align-self-start"
                            }`}
                        >
                            <div
                                className="d-flex align-items-center justify-content-center fs-5 flex-shrink-0"
                                style={{ width: 36, height: 36 }}
                            >
                                {msg.role === "user" ? "👤" : "🤖"}
                            </div>
                            <div
                                className={`px-3 py-2 rounded-4 lh-base ${
                                    msg.role === "user"
                                        ? "message-bubble-user text-white"
                                        : "message-bubble-assistant bg-light text-dark"
                                }`}
                                style={{
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            >
                                {msg.content}
                                {msg.isStreaming && (
                                    <span className="cursor">▌</span>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="d-flex gap-2 p-3 bg-light border-top">
                <input
                    ref={inputRef}
                    type="text"
                    className="form-control chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyUp={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                />
                <button
                    className="btn btn-send text-white fw-semibold px-4"
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? "..." : "Send"}
                </button>
            </footer>
        </div>
    );
};

export default ChatUI;
