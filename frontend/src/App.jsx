import { useState, useEffect } from "react";
import "./App.css";
// Import các hàm xử lý ảnh của bạn (Giữ nguyên)
import { validateFile, processImage } from "./services/api";
import { createImagePreview, safeParseInt } from "./utils/helpers";

// --- 1. IMPORT THƯ VIỆN AMPLIFY ---
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils'; // Dùng để lắng nghe sự kiện đăng nhập
import '@aws-amplify/ui-react/styles.css';

function App() {
    // --- 2. STATE QUẢN LÝ NGƯỜI DÙNG ---
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false); // Biến bật/tắt popup

    // --- 3. LOGIC TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI ĐĂNG NHẬP ---
    useEffect(() => {
        checkUser(); // Kiểm tra ngay khi vào web

        // Lắng nghe sự kiện từ Amplify (Khi user đăng nhập/đăng xuất)
        const listener = Hub.listen('auth', (data) => {
            switch (data.payload.event) {
                case 'signedIn':
                    console.log('Đăng nhập thành công!');
                    checkUser();
                    setShowLogin(false); // Tắt popup ngay lập tức
                    break;
                case 'signedOut':
                    console.log('Đã đăng xuất');
                    setUser(null);
                    break;
            }
        });

        return () => listener(); // Dọn dẹp
    }, []);

    async function checkUser() {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (err) {
            setUser(null);
        }
    }

    async function handleSignOut() {
        await signOut();
        setUser(null);
    }

    // --- STATE CỦA ỨNG DỤNG XỬ LÝ ẢNH (GIỮ NGUYÊN) ---
    const [resizeWidth, setResizeWidth] = useState(800);
    const [resizeHeight, setResizeHeight] = useState(600);
    const [quality, setQuality] = useState(85);
    const [format, setFormat] = useState("jpeg");
    const [addWatermark, setAddWatermark] = useState(false);
    const [watermarkText, setWatermarkText] = useState("ImageHub");

    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [uploadedKey, setUploadedKey] = useState(null);

    // --- CÁC HÀM XỬ LÝ UI (GIỮ NGUYÊN) ---
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const validation = validateFile(file);
        if (!validation.valid) { setError(validation.error); return; }
        try {
            setSelectedImage(file);
            const preview = await createImagePreview(file);
            setImagePreview(preview); setProcessedImage(null); setError(null); setUploadedKey(null);
        } catch (err) { setError(err.message); }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const validation = validateFile(file);
        if (!validation.valid) { setError(validation.error); return; }
        try {
            setSelectedImage(file);
            const preview = await createImagePreview(file);
            setImagePreview(preview); setProcessedImage(null); setError(null); setUploadedKey(null);
        } catch (err) { setError(err.message); }
    };

    const handleDragOver = (e) => { e.preventDefault(); };

    const handleProcess = async () => {
        if (!selectedImage) return;
        setIsProcessing(true); setUploadProgress(0); setError(null);
        try {
            console.log("Bắt đầu xử lý ảnh...");
            const processedImageUrl = await processImage(
                {
                    file: selectedImage,
                    width: resizeWidth, height: resizeHeight, quality: quality,
                    format: format, watermark: addWatermark ? watermarkText : ""
                },
                { onProgress: setUploadProgress, onUploadKey: setUploadedKey }
            );
            setProcessedImage(processedImageUrl);
        } catch (err) {
            console.error("Lỗi:", err);
            setError(err.message || "Đã xảy ra lỗi");
            setUploadProgress(0);
        } finally { setIsProcessing(false); }
    };

    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement("a");
        link.href = processedImage;
        link.download = `processed_${Date.now()}.${format}`;
        link.click();
    };

    const handleReset = () => {
        setSelectedImage(null); setImagePreview(null); setProcessedImage(null);
        setUploadProgress(0); setError(null); setUploadedKey(null);
    };

    // --- GIAO DIỆN CHÍNH ---
    return (
        <div className="app">

            {/* 4. POPUP ĐĂNG NHẬP (Chỉ hiện khi biến showLogin = true) */}
            {showLogin && !user && (
                <div className="auth-modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="auth-modal-content" style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative',
                        maxWidth: '450px', width: '100%'
                    }}>
                        {/* Nút đóng popup */}
                        <button
                            onClick={() => setShowLogin(false)}
                            className="close-modal-btn"
                            style={{
                                position: 'absolute', top: '10px', right: '15px',
                                border: 'none', background: 'transparent',
                                fontSize: '2rem', cursor: 'pointer', color: '#666'
                            }}
                        >
                            &times;
                        </button>

                        {/* ĐÂY LÀ THẺ AUTHENTICATOR DUY NHẤT - NÓ NẰM TRONG POPUP */}
                        <Authenticator hideSignUp={false} />
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <rect width="32" height="32" rx="8" fill="#6366f1" />
                                <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                <circle cx="16" cy="16" r="3" fill="white" />
                            </svg>
                            <div>
                                <h1>ImageHub</h1>
                                <p className="tagline">Xử lý ảnh nhanh chóng & miễn phí</p>
                            </div>
                        </div>

                        {/* NÚT ĐĂNG NHẬP / PROFILE */}
                        <div className="user-menu">
                            {user ? (
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span className="user-email" style={{fontWeight: '500'}}>
                    {user.signInDetails?.loginId || user.username}
                  </span>
                                    <button onClick={handleSignOut} className="logout-btn" style={{
                                        padding: '8px 16px', backgroundColor: '#fee2e2', color: '#ef4444',
                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                    }}>
                                        Đăng xuất
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowLogin(true)}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '8px 20px', backgroundColor: '#4f46e5', color: 'white',
                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    Đăng nhập / Đăng ký
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content (LUÔN HIỆN) */}
            <main className="main">
                <div className="container">
                    {error && (
                        <div className="error-message">
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="close-error">×</button>
                        </div>
                    )}

                    {!selectedImage ? (
                        <div className="upload-area" onDrop={handleDrop} onDragOver={handleDragOver}>
                            {/* Icon SVG */}
                            <svg className="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <h2>Kéo thả ảnh vào đây</h2>
                            <p>hoặc</p>
                            <label className="btn btn-primary">
                                Chọn ảnh từ máy tính
                                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                            </label>

                            {/* THÔNG BÁO KHUYẾN KHÍCH ĐĂNG NHẬP */}
                            {!user && (
                                <div style={{marginTop: '20px', padding: '10px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fdba74', color: '#c2410c'}}>
                                    <span role="img" aria-label="info">💡</span>
                                    <strong> Mẹo:</strong> Bạn đang dùng chế độ Khách. Ảnh sẽ bị xóa sau 24h.
                                    <br/>Hãy <a href="#" onClick={(e) => {e.preventDefault(); setShowLogin(true)}} style={{color: '#ea580c', textDecoration: 'underline'}}>Đăng nhập</a> để lưu ảnh vĩnh viễn!
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="workspace">
                            {/* ... (PHẦN GIAO DIỆN CHỈNH SỬA ẢNH GIỮ NGUYÊN NHƯ CŨ) ... */}
                            <div className="image-section">
                                <div className="image-container">
                                    <h3>Ảnh gốc</h3>
                                    <img src={imagePreview} alt="Original" className="preview-image" />
                                    <div className="image-info">
                                        <span>{selectedImage.name}</span>
                                        <span>{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                </div>
                                {processedImage && (
                                    <div className="image-container">
                                        <h3>Ảnh đã xử lý</h3>
                                        <img src={processedImage} alt="Processed" className="preview-image" />
                                    </div>
                                )}
                            </div>

                            <div className="options-panel">
                                <h3>Tùy chọn xử lý</h3>
                                <div className="option-group">
                                    <label>Kích thước (px)</label>
                                    <div className="size-inputs">
                                        <input type="number" value={resizeWidth} onChange={(e) => setResizeWidth(safeParseInt(e.target.value, 800))} placeholder="Rộng" />
                                        <span>×</span>
                                        <input type="number" value={resizeHeight} onChange={(e) => setResizeHeight(safeParseInt(e.target.value, 600))} placeholder="Cao" />
                                    </div>
                                </div>
                                <div className="option-group">
                                    <label>Chất lượng: {quality}%</label>
                                    <input type="range" min="1" max="100" value={quality} onChange={(e) => setQuality(safeParseInt(e.target.value, 85))} className="slider" />
                                </div>
                                <div className="option-group">
                                    <label>Định dạng</label>
                                    <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                        <option value="jpeg">JPEG</option>
                                        <option value="png">PNG</option>
                                        <option value="webp">WebP</option>
                                    </select>
                                </div>
                                <div className="option-group">
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={addWatermark} onChange={(e) => setAddWatermark(e.target.checked)} />
                                        <span>Thêm watermark</span>
                                    </label>
                                    {addWatermark && (
                                        <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="Nội dung watermark" className="watermark-input" />
                                    )}
                                </div>

                                <div className="action-buttons">
                                    <button className="btn btn-secondary" onClick={handleReset} disabled={isProcessing}>Chọn ảnh khác</button>
                                    {!processedImage ? (
                                        <button className="btn btn-primary" onClick={handleProcess} disabled={isProcessing}>
                                            {isProcessing ? "Đang xử lý..." : "Xử lý ảnh"}
                                        </button>
                                    ) : (
                                        <button className="btn btn-success" onClick={handleDownload}>Tải xuống</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>© 2025 ImageHub</p>
                </div>
            </footer>
        </div>
    );
}

export default App;