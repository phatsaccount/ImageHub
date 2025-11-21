import { useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess, onForgotPassword, onRegister }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleHostedUILogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Chuyển hướng đến Cognito Hosted UI
      const { loginWithHostedUI } = await import('../services/auth');
      await loginWithHostedUI();
      // Sau khi redirect, user sẽ quay lại trang này và được xử lý trong App.jsx
    } catch (err) {
      setError(err.message || 'Không thể chuyển hướng đến trang đăng nhập');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
          <h1>ImageHub</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>

        {error && (
          <div className="login-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="login-form">
          <button 
            onClick={handleHostedUILogin} 
            className="login-btn hosted-ui-btn" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Đang chuyển hướng...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
                Đăng nhập với AWS Cognito
              </>
            )}
          </button>

          <div className="divider">
            <span>hoặc</span>
          </div>

          <div className="alternative-actions">
            <p className="info-text">
              Bạn sẽ được chuyển đến trang đăng nhập an toàn của AWS Cognito.
              Tại đó bạn có thể đăng nhập hoặc đăng ký tài khoản mới.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
