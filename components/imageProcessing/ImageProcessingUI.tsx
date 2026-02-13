"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import {
    processImage as processImageRequest,
    getImageHealth,
    HealthStatus,
} from "../../services/request";
import "./ImageProcessing.scss";

const ImageProcessingUI = () => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [styleDescription, setStyleDescription] = useState("");
    const [aspectRatio, setAspectRatio] = useState("3:4");
    const [style, setStyle] = useState("photorealistic");
    const [lighting, setLighting] = useState("cinematic");
    const [quality, setQuality] = useState("high");
    const [status, setStatus] = useState<HealthStatus>({
        platform: "Loading...",
        llm: "...",
    });
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const styleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        styleInputRef.current?.focus();
        getImageHealth().then(setStatus);
    }, []);

    // Load/Save selected model
    useEffect(() => {
        const saved = localStorage.getItem("image_model_id");
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
        localStorage.setItem("image_model_id", modelId);
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
        setProcessedImage(null);

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

    const processImage = async () => {
        if (!uploadedImage || !styleDescription.trim()) return;

        setIsProcessing(true);
        setError(null);
        setProcessedImage(null);

        try {
            // Extract raw base64 from data URL (remove "data:image/...;base64," prefix)
            const base64Data = uploadedImage.split(",")[1];

            const data = await processImageRequest({
                imageBase64: base64Data,
                styleDescription: styleDescription.trim(),
                aspectRatio,
                style,
                lighting,
                quality,
                modelId: selectedModel,
            });

            setProcessedImage(`data:image/png;base64,${data.resultBase64}`);
        } catch (err: any) {
            console.error("Image processing error:", err);
            setError(
                err.message || "Failed to process image. Please try again."
            );
        } finally {
            setIsProcessing(false);
            setTimeout(() => {
                styleInputRef.current?.focus();
            }, 0);
        }
    };

    const resetAll = () => {
        setUploadedImage(null);
        setProcessedImage(null);
        setStyleDescription("");
        setAspectRatio("3:4");
        setStyle("photorealistic");
        setLighting("cinematic");
        setQuality("high");
        setError(null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const renderProcessedContent = () => {
        if (isProcessing) {
            return (
                <div className="d-flex flex-column align-items-center gap-2 text-secondary text-center p-3">
                    <div className="spinner" />
                    <p className="mb-0">Processing your image...</p>
                    <p className="mb-0 small opacity-75">
                        This may take 15–30 seconds
                    </p>
                </div>
            );
        }

        if (processedImage) {
            return (
                <img
                    src={processedImage}
                    alt="Processed result"
                    className="preview"
                />
            );
        }

        return (
            <div className="d-flex flex-column align-items-center gap-2 text-secondary text-center p-3">
                <span className="fs-1">🎨</span>
                <p className="mb-0">Processed image will appear here</p>
            </div>
        );
    };

    return (
        <div className="image-processing d-flex flex-column min-vh-100 mx-auto bg-white shadow-lg">
            <header className="app-header-gradient d-flex justify-content-between align-items-center p-3 text-white">
                <div>
                    <h1 className="h5 fw-semibold mb-0">
                        🖼️ AI Image Processing
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
                                .filter(
                                    (model) =>
                                        model.isImageCapable && !model.isOcrOnly
                                )
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                        </select>
                    ) : (
                        <p className="small opacity-75 mt-1 mb-1">
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
                <button
                    className="btn btn-outline-light btn-sm"
                    onClick={resetAll}
                >
                    Reset
                </button>
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
                                htmlFor="styleDescription"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Clothing Style Description
                            </label>
                            <input
                                ref={styleInputRef}
                                id="styleDescription"
                                type="text"
                                className="form-control"
                                value={styleDescription}
                                onChange={(e) =>
                                    setStyleDescription(e.target.value)
                                }
                                placeholder='e.g. "elegant black tuxedo", "casual denim jacket with white t-shirt"'
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="aspectRatio"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Aspect Ratio
                            </label>
                            <select
                                id="aspectRatio"
                                className="form-select"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                disabled={isProcessing}
                            >
                                <option value="3:4">3:4 (Portrait)</option>
                                <option value="2:3">2:3 (Tall)</option>
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="style"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Photography Style
                            </label>
                            <select
                                id="style"
                                className="form-select"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                disabled={isProcessing}
                            >
                                <option value="photorealistic">
                                    Photorealistic
                                </option>
                                <option value="artistic">Artistic</option>
                                <option value="editorial">Editorial</option>
                                <option value="fashion">Fashion</option>
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="lighting"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Lighting
                            </label>
                            <select
                                id="lighting"
                                className="form-select"
                                value={lighting}
                                onChange={(e) => setLighting(e.target.value)}
                                disabled={isProcessing}
                            >
                                <option value="cinematic">Cinematic</option>
                                <option value="moody">Moody</option>
                                <option value="natural">Natural</option>
                                <option value="studio">Studio</option>
                            </select>
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 180 }}>
                            <label
                                htmlFor="quality"
                                className="form-label small fw-semibold text-secondary"
                            >
                                Quality
                            </label>
                            <select
                                id="quality"
                                className="form-select"
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                disabled={isProcessing}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="ultra">Ultra</option>
                            </select>
                        </div>

                        <button
                            className="btn btn-primary fw-semibold"
                            onClick={processImage}
                            disabled={
                                !uploadedImage ||
                                !styleDescription.trim() ||
                                isProcessing
                            }
                        >
                            {isProcessing ? "Processing..." : "Process Image"}
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

            {error && (
                <div className="alert alert-danger mx-3 mt-3 mb-0">{error}</div>
            )}

            <main className="row g-4 p-4 flex-grow-1">
                {/* Left Panel — Original Image */}
                <div className="col-md-6 d-flex flex-column align-items-center">
                    <h2 className="h6 fw-semibold mb-3 text-dark">
                        Original Image
                    </h2>
                    {uploadedImage ? (
                        <div
                            className="image-area"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <img
                                src={uploadedImage}
                                alt="Uploaded original"
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

                {/* Right Panel — Processed Image */}
                <div className="col-md-6 d-flex flex-column align-items-center">
                    <h2 className="h6 fw-semibold mb-3 text-dark">
                        Processed Image
                    </h2>
                    <div className="image-area">{renderProcessedContent()}</div>
                    {processedImage && (
                        <a
                            href={processedImage}
                            download="processed-image.png"
                            className="btn btn-primary btn-sm mt-3 fw-semibold"
                        >
                            Download Result
                        </a>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ImageProcessingUI;
