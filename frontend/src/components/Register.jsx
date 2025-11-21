import { useState } from 'react';
import './Register.css';

function Register({ onRegisterSuccess, onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate input
      if (!email || !password || !confirmPassword || !name) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Email không hợp lệ');
      }

      if (password.length < 8) {
        throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error('Mật khẩu phải chứa chữ hoa, chữ thường và số');
      }

      if (password !== confirmPassword) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }

      if (name.trim().length < 2) {
        throw new Error('Tên phải có ít nhất 2 ký tự');
      }

      // Sử dụng AWS Cognito register
      const { register } = await import('../services/auth');
      await register(email, password, name);

      setSuccess(true);
      
      // Chuyển về login sau 2 giây
      setTimeout(() => {
        if (onRegisterSuccess) {
          onRegisterSuccess({ email, name });
        }
      }, 2000);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-box">
          <div className="success-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
              <path d="M8 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Đăng ký thành công!</h2>
            <p>Vui lòng kiểm tra email để xác nhận tài khoản.</p>
            <p className="redirect-note">Đang chuyển về trang đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#6366f1"/>
            <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
          <h1>Đăng ký tài khoản</h1>
          <p>Tạo tài khoản mới để sử dụng ImageHub</p>
        </div>

        {error && (
          <div className="register-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Họ và tên</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

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

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <p className="password-hint">Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số</p>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
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

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Đã có tài khoản?{' '}
            <button onClick={onBackToLogin} className="link-btn">
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
