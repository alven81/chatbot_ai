"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import {
    getTextRecognitionHealth,
    HealthStatus,
    recognizeText as recognizeTextRequest,
} from "../../services/request";
import "./TextRecognition.scss";

const LANGUAGES = [
    "Auto define language",
    "Mixed language text",
    "English",
    "Polish",
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

const TextRecognitionUI = () => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [recognizedText, setRecognizedText] = useState<string>("");
    const [recognitionLanguage, setRecognitionLanguage] = useState(
        "Auto define language"
    );
    const [status, setStatus] = useState<HealthStatus>({
        platform: "Loading...",
        llm: "...",
    });
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        getTextRecognitionHealth().then(setStatus);
    }, []);

    // Load/Save selected model.
    // Priority: saved valid vision model → first image-capable model → first any model.
    useEffect(() => {
        if (!status.availableModels || status.availableModels.length === 0)
            return;

        const visionModels = status.availableModels.filter(
            (m) => m.isImageCapable || m.isOcrOnly
        );
        const saved = localStorage.getItem("text_recognition_model_id");

        if (saved && visionModels.some((m) => m.id === saved)) {
            // Saved value is a valid vision model — keep it.
            setSelectedModel(saved);
        } else if (visionModels.length > 0) {
            // Prefer non-OCR-only (i.e. general vision) models as default since
            // dedicated OCR models (Nanonets) may hallucinate on clean images.
            const preferred =
                visionModels.find((m) => !m.isOcrOnly) ?? visionModels[0];
            setSelectedModel(preferred.id);
            localStorage.setItem("text_recognition_model_id", preferred.id);
        } else {
            setSelectedModel(status.availableModels[0].id);
        }
    }, [status]);

    const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const modelId = e.target.value;
        setSelectedModel(modelId);
        localStorage.setItem("text_recognition_model_id", modelId);
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Please upload a valid image file (PNG, JPG, WEBP).");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("Image must be less than 10 MB.");
            return;
        }

        setError(null);
        setFileName(file.name);
        setRecognizedText("");

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setUploadedImage(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const RECOGNITION_TIMEOUT_MS = 180_000;

    const recognizeText = async () => {
        if (!uploadedImage) return;

        // Cancel any previous in-flight request
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Client-side timeout: auto-abort after RECOGNITION_TIMEOUT_MS
        const timeoutId = setTimeout(
            () => controller.abort(),
            RECOGNITION_TIMEOUT_MS
        );

        setIsProcessing(true);
        setError(null);
        setRecognizedText("");

        try {
            const base64Data = uploadedImage.split(",")[1];

            const data = await recognizeTextRequest(
                {
                    imageBase64: base64Data,
                    language: recognitionLanguage,
                    modelId: selectedModel,
                },
                controller.signal
            );

            setRecognizedText(data.text);
        } catch (err: any) {
            if (err.message === "cancelled") {
                // Silently ignore — user clicked Reset or timeout fired
                return;
            }
            console.error("Text recognition error:", err);
            setError(
                err.message || "Failed to recognize text. Please try again."
            );
        } finally {
            clearTimeout(timeoutId);
            abortControllerRef.current = null;
            setIsProcessing(false);
        }
    };

    const resetAll = () => {
        // Abort any in-flight recognition immediately
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsProcessing(false);
        setUploadedImage(null);
        setRecognizedText("");
        setError(null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(recognizedText);
    };

    const renderRecognizedContent = () => {
        if (isProcessing) {
            return (
                <div className="d-flex flex-column align-items-center gap-2 text-secondary text-center p-3">
                    <div className="spinner" />
                    <p className="mb-0">Recognizing text...</p>
                    <p className="mb-0 small opacity-75">
                        This may take a few seconds
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="text-recognition d-flex flex-column min-vh-100 mx-auto bg-white shadow-lg">
            <header className="app-header-gradient d-flex justify-content-between align-items-center p-3 text-white">
                <div>
                    <h1 className="h5 fw-semibold mb-0">🔍 Text Recognition</h1>
                    <div className="d-flex flex-wrap gap-2 mt-1 align-items-center">
                        {status.availableModels &&
                        status.availableModels.length > 0 ? (
                            <select
                                className="form-select form-select-sm"
                                style={{
                                    maxWidth: "200px",
                                    cursor: "pointer",
                                }}
                                value={selectedModel}
                                onChange={handleModelChange}
                            >
                                {status.availableModels
                                    .filter(
                                        (model) =>
                                            model.isImageCapable ||
                                            model.isOcrOnly
                                    )
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                            </select>
                        ) : (
                            <p className="small opacity-75 mb-0">
                                Running on: {status.platform} ({status.llm})
                            </p>
                        )}
                        <select
                            className="form-select form-select-sm"
                            style={{
                                maxWidth: "200px",
                                cursor: "pointer",
                            }}
                            value={recognitionLanguage}
                            onChange={(e) =>
                                setRecognitionLanguage(e.target.value)
                            }
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Link
                        href="/"
                        className="text-white text-decoration-underline small"
                    >
                        Go back to Home
                    </Link>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-primary btn-sm fw-semibold"
                        onClick={recognizeText}
                        disabled={!uploadedImage || isProcessing}
                    >
                        {isProcessing ? "Recognizing..." : "Recognize Text"}
                    </button>
                    <button
                        className={`btn btn-sm ${isProcessing ? "btn-danger" : "btn-outline-light"}`}
                        onClick={resetAll}
                    >
                        {isProcessing ? "Cancel" : "Reset"}
                    </button>
                </div>
            </header>

            {error && (
                <div className="alert alert-danger mx-3 mt-3 mb-0">{error}</div>
            )}

            <main className="row g-4 p-4 flex-grow-1">
                {/* Left Panel — Source Image */}
                <div className="col-md-6 d-flex flex-column align-items-center">
                    <h2 className="h6 fw-semibold mb-3 text-dark">
                        Source Image
                    </h2>
                    {uploadedImage ? (
                        <div
                            className="image-area"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <img
                                src={uploadedImage}
                                alt="Uploaded source"
                                className="preview"
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="image-area upload-zone"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <div className="d-flex flex-column align-items-center gap-2 text-secondary text-center p-3">
                                <span className="fs-1">📤</span>
                                <p className="mb-0">
                                    Click or drag &amp; drop an image here
                                </p>
                                <p className="mb-0 small opacity-75">
                                    PNG, JPG, WEBP — max 10 MB
                                </p>
                            </div>
                        </button>
                    )}
                    {uploadedImage && (
                        <p className="mt-2 small text-secondary text-break">
                            {fileName}
                        </p>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleInputChange}
                        hidden
                    />
                </div>

                {/* Right Panel — Recognized Text */}
                <div className="col-md-6 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2 className="h6 fw-semibold mb-0 text-dark">
                            Recognized Text
                        </h2>
                        {recognizedText && (
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={copyToClipboard}
                                title="Copy to clipboard"
                            >
                                📋 Copy
                            </button>
                        )}
                    </div>
                    {renderRecognizedContent()}
                    {!isProcessing && (
                        <textarea
                            className="recognized-text flex-grow-1"
                            value={recognizedText}
                            onChange={(e) => setRecognizedText(e.target.value)}
                            placeholder="Recognized text will appear here..."
                            readOnly={false}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default TextRecognitionUI;
