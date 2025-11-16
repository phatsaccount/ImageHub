import { useState } from "react";
import "./App.css";
import { validateFile, processImage } from "./services/api";
import { createImagePreview, safeParseInt } from "./utils/helpers";

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedKey, setUploadedKey] = useState(null);

  // Processing options
  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(600);
  const [quality, setQuality] = useState(85);
  const [format, setFormat] = useState("jpeg");
  const [addWatermark, setAddWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("ImageHub");

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setSelectedImage(file);
      const preview = await createImagePreview(file);
      setImagePreview(preview);
      setProcessedImage(null);
      setError(null);
      setUploadedKey(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setSelectedImage(file);
      const preview = await createImagePreview(file);
      setImagePreview(preview);
      setProcessedImage(null);
      setError(null);
      setUploadedKey(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /**
   * Hàm chính xử lý toàn bộ luồng upload và processing
   */
  const handleProcess = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log("Bắt đầu xử lý ảnh...");
      
      const processedImageUrl = await processImage(
        {
          file: selectedImage,
          width: resizeWidth,
          height: resizeHeight,
          quality: quality,
          format: format,
          watermark: addWatermark ? watermarkText : ""
        },
        {
          onProgress: setUploadProgress,
          onUploadKey: setUploadedKey
        }
      );

      setProcessedImage(processedImageUrl);
      console.log("Hoàn tất! URL ảnh đã xử lý:", processedImageUrl);
    } catch (err) {
      console.error("Lỗi khi xử lý ảnh:", err);
      setError(err.message || "Đã xảy ra lỗi khi xử lý ảnh");
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = `processed_${Date.now()}.${format}`;
    link.click();
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessedImage(null);
    setUploadProgress(0);
    setError(null);
    setUploadedKey(null);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366f1" />
              <path
                d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="16" r="3" fill="white" />
            </svg>
            <h1>ImageHub</h1>
          </div>
          <p className="tagline">Xử lý ảnh nhanh chóng & miễn phí</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Error Message */}
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="close-error">
                ×
              </button>
            </div>
          )}

          {/* Upload Section */}
          {!selectedImage ? (
            <div
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <svg
                className="upload-icon"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="17 8 12 3 7 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="12"
                  y1="3"
                  x2="12"
                  y2="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2>Kéo thả ảnh vào đây</h2>
              <p>hoặc</p>
              <label className="btn btn-primary">
                Chọn ảnh từ máy tính
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
              </label>
              <p className="upload-hint">
                Hỗ trợ: JPG, PNG, WEBP (Tối đa 10MB)
              </p>
            </div>
          ) : (
            <div className="workspace">
              {/* Image Preview Section */}
              <div className="image-section">
                <div className="image-container">
                  <h3>Ảnh gốc</h3>
                  <img
                    src={imagePreview}
                    alt="Original"
                    className="preview-image"
                  />
                  <div className="image-info">
                    <span>{selectedImage.name}</span>
                    <span>
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                {processedImage && (
                  <div className="arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                {processedImage && (
                  <div className="image-container">
                    <h3>Ảnh đã xử lý</h3>
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="preview-image"
                    />
                    <div className="image-info">
                      <span>
                        processed_{Date.now()}.{format}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Processing Options */}
              <div className="options-panel">
                <h3>Tùy chọn xử lý</h3>

                <div className="option-group">
                  <label>Kích thước (px)</label>
                  <div className="size-inputs">
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(safeParseInt(e.target.value, 800))}
                      placeholder="Chiều rộng"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(safeParseInt(e.target.value, 600))}
                      placeholder="Chiều cao"
                    />
                  </div>
                </div>

                <div className="option-group">
                  <label>Chất lượng: {quality}%</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(safeParseInt(e.target.value, 85))}
                    className="slider"
                  />
                </div>

                <div className="option-group">
                  <label>Định dạng</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>

                <div className="option-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={addWatermark}
                      onChange={(e) => setAddWatermark(e.target.checked)}
                    />
                    <span>Thêm watermark</span>
                  </label>
                  {addWatermark && (
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Nội dung watermark"
                      className="watermark-input"
                    />
                  )}
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={isProcessing}
                  >
                    Chọn ảnh khác
                  </button>

                  {!processedImage ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleProcess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Đang xử lý..." : "Xử lý ảnh"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      onClick={handleDownload}
                    >
                      Tải xuống
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2025 ImageHub - Serverless Image Processing System</p>
          <p className="tech-stack">Powered by AWS Lambda, S3 & CloudFront</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
