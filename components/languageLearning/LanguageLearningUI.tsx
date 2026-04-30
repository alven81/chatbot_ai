"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { getLanguageHealth, HealthStatus } from "@/services/request";
import tutorImage from "@/app/assets/images/ll-girl.jpg";
import tutorIco from "@/app/assets/images/ll-girl-ico.png";
import { API_URL } from "@/services/routes";
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

interface VocabEntry {
    id: string;
    proposal: string;
    translation: string;
    addedAt: string;
    isHidden?: boolean;
}

interface ISpeechRecognition {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
}
type ISpeechRecognitionCtor = new () => ISpeechRecognition;

const getSpeechRecognitionCtor = (): ISpeechRecognitionCtor | undefined => {
    const g = globalThis as Record<string, unknown>;
    return (g["SpeechRecognition"] ?? g["webkitSpeechRecognition"]) as
        | ISpeechRecognitionCtor
        | undefined;
};

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

const LANGUAGE_CODES: Record<string, string> = {
    Polish: "pl-PL",
    English: "en-US",
    Russian: "ru-RU",
    Belorussian: "be-BY",
    Norwegian: "nb-NO",
    German: "de-DE",
    Spanish: "es-ES",
    French: "fr-FR",
    Italian: "it-IT",
    Portuguese: "pt-PT",
    Japanese: "ja-JP",
    Korean: "ko-KR",
    "Chinese (Mandarin)": "zh-CN",
    Arabic: "ar-SA",
    Hindi: "hi-IN",
    Turkish: "tr-TR",
    Dutch: "nl-NL",
    Swedish: "sv-SE",
    Czech: "cs-CZ",
    Ukrainian: "uk-UA",
    Greek: "el-GR",
    Hebrew: "he-IL",
};

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
    const [status, setStatus] = useState<HealthStatus>({
        platform: "Loading...",
        llm: "...",
    });
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const sessionIdRef = useRef<string>("");
    const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
    const [isAddVocabModalOpen, setIsAddVocabModalOpen] = useState(false);
    const [isEditVocabModalOpen, setIsEditVocabModalOpen] = useState(false);
    const [vocabFilterMode, setVocabFilterMode] = useState<
        "all" | "visible" | "hidden"
    >("visible");
    const [pendingVocabEntry, setPendingVocabEntry] = useState<{
        proposal: string;
        translation: string;
    } | null>(null);
    const [editingEntry, setEditingEntry] = useState<VocabEntry | null>(null);
    const [editProposal, setEditProposal] = useState("");
    const [editTranslation, setEditTranslation] = useState("");
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [sessionAlert, setSessionAlert] = useState<{
        type: "error" | "warning" | "info";
        message: string;
    } | null>(null);
    const [vocabulary, setVocabulary] = useState<VocabEntry[]>([]);
    const [isMicListening, setIsMicListening] = useState(false);
    const [micLang, setMicLang] = useState<"learning" | "user">("learning");
    const [autoSpeak, setAutoSpeak] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<
        SpeechSynthesisVoice[]
    >([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
    const [autoSend, setAutoSend] = useState(false);
    const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const spokenIdsRef = useRef<Set<string>>(new Set());

    // --- Vocabulary helpers ---
    const getVocabKey = () => `vocab_${userLanguage}_${learningLanguage}`;

    const loadVocabulary = (): VocabEntry[] => {
        try {
            const raw = localStorage.getItem(getVocabKey());
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const saveVocabulary = (entries: VocabEntry[]) => {
        localStorage.setItem(getVocabKey(), JSON.stringify(entries));
        setVocabulary(entries);
    };

    const addToVocabulary = (proposal: string, translation: string) => {
        const entries = loadVocabulary();
        const alreadyExists = entries.some(
            (e) => e.proposal === proposal && e.translation === translation
        );
        if (alreadyExists) return;
        const newEntry: VocabEntry = {
            id: `vocab-${Date.now()}`,
            proposal,
            translation,
            addedAt: new Date().toISOString(),
            isHidden: false,
        };
        saveVocabulary([...entries, newEntry]);
    };

    const removeFromVocabulary = (id: string) => {
        const entries = loadVocabulary().filter((e) => e.id !== id);
        saveVocabulary(entries);
    };

    const updateVocabEntry = (
        id: string,
        proposal: string,
        translation: string
    ) => {
        const entries = loadVocabulary().map((e) =>
            e.id === id ? { ...e, proposal, translation } : e
        );
        saveVocabulary(entries);
    };

    const toggleHideVocabEntry = (id: string) => {
        const entries = loadVocabulary().map((e) =>
            e.id === id ? { ...e, isHidden: !e.isHidden } : e
        );
        saveVocabulary(entries);
    };

    const downloadVocabulary = () => {
        const entries = loadVocabulary();
        const payload = {
            version: 1,
            userLanguage,
            learningLanguage,
            exportedAt: new Date().toISOString(),
            entries,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vocabulary_${userLanguage}_${learningLanguage}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isValidVocabEntry = (e: unknown): e is VocabEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as VocabEntry).id === "string" &&
        typeof (e as VocabEntry).proposal === "string" &&
        typeof (e as VocabEntry).translation === "string" &&
        typeof (e as VocabEntry).addedAt === "string" &&
        (typeof (e as VocabEntry).isHidden === "boolean" ||
            (e as VocabEntry).isHidden === undefined);

    const handleUploadVocabulary = (file: File) => {
        setUploadError(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                // Accept both the wrapped export format and a raw array
                const raw: unknown = Array.isArray(parsed)
                    ? parsed
                    : parsed?.entries;
                if (!Array.isArray(raw) || !raw.every(isValidVocabEntry)) {
                    setUploadError(
                        'Invalid file format: expected a vocabulary export with an "entries" array where each item has id, proposal, translation, and addedAt fields.'
                    );
                    return;
                }
                // Merge: skip duplicates by id
                const existing = loadVocabulary();
                const existingIds = new Set(existing.map((e) => e.id));
                const merged = [
                    ...existing,
                    ...raw.filter((e) => !existingIds.has(e.id)),
                ];
                saveVocabulary(merged);
            } catch {
                setUploadError(
                    "Could not read the file. Make sure it is a valid JSON vocabulary export."
                );
            }
        };
        reader.readAsText(file);
    };

    const getLocalStorageInfo = () => {
        let totalUsed = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)!;
            totalUsed += key.length + (localStorage.getItem(key)?.length || 0);
        }
        const totalBytes = totalUsed * 2; // JS strings are UTF-16 (2 bytes per char)
        const maxBytes = 5 * 1024 * 1024; // ~5 MB typical limit
        const currentVocabChars = (localStorage.getItem(getVocabKey()) || "")
            .length;
        const currentVocabBytes = currentVocabChars * 2;
        return {
            usedBytes: totalBytes,
            maxBytes,
            remainingBytes: maxBytes - totalBytes,
            currentVocabBytes,
        };
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const speakText = (text: string) => {
        globalThis.window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langCode = LANGUAGE_CODES[learningLanguage];
        if (langCode) utterance.lang = langCode;
        if (selectedVoiceURI) {
            const voice = availableVoices.find(
                (v) => v.voiceURI === selectedVoiceURI
            );
            if (voice) utterance.voice = voice;
        }
        globalThis.window.speechSynthesis.speak(utterance);
    };

    const handleVoiceInput = () => {
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) return;

        if (isMicListening && recognitionRef.current) {
            recognitionRef.current.stop();
            return;
        }

        const recognition = new Ctor();
        recognitionRef.current = recognition;
        recognition.lang =
            (micLang === "learning"
                ? LANGUAGE_CODES[learningLanguage]
                : LANGUAGE_CODES[userLanguage]) ?? "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsMicListening(true);
        recognition.onend = () => setIsMicListening(false);
        recognition.onerror = () => setIsMicListening(false);
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            if (autoSend) {
                sendMessage(transcript);
            } else {
                setInput((prev) =>
                    prev ? prev + " " + transcript : transcript
                );
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        };

        recognition.start();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
        if (!sessionIdRef.current) {
            sessionIdRef.current = `lang-session-${Date.now()}`;
        }
        getLanguageHealth().then(setStatus);
        setHasSpeechRecognition(getSpeechRecognitionCtor() !== undefined);
    }, []);

    // Reload vocabulary when language pair changes
    useEffect(() => {
        setVocabulary(loadVocabulary());
    }, [userLanguage, learningLanguage]);

    // Load persisted preferences
    useEffect(() => {
        if (localStorage.getItem("lang_auto_speak") === "true")
            setAutoSpeak(true);
        if (localStorage.getItem("lang_auto_send") === "true")
            setAutoSend(true);
    }, []);

    // Load available TTS voices and restore saved selection
    useEffect(() => {
        const synth = globalThis.window.speechSynthesis;
        const load = () => {
            setAvailableVoices(synth.getVoices());
            const saved = localStorage.getItem("lang_voice_uri");
            if (saved) setSelectedVoiceURI(saved);
        };
        load();
        synth.addEventListener("voiceschanged", load);
        return () => synth.removeEventListener("voiceschanged", load);
    }, []);

    // Reset voice when learning language changes
    useEffect(() => {
        setSelectedVoiceURI("");
        localStorage.removeItem("lang_voice_uri");
    }, [learningLanguage]);

    // Auto-speak new finished assistant messages
    useEffect(() => {
        if (!autoSpeak) return;
        const last = [...messages]
            .reverse()
            .find((m) => m.role === "assistant" && !m.isStreaming && m.content);
        if (last && !spokenIdsRef.current.has(last.id)) {
            spokenIdsRef.current.add(last.id);
            speakText(last.content);
        }
    }, [messages, autoSpeak]);

    // Load/Save selected model
    useEffect(() => {
        const saved = localStorage.getItem("lang_model_id");
        if (saved) {
            setSelectedModel(saved);
        } else if (
            status.availableModels &&
            status.availableModels.length > 0
        ) {
            setSelectedModel(status.availableModels[0].id);
        }
    }, [status]);

    const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const modelId = e.target.value;
        setSelectedModel(modelId);
        localStorage.setItem("lang_model_id", modelId);
    };

    const sendMessage = async (overrideContent?: string) => {
        const messageContent = (overrideContent ?? input).trim();
        if (!messageContent || isLoading) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: messageContent,
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
                `${API_URL}/language-learning/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userMessage.content,
                        sessionId: sessionIdRef.current,
                        learningLanguage,
                        userLanguage,
                        learningLevel,
                        userProfession,
                        modelId: selectedModel,
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
                                if (data.error) {
                                    const raw: string = data.error;
                                    const isQuota =
                                        raw.includes("429") ||
                                        raw.includes("Too Many Requests") ||
                                        raw.includes("Quota exceeded") ||
                                        raw.includes("quota");
                                    const isRateLimit =
                                        raw.includes("rate") ||
                                        raw.includes("Rate");
                                    const retryMatch =
                                        /retry in\s+([\d.]+)s/i.exec(raw);
                                    const retryIn = retryMatch
                                        ? Math.ceil(
                                              Number.parseFloat(retryMatch[1])
                                          )
                                        : null;
                                    const retrySuffix = retryIn
                                        ? ` — please retry in ${retryIn}s`
                                        : "";
                                    let userMessage: string;
                                    if (isQuota) {
                                        userMessage = `API quota exceeded${retrySuffix}. Free tier limits reached for this model.`;
                                    } else if (isRateLimit) {
                                        userMessage = `Rate limit hit${retrySuffix}. You're sending messages too quickly.`;
                                    } else {
                                        userMessage = `Server error: ${raw.split("\n")[0].slice(0, 120)}`;
                                    }

                                    setSessionAlert({
                                        type: "error",
                                        message: userMessage,
                                    });
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? {
                                                      ...msg,
                                                      content: isQuota
                                                          ? "⚠️ Quota exceeded"
                                                          : "⚠️ Error",
                                                      isStreaming: false,
                                                  }
                                                : msg
                                        )
                                    );
                                }
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
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const isSessionClosed =
                errorMessage.includes("closed") ||
                errorMessage.includes("ended") ||
                errorMessage.includes("aborted");
            setSessionAlert({
                type: "error",
                message: isSessionClosed
                    ? "Session closed. Your connection to the server was interrupted. Please try again."
                    : "Failed to get response from server. Please check your connection and try again.",
            });
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? {
                              ...msg,
                              content: isSessionClosed
                                  ? "Connection closed"
                                  : "Error: Failed to get response",
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
            await fetch(`${API_URL}/language-learning/clear`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: sessionIdRef.current }),
            });
            setMessages([]);
            setSessionAlert(null);
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

    const micLangName =
        micLang === "learning" ? learningLanguage : userLanguage;

    const learningLangPrefix = (LANGUAGE_CODES[learningLanguage] ?? "").split(
        "-"
    )[0];
    const voicesForLang = availableVoices.filter((v) =>
        v.lang.startsWith(learningLangPrefix)
    );

    return (
        <div className="app language-learning d-flex flex-column vh-100 mx-auto bg-white shadow-lg">
            {/* Session Alert */}
            {sessionAlert && (
                <div
                    className={`alert alert-${sessionAlert.type} alert-dismissible fade show m-2 mb-0`}
                    role="alert"
                >
                    <div className="d-flex align-items-center gap-2">
                        <span className="fs-5">
                            {sessionAlert.type === "error" && "⚠️"}
                            {sessionAlert.type === "warning" && "⚠️"}
                            {sessionAlert.type === "info" && "ℹ️"}
                        </span>
                        <span>{sessionAlert.message}</span>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSessionAlert(null)}
                        aria-label="Close"
                    />
                </div>
            )}

            <header className="header-orange d-flex flex-column justify-content-between align-items-center p-3 text-white">
                <div className="w-100 d-flex flex-wrap justify-content-between align-items-start gap-1">
                    <div className="d-flex flex-column">
                        <h1 className="h5 fw-semibold mb-0">
                            🌍 AI Language Learning
                        </h1>
                        {status.availableModels &&
                        status.availableModels.length > 0 ? (
                            <select
                                className="form-select form-select-sm mt-1"
                                style={{ maxWidth: "200px", cursor: "pointer" }}
                                value={selectedModel}
                                onChange={handleModelChange}
                            >
                                {status.availableModels
                                    .filter((model) => !model.isImageOnly)
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                            </select>
                        ) : (
                            <p className="small opacity-75 mb-1">
                                Running on: {status.platform} ({status.llm})
                            </p>
                        )}
                        <Link
                            href="/"
                            className="text-white text-decoration-underline small"
                        >
                            Go back to Home
                        </Link>
                    </div>

                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-light"
                            onClick={() => {
                                setVocabulary(loadVocabulary());
                                setIsVocabModalOpen(true);
                            }}
                        >
                            📖 Vocabulary
                        </button>
                        <button
                            className="btn btn-outline-light"
                            onClick={clearChat}
                        >
                            Clear Chat
                        </button>
                    </div>
                </div>
            </header>

            <div className="position-relative bg-light border-bottom">
                <div
                    className={`settings-accordion ${
                        isSettingsOpen ? "open" : "collapsed"
                    }`}
                >
                    <div className="d-flex flex-wrap gap-2 p-3 align-items-end">
                        {/* Row 1: languages, profession, level */}
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

                        {/* Row 2: voice + toggles in one line */}
                        <div className="w-100 d-flex flex-wrap gap-3 align-items-end">
                            <div
                                className="flex-grow-1"
                                style={{ minWidth: 200 }}
                            >
                                <label
                                    htmlFor="voice-select"
                                    className="form-label small fw-semibold text-secondary"
                                >
                                    Voice:
                                </label>
                                <select
                                    id="voice-select"
                                    className="form-select"
                                    value={selectedVoiceURI}
                                    disabled={
                                        availableVoices.length === 0 ||
                                        voicesForLang.length === 0
                                    }
                                    onChange={(e) => {
                                        setSelectedVoiceURI(e.target.value);
                                        localStorage.setItem(
                                            "lang_voice_uri",
                                            e.target.value
                                        );
                                    }}
                                >
                                    {availableVoices.length === 0 && (
                                        <option value="">
                                            Loading voices…
                                        </option>
                                    )}
                                    {availableVoices.length > 0 &&
                                        voicesForLang.length === 0 && (
                                            <option value="">
                                                No voices for {learningLanguage}
                                            </option>
                                        )}
                                    {voicesForLang.length > 0 && (
                                        <>
                                            <option value="">Default</option>
                                            {voicesForLang.map((v) => (
                                                <option
                                                    key={v.voiceURI}
                                                    value={v.voiceURI}
                                                >
                                                    {v.name}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="d-flex align-items-center gap-4 pb-1">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="small fw-semibold text-secondary">
                                        Auto-speak:
                                    </span>
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="auto-speak-toggle"
                                            checked={autoSpeak}
                                            onChange={(e) => {
                                                setAutoSpeak(e.target.checked);
                                                localStorage.setItem(
                                                    "lang_auto_speak",
                                                    String(e.target.checked)
                                                );
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <label
                                            className="form-check-label small text-secondary"
                                            htmlFor="auto-speak-toggle"
                                            style={{ cursor: "pointer" }}
                                        >
                                            {autoSpeak ? "On" : "Off"}
                                        </label>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    <span className="small fw-semibold text-secondary">
                                        Auto-send:
                                    </span>
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="auto-send-toggle"
                                            checked={autoSend}
                                            onChange={(e) => {
                                                setAutoSend(e.target.checked);
                                                localStorage.setItem(
                                                    "lang_auto_send",
                                                    String(e.target.checked)
                                                );
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <label
                                            className="form-check-label small text-secondary"
                                            htmlFor="auto-send-toggle"
                                            style={{ cursor: "pointer" }}
                                        >
                                            {autoSend ? "On" : "Off"}
                                        </label>
                                    </div>
                                </div>
                            </div>
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
                                    loading="eager"
                                    priority
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
                                {msg.role === "assistant" &&
                                    msg.content &&
                                    !msg.isStreaming && (
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 border-0 float-start me-1"
                                            title={`Listen in ${learningLanguage}`}
                                            onClick={() =>
                                                speakText(msg.content)
                                            }
                                            style={{
                                                fontSize: "1rem",
                                                lineHeight: 1,
                                            }}
                                        >
                                            🔊
                                        </button>
                                    )}
                                {msg.content}
                                {msg.isStreaming && !msg.content.length && (
                                    <span className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </span>
                                )}

                                {/* Translation block */}
                                {msg.role === "assistant" &&
                                    (msg.proposal || msg.translation) && (
                                        <div className="translation-block">
                                            <strong>
                                                📝 Translation of your message:
                                            </strong>
                                            {msg.proposal && (
                                                <p className="mb-1 d-flex align-items-start gap-1">
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0 border-0 flex-shrink-0"
                                                        title={`Listen in ${learningLanguage}`}
                                                        onClick={() =>
                                                            speakText(
                                                                msg.proposal!
                                                            )
                                                        }
                                                        style={{
                                                            fontSize: "1rem",
                                                            lineHeight: 1,
                                                        }}
                                                    >
                                                        🔊
                                                    </button>
                                                    <span>
                                                        <em>Proposal:</em>{" "}
                                                        {msg.proposal}
                                                    </span>
                                                </p>
                                            )}
                                            {msg.translation && (
                                                <button
                                                    type="button"
                                                    className="vocab-translation-hint text-secondary mb-0"
                                                    title="Click to add to Vocabulary"
                                                    onClick={() => {
                                                        setPendingVocabEntry({
                                                            proposal:
                                                                msg.proposal ||
                                                                "",
                                                            translation:
                                                                msg.translation ||
                                                                "",
                                                        });
                                                        setIsAddVocabModalOpen(
                                                            true
                                                        );
                                                    }}
                                                >
                                                    <em>Translation:</em>{" "}
                                                    {msg.translation}
                                                </button>
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

            {/* --- Add to Vocabulary Modal --- */}
            {isAddVocabModalOpen && pendingVocabEntry && (
                <div
                    className="vocab-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    suppressHydrationWarning
                    onClick={() => setIsAddVocabModalOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setIsAddVocabModalOpen(false);
                    }}
                >
                    <div
                        className="vocab-modal"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <div className="vocab-modal-header">
                            <h5 className="mb-0">📝 Add to Vocabulary</h5>
                            <button
                                className="btn-close"
                                onClick={() => setIsAddVocabModalOpen(false)}
                            />
                        </div>
                        <div className="vocab-modal-body">
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-secondary">
                                    Proposal ({learningLanguage}):
                                </label>
                                <div className="p-2 bg-light rounded border">
                                    {pendingVocabEntry.proposal || (
                                        <em className="text-muted">—</em>
                                    )}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-secondary">
                                    Translation ({userLanguage}):
                                </label>
                                <div className="p-2 bg-light rounded border">
                                    {pendingVocabEntry.translation}
                                </div>
                            </div>
                        </div>
                        <div className="vocab-modal-footer">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setIsAddVocabModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={() => {
                                    addToVocabulary(
                                        pendingVocabEntry.proposal,
                                        pendingVocabEntry.translation
                                    );
                                    setIsAddVocabModalOpen(false);
                                    setPendingVocabEntry(null);
                                }}
                            >
                                ✅ Add to Vocabulary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Vocabulary Entry Modal --- */}
            {isEditVocabModalOpen && editingEntry && (
                <div
                    className="vocab-modal-overlay vocab-modal-overlay-edit"
                    role="dialog"
                    aria-modal="true"
                    suppressHydrationWarning
                    onClick={() => setIsEditVocabModalOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setIsEditVocabModalOpen(false);
                    }}
                >
                    <div
                        className="vocab-modal"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <div className="vocab-modal-header">
                            <h5 className="mb-0">✏️ Edit Entry</h5>
                            <button
                                className="btn-close"
                                onClick={() => setIsEditVocabModalOpen(false)}
                            />
                        </div>
                        <div className="vocab-modal-body">
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-secondary">
                                    Proposal ({learningLanguage}):
                                </label>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows={2}
                                    value={editProposal}
                                    onChange={(e) =>
                                        setEditProposal(e.target.value)
                                    }
                                />
                            </div>
                            <div className="mb-1">
                                <label className="form-label fw-semibold small text-secondary">
                                    Translation ({userLanguage}):
                                </label>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows={2}
                                    value={editTranslation}
                                    onChange={(e) =>
                                        setEditTranslation(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="vocab-modal-footer">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setIsEditVocabModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                disabled={
                                    !editProposal.trim() ||
                                    !editTranslation.trim()
                                }
                                onClick={() => {
                                    updateVocabEntry(
                                        editingEntry.id,
                                        editProposal.trim(),
                                        editTranslation.trim()
                                    );
                                    setIsEditVocabModalOpen(false);
                                    setEditingEntry(null);
                                }}
                            >
                                💾 Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Vocabulary List Modal --- */}
            {isVocabModalOpen && (
                <div
                    className="vocab-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    suppressHydrationWarning
                    onClick={() => setIsVocabModalOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setIsVocabModalOpen(false);
                    }}
                >
                    <div
                        className="vocab-modal vocab-modal-lg"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <div className="vocab-modal-header">
                            <div className="w-100 d-flex justify-content-between">
                                <h5 className="mb-0">
                                    📖 Vocabulary — {userLanguage} →{" "}
                                    {learningLanguage}
                                </h5>
                                <button
                                    className="btn-close"
                                    onClick={() => {
                                        setIsVocabModalOpen(false);
                                        setUploadError(null);
                                    }}
                                />
                            </div>
                            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <div
                                    className="btn-group btn-group-sm"
                                    role="group"
                                >
                                    {(
                                        ["visible", "all", "hidden"] as const
                                    ).map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            className={`btn ${
                                                vocabFilterMode === mode
                                                    ? "btn-secondary"
                                                    : "btn-outline-secondary"
                                            }`}
                                            onClick={() =>
                                                setVocabFilterMode(mode)
                                            }
                                            title={`Show ${mode} entries`}
                                        >
                                            {mode === "visible" && "👁️"}
                                            {mode === "all" && "📋"}
                                            {mode === "hidden" && "🙈"}
                                        </button>
                                    ))}
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        title="Download vocabulary as JSON"
                                        onClick={downloadVocabulary}
                                        disabled={vocabulary.length === 0}
                                    >
                                        ⬇ Download
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        title="Upload and merge vocabulary from JSON"
                                        onClick={() => {
                                            setUploadError(null);
                                            uploadInputRef.current?.click();
                                        }}
                                    >
                                        ⬆ Upload
                                    </button>
                                    <input
                                        ref={uploadInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        className="d-none"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                                handleUploadVocabulary(file);
                                            e.target.value = "";
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        {uploadError && (
                            <div className="alert alert-danger mb-0 px-3 py-2 rounded-0 small">
                                ⚠️ {uploadError}
                            </div>
                        )}
                        <div
                            className="vocab-modal-body"
                            style={{ maxHeight: "60vh", overflowY: "auto" }}
                        >
                            {vocabulary.length === 0 ? (
                                <p className="text-muted text-center py-4">
                                    No saved words yet. Click a translation in
                                    chat to add entries.
                                </p>
                            ) : (
                                <table className="table table-sm table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>
                                                {learningLanguage} (Proposal)
                                            </th>
                                            <th>
                                                {userLanguage} (Translation)
                                            </th>
                                            <th style={{ width: 100 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const filtered =
                                                vocabFilterMode === "hidden"
                                                    ? vocabulary.filter(
                                                          (e) =>
                                                              e.isHidden ===
                                                              true
                                                      )
                                                    : vocabFilterMode === "all"
                                                      ? vocabulary
                                                      : vocabulary.filter(
                                                            (e) => !e.isHidden
                                                        );
                                            return filtered.map(
                                                (entry, idx) => (
                                                    <tr key={entry.id}>
                                                        <td className="text-muted">
                                                            {idx + 1}
                                                        </td>
                                                        <td>
                                                            {entry.proposal}
                                                        </td>
                                                        <td>
                                                            {entry.translation}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-1">
                                                                <button
                                                                    className="btn btn-outline-secondary btn-sm py-0 px-1"
                                                                    title={
                                                                        entry.isHidden
                                                                            ? "Show"
                                                                            : "Hide"
                                                                    }
                                                                    onClick={() =>
                                                                        toggleHideVocabEntry(
                                                                            entry.id
                                                                        )
                                                                    }
                                                                >
                                                                    {entry.isHidden
                                                                        ? "👁️"
                                                                        : "🙈"}
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-secondary btn-sm py-0 px-1"
                                                                    title="Edit"
                                                                    onClick={() => {
                                                                        setEditingEntry(
                                                                            entry
                                                                        );
                                                                        setEditProposal(
                                                                            entry.proposal
                                                                        );
                                                                        setEditTranslation(
                                                                            entry.translation
                                                                        );
                                                                        setIsEditVocabModalOpen(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm py-0 px-1"
                                                                    title="Remove"
                                                                    onClick={() =>
                                                                        removeFromVocabulary(
                                                                            entry.id
                                                                        )
                                                                    }
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="vocab-modal-footer flex-column align-items-stretch">
                            <div className="text-muted small text-center">
                                {(() => {
                                    const info = getLocalStorageInfo();
                                    return (
                                        <>
                                            💾 This vocabulary:{" "}
                                            {formatBytes(
                                                info.currentVocabBytes
                                            )}{" "}
                                            &nbsp;|&nbsp; Total used:{" "}
                                            {formatBytes(info.usedBytes)} /{" "}
                                            {formatBytes(info.maxBytes)}{" "}
                                            &nbsp;|&nbsp; Remaining:{" "}
                                            {formatBytes(info.remainingBytes)}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <footer className="d-flex gap-2 p-3 bg-light border-top">
                {isMicListening && (
                    <div className="mic-visualizer" aria-label="Listening…">
                        <span className="mic-bar" />
                        <span className="mic-bar" />
                        <span className="mic-bar" />
                        <span className="mic-bar" />
                        <span className="mic-bar" />
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    className="form-control chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyUp={handleKeyPress}
                    placeholder={
                        isMicListening
                            ? `Listening in ${micLangName}…`
                            : `Type in ${learningLanguage} or ${userLanguage}...`
                    }
                    disabled={isLoading}
                />
                {hasSpeechRecognition && (
                    <>
                        <button
                            type="button"
                            className="btn btn-outline-secondary px-2"
                            disabled={isLoading || isMicListening}
                            onClick={() =>
                                setMicLang((prev) =>
                                    prev === "learning" ? "user" : "learning"
                                )
                            }
                            title={`Recognition language: ${micLangName} — click to switch`}
                            style={{
                                fontSize: "0.75rem",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {micLangName}
                        </button>
                        <button
                            type="button"
                            className={`btn ${
                                isMicListening
                                    ? "btn-danger"
                                    : "btn-outline-secondary"
                            } px-3`}
                            onClick={handleVoiceInput}
                            disabled={isLoading}
                            title={
                                isMicListening
                                    ? "Stop recording"
                                    : `Speak in ${micLangName}`
                            }
                        >
                            {isMicListening ? "⏹" : "🎤"}
                        </button>
                    </>
                )}
                <button
                    className="btn btn-send text-white fw-semibold px-4"
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? "..." : "Send"}
                </button>
            </footer>
        </div>
    );
};

export default LanguageLearningUI;
