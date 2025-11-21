import { useState } from 'react';
import './ForgotPassword.css';

function ForgotPassword({ onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: email, 2: code & new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email) {
        throw new Error('Vui lòng nhập email');
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Email không hợp lệ');
      }

      // Sử dụng AWS Cognito forgotPassword
      const { forgotPassword } = await import('../services/auth');
      await forgotPassword(email);

      setStep(2);
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!code || !newPassword || !confirmPassword) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }

      if (newPassword.length < 8) {
        throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('Mật khẩu phải chứa chữ hoa, chữ thường và số');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }

      // Sử dụng AWS Cognito confirmForgotPassword
      const { confirmForgotPassword } = await import('../services/auth');
      await confirmForgotPassword(email, code, newPassword);

      setSuccess(true);
      
      // Chuyển về login sau 2 giây
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-box">
          <div className="success-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
              <path d="M8 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Đặt lại mật khẩu thành công!</h2>
            <p>Bạn có thể đăng nhập với mật khẩu mới.</p>
            <p className="redirect-note">Đang chuyển về trang đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <div className="forgot-password-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
          <h1>Quên mật khẩu</h1>
          <p>
            {step === 1 
              ? 'Nhập email để nhận mã xác nhận' 
              : 'Nhập mã xác nhận và mật khẩu mới'}
          </p>
        </div>

        {error && (
          <div className="forgot-password-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <button type="submit" className="forgot-password-btn" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="forgot-password-form">
            <div className="info-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#3b82f6"/>
              </svg>
              <p>Mã xác nhận đã được gửi đến email <strong>{email}</strong></p>
            </div>

            <div className="form-group">
              <label htmlFor="code">Mã xác nhận</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Nhập mã từ email"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="password-hint">Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số</p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="forgot-password-btn" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>

            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="back-btn"
              disabled={isLoading}
            >
              ← Quay lại
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <p>
            <button onClick={onBackToLogin} className="link-btn">
              ← Quay về đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
