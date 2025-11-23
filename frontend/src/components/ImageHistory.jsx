import { useState, useEffect } from 'react';
import { getImageHistory } from '../services/api';
import { getCurrentUser } from '../services/auth';
import './ImageHistory.css';

function ImageHistory({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy userId từ getCurrentUser() giống như trong processImage
      const currentUser = await getCurrentUser();
      const fetchedUserId = currentUser?.userId || 'temp';
      setUserId(fetchedUserId);
      
      const data = await getImageHistory(fetchedUserId, 50);
      console.log('History data received:', data);
      console.log('History items:', data.items);
      setHistory(data.items || []);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch sử ảnh');
      console.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `imagehub_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Lịch sử chỉnh sửa ảnh
          </h2>
          <button onClick={onClose} className="close-btn" aria-label="Đóng">&times;</button>
        </div>

        {loading && (
          <div className="history-loading">
            <div className="spinner-large"></div>
            <p>Đang tải lịch sử...</p>
          </div>
        )}

        {error && (
          <div className="history-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <p>{error}</p>
            <button onClick={loadHistory} className="retry-btn">Thử lại</button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="history-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Chưa có lịch sử chỉnh sửa ảnh</p>
            <span>Các ảnh bạn xử lý sẽ được lưu lại tại đây</span>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="history-grid">
            {history.map((item, index) => (
              <div key={`${item.userId}-${item.timestamp}-${index}`} className="history-item">
                <div className="history-image-container" onClick={() => setSelectedImage(item)}>
                  {item.processedUrl ? (
                    <img 
                      src={item.processedUrl} 
                      alt={`Processed ${item.timestamp}`}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd"/><text x="50%" y="50%" fill="%23999" text-anchor="middle">No Image</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="no-image">Không có ảnh</div>
                  )}
                  <div className="history-overlay">
                    <button className="view-btn" aria-label="Xem ảnh">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Xem
                    </button>
                  </div>
                </div>
                <div className="history-info">
                  {item.metadata && (
                    <div className="history-metadata">
                      {item.metadata.width && item.metadata.height && (
                        <span>{item.metadata.width}x{item.metadata.height}</span>
                      )}
                      {item.metadata.format && (
                        <span className="format-badge">{item.metadata.format.toUpperCase()}</span>
                      )}
                      {item.metadata.quality && (
                        <span>Q: {item.metadata.quality}</span>
                      )}
                    </div>
                  )}
                  {item.processedUrl && (
                    <button 
                      onClick={() => handleDownload(item.processedUrl)}
                      className="download-btn-small"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Tải xuống
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal xem ảnh phóng to */}
        {selectedImage && selectedImage.processedUrl && (
          <div className="image-preview-modal" onClick={() => setSelectedImage(null)}>
            <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedImage(null)} 
                className="close-preview-btn"
                aria-label="Đóng preview"
              >
                &times;
              </button>
              <img src={selectedImage.processedUrl} alt="Preview" />
              <div className="preview-actions">
                <button 
                  onClick={() => handleDownload(selectedImage.processedUrl, selectedImage.timestamp)}
                  className="download-btn-large"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Tải xuống
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageHistory;
