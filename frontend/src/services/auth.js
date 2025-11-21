/**
 * Authentication Service - Xử lý đăng nhập, đăng xuất, quản lý session với AWS Cognito Hosted UI
 */
import { signInWithRedirect, signOut, getCurrentUser as amplifyGetCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * Đăng nhập người dùng với Cognito Hosted UI
 * Chuyển hướng người dùng đến trang đăng nhập của Cognito
 * @returns {Promise<void>}
 */
export const loginWithHostedUI = async () => {
  try {
    await signInWithRedirect();
  } catch (error) {
    console.error('Login redirect error:', error);
    throw new Error(error.message || 'Không thể chuyển hướng đến trang đăng nhập');
  }
};

/**
 * Legacy login function - giữ lại để tương thích ngược nếu cần
 * Khuyến nghị sử dụng loginWithHostedUI() thay thế
 */
export const login = async () => {
  return loginWithHostedUI();
};

/**
 * Đăng xuất người dùng khỏi AWS Cognito
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Logout error:', error);
    // Vẫn xóa local storage ngay cả khi signOut lỗi
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    throw new Error(error.message || 'Đăng xuất thất bại');
  }
};

/**
 * Lấy thông tin user hiện tại từ AWS Cognito
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  try {
    const user = await amplifyGetCurrentUser();
    const session = await fetchAuthSession();
    
    // Lấy email từ ID token payload
    const idToken = session.tokens?.idToken;
    const email = idToken?.payload?.email || user.signInDetails?.loginId || '';
    
    const userData = {
      email: email,
      name: idToken?.payload?.name || email.split('@')[0],
      userId: user.userId
    };

    // Cập nhật localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    const token = idToken?.toString();
    if (token) {
      localStorage.setItem('authToken', token);
    }

    return userData;
  } catch (error) {
    // User chưa đăng nhập
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    return null;
  }
};

/**
 * Kiểm tra xem user đã đăng nhập chưa
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    await amplifyGetCurrentUser();
    return true;
  } catch {
    return false;
  }
};

/**
 * Lấy auth token từ AWS Cognito session
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Yêu cầu reset mật khẩu qua AWS Cognito
 * @param {string} email - Email người dùng
 * @returns {Promise<void>}
 */
export const forgotPassword = async (email) => {
  try {
    await resetPassword({ username: email });
    console.log('Password reset code sent to:', email);
  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error.name === 'UserNotFoundException') {
      throw new Error('Tài khoản không tồn tại');
    } else if (error.name === 'LimitExceededException') {
      throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
    }
    
    throw new Error(error.message || 'Gửi yêu cầu thất bại');
  }
};

/**
 * Xác nhận reset mật khẩu với code từ AWS Cognito
 * @param {string} email - Email người dùng
 * @param {string} code - Mã xác nhận từ email
 * @param {string} newPassword - Mật khẩu mới
 * @returns {Promise<void>}
 */
export const confirmForgotPassword = async (email, code, newPassword) => {
  try {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword: newPassword
    });
    console.log('Password reset successful for:', email);
  } catch (error) {
    console.error('Confirm forgot password error:', error);
    
    if (error.name === 'CodeMismatchException') {
      throw new Error('Mã xác nhận không đúng');
    } else if (error.name === 'ExpiredCodeException') {
      throw new Error('Mã xác nhận đã hết hạn');
    } else if (error.name === 'InvalidPasswordException') {
      throw new Error('Mật khẩu không đủ mạnh');
    }
    
    throw new Error(error.message || 'Đặt lại mật khẩu thất bại');
  }
};

/**
 * Đăng ký người dùng mới với AWS Cognito
 * @param {string} email - Email
 * @param {string} password - Mật khẩu
 * @param {string} name - Tên người dùng
 * @returns {Promise<Object>}
 */
export const register = async (email, password, name) => {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email,
      password: password,
      options: {
        userAttributes: {
          email: email,
          name: name
        }
      }
    });

    return {
      email: email,
      name: name,
      userId: userId,
      isSignUpComplete: isSignUpComplete,
      nextStep: nextStep
    };
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.name === 'UsernameExistsException') {
      throw new Error('Email đã được đăng ký');
    } else if (error.name === 'InvalidPasswordException') {
      throw new Error('Mật khẩu không đủ mạnh');
    } else if (error.name === 'InvalidParameterException') {
      throw new Error('Thông tin đăng ký không hợp lệ');
    }
    
    throw new Error(error.message || 'Đăng ký thất bại');
  }
};
