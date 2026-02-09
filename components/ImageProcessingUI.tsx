"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { processImage as processImageRequest } from "../services/request";
import "./ImageProcessing.scss";

export default function ImageProcessingUI() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [styleDescription, setStyleDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [style, setStyle] = useState("photorealistic");
  const [lighting, setLighting] = useState("cinematic");
  const [quality, setQuality] = useState("high");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
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
      });

      setProcessedImage(`data:image/png;base64,${data.resultBase64}`);
    } catch (err: any) {
      console.error("Image processing error:", err);
      setError(err.message || "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
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
        <div className="ip-placeholder">
          <div className="ip-spinner" />
          <p>Processing your image...</p>
          <p className="ip-hint">This may take 15–30 seconds</p>
        </div>
      );
    }

    if (processedImage) {
      return (
        <img
          src={processedImage}
          alt="Processed result"
          className="ip-preview"
        />
      );
    }

    return (
      <div className="ip-placeholder">
        <span className="ip-upload-icon">🎨</span>
        <p>Processed image will appear here</p>
      </div>
    );
  };

  return (
    <div className="image-processing">
      <header className="ip-header">
        <div>
          <h1>🖼️ AI Image Processing</h1>
          <p className="ip-subtitle">
            Remove background &amp; change clothing style using OpenAI
            gpt-image-1
          </p>
          <Link href="/" className="ip-back-link">
            Go back to Home
          </Link>
        </div>
        <button className="ip-reset-btn" onClick={resetAll}>
          Reset
        </button>
      </header>

      <div className="ip-controls">
        <div className="ip-style-input">
          <label htmlFor="styleDescription">Clothing Style Description</label>
          <input
            id="styleDescription"
            type="text"
            value={styleDescription}
            onChange={(e) => setStyleDescription(e.target.value)}
            placeholder='e.g. "elegant black tuxedo", "casual denim jacket with white t-shirt"'
            disabled={isProcessing}
          />
        </div>

        <div className="ip-style-input">
          <label htmlFor="aspectRatio">Aspect Ratio</label>
          <select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            disabled={isProcessing}
            className="ip-select"
          >
            <option value="3:4">3:4 (Portrait)</option>
            <option value="2:3">2:3 (Tall)</option>
          </select>
        </div>

        <div className="ip-style-input">
          <label htmlFor="style">Photography Style</label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            disabled={isProcessing}
            className="ip-select"
          >
            <option value="photorealistic">Photorealistic</option>
            <option value="artistic">Artistic</option>
            <option value="editorial">Editorial</option>
            <option value="fashion">Fashion</option>
          </select>
        </div>

        <div className="ip-style-input">
          <label htmlFor="lighting">Lighting</label>
          <select
            id="lighting"
            value={lighting}
            onChange={(e) => setLighting(e.target.value)}
            disabled={isProcessing}
            className="ip-select"
          >
            <option value="cinematic">Cinematic</option>
            <option value="moody">Moody</option>
            <option value="natural">Natural</option>
            <option value="studio">Studio</option>
          </select>
        </div>

        <div className="ip-style-input">
          <label htmlFor="quality">Quality</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            disabled={isProcessing}
            className="ip-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>

        <button
          className="ip-process-btn"
          onClick={processImage}
          disabled={!uploadedImage || !styleDescription.trim() || isProcessing}
        >
          {isProcessing ? "Processing..." : "Process Image"}
        </button>
      </div>

      {error && <div className="ip-error">{error}</div>}

      <main className="ip-panels">
        {/* Left Panel — Original Image */}
        <div className="ip-panel">
          <h2 className="ip-panel-title">Original Image</h2>
          {uploadedImage ? (
            <div
              className="ip-image-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <img
                src={uploadedImage}
                alt="Uploaded original"
                className="ip-preview"
              />
            </div>
          ) : (
            <button
              type="button"
              className="ip-image-area ip-upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="ip-placeholder">
                <span className="ip-upload-icon">📤</span>
                <p>Click or drag &amp; drop an image here</p>
                <p className="ip-hint">PNG, JPG, WEBP — max 10 MB</p>
              </div>
            </button>
          )}
          {uploadedImage && <p className="ip-file-name">{fileName}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleInputChange}
            hidden
          />
        </div>

        {/* Right Panel — Processed Image */}
        <div className="ip-panel">
          <h2 className="ip-panel-title">Processed Image</h2>
          <div className="ip-image-area">{renderProcessedContent()}</div>
          {processedImage && (
            <a
              href={processedImage}
              download="processed-image.png"
              className="ip-download-btn"
            >
              Download Result
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
