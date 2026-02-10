"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import tutorImage from "@/app/assets/images/ll-girl.jpg";
import tutorIco from "@/app/assets/images/ll-girl-ico.png";
import "./LanguageLearning.scss";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    translation?: string;
    proposal?: string;
    corrections?: string;
    isStreaming?: boolean;
}

const API_URL = "http://localhost:3001";

const LANGUAGES = [
    "Polish",
    "English",
    "Russian",
    "Belorussian",
    "Norwegian",
    "German",
    "Spanish",
    "French",
    "Italian",
    "Portuguese",
    "Japanese",
    "Korean",
    "Chinese (Mandarin)",
    "Arabic",
    "Hindi",
    "Turkish",
    "Dutch",
    "Swedish",
    "Czech",
    "Ukrainian",
    "Greek",
    "Hebrew",
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const PROFESSIONS = [
    "General",
    "IT Engineer",
    "Doctor",
    "Lawyer",
    "Business Executive",
    "Student",
    "Tourist",
    "Chef",
    "Software Designer",
    "Teacher",
    "Sales Representative",
    "Architect",
    "Journalist",
];

const LanguageLearningUI = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [learningLanguage, setLearningLanguage] = useState("Polish");
    const [userLanguage, setUserLanguage] = useState("Belorussian");
    const [learningLevel, setLearningLevel] = useState("A1");
    const [userProfession, setUserProfession] = useState("General");
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
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
            const response = await fetch(
                `${API_URL}/api/language-learning/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userMessage.content,
                        sessionId,
                        learningLanguage,
                        userLanguage,
                        learningLevel,
                        userProfession,
                    }),
                }
            );

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
                                if (data.proposal) {
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? {
                                                      ...msg,
                                                      proposal: data.proposal,
                                                  }
                                                : msg
                                        )
                                    );
                                }
                                if (data.translation) {
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? {
                                                      ...msg,
                                                      translation:
                                                          data.translation,
                                                  }
                                                : msg
                                        )
                                    );
                                }
                                if (data.corrections) {
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? {
                                                      ...msg,
                                                      corrections:
                                                          data.corrections,
                                                  }
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
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
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

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app language-learning d-flex flex-column vh-100 mx-auto bg-white shadow-lg">
            <header className="header-orange d-flex flex-column justify-content-between align-items-center p-3 text-white">
                <div className="w-100 d-flex flex-wrap justify-content-between align-items-start gap-1">
                    <div className="d-flex flex-column">
                        <h1 className="h5 fw-semibold mb-0">
                            🌍 AI Language Learning
                        </h1>
                        <p className="small opacity-75 mb-1">
                            Powered by GPT-4o &middot; Your personal language
                            tutor
                        </p>
                        <Link
                            href="/"
                            className="text-white text-decoration-underline small"
                        >
                            Go back to Home
                        </Link>
                    </div>

                    <button
                        className="btn btn-outline-light"
                        onClick={clearChat}
                    >
                        Clear Chat
                    </button>
                </div>
            </header>

            <div className="position-relative bg-light border-bottom">
                <div
                    className={`settings-accordion ${
                        isSettingsOpen ? "open" : "collapsed"
                    }`}
                >
                    <div className="d-flex flex-wrap gap-3 p-3 align-items-end">
                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="user-language-select"
                                className="form-label small fw-semibold text-secondary"
                            >
                                I speak:
                            </label>
                            <select
                                id="user-language-select"
                                value={userLanguage}
                                onChange={(e) =>
                                    setUserLanguage(e.target.value)
                                }
                                className="form-select"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="learning-language-select"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Learning:
                            </label>
                            <select
                                id="learning-language-select"
                                value={learningLanguage}
                                onChange={(e) =>
                                    setLearningLanguage(e.target.value)
                                }
                                className="form-select"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 100 }}>
                            <label
                                htmlFor="learning-level-select"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Level:
                            </label>
                            <select
                                id="learning-level-select"
                                value={learningLevel}
                                onChange={(e) =>
                                    setLearningLevel(e.target.value)
                                }
                                className="form-select"
                            >
                                {LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="user-profession-select"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Profession:
                            </label>
                            <select
                                id="user-profession-select"
                                value={userProfession}
                                onChange={(e) =>
                                    setUserProfession(e.target.value)
                                }
                                className="form-select"
                            >
                                {PROFESSIONS.map((prof) => (
                                    <option key={prof} value={prof}>
                                        {prof}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                <div className="chat-messages d-flex flex-column gap-3 p-2">
                    {messages.length === 0 && (
                        <div className="d-flex flex-wrap flex-md-nowrap align-items-center justify-content-center h-100 text-secondary fs-5 px-5 gap-5">
                            <div className="flex-shrink-0">
                                <Image
                                    src={tutorImage}
                                    alt="Language Tutor"
                                    width={350}
                                    height={500}
                                    style={{
                                        borderRadius: "1.5rem",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>
                            <div
                                className="d-flex flex-column align-items-start text-start"
                                style={{ maxWidth: "450px" }}
                            >
                                <p>
                                    🌍 Hello! I&apos;m your language tutor. I
                                    see you&apos;re at{" "}
                                    <strong>{learningLevel}</strong> level and
                                    interested in{" "}
                                    <strong>{userProfession}</strong>.
                                </p>
                                <p>
                                    Start typing in{" "}
                                    <strong>{learningLanguage}</strong> (or{" "}
                                    <strong>{userLanguage}</strong>) and
                                    I&apos;ll help you translate.
                                </p>
                                <p className="small opacity-75 mt-2">
                                    I&apos;ll respond in {learningLanguage},
                                    translate your messages to {userLanguage},
                                    and correct any mistakes you make cute!
                                </p>
                            </div>
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
                                {msg.role === "user" ? (
                                    "👤"
                                ) : (
                                    <Image
                                        src={tutorIco}
                                        alt="Tutor Icon"
                                        width={36}
                                        height={36}
                                        style={{ borderRadius: "50%" }}
                                    />
                                )}
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

                                {/* Translation block */}
                                {msg.role === "assistant" &&
                                    (msg.proposal || msg.translation) && (
                                        <div className="translation-block">
                                            <strong>
                                                📝 Translation of your message:
                                            </strong>
                                            {msg.proposal && (
                                                <p className="mb-1">
                                                    <em>Proposal:</em>{" "}
                                                    {msg.proposal}
                                                </p>
                                            )}
                                            {msg.translation && (
                                                <p className="mb-0 text-secondary">
                                                    <em>Translation:</em>{" "}
                                                    {msg.translation}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                {/* Corrections block */}
                                {msg.role === "assistant" &&
                                    msg.corrections && (
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

            <footer className="d-flex gap-2 p-3 bg-light border-top">
                <input
                    ref={inputRef}
                    type="text"
                    className="form-control chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyUp={handleKeyPress}
                    placeholder={`Type in ${learningLanguage} or ${userLanguage}...`}
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

export default LanguageLearningUI;
