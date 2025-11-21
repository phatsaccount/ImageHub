# Hướng dẫn tích hợp Authentication với AWS Cognito

## Hiện trạng

Hiện tại app đã có giao diện đăng nhập và logic xử lý cơ bản (mock) trong:
- `src/components/Login.jsx` - Giao diện đăng nhập
- `src/services/auth.js` - Logic authentication (đang dùng mock)

## Cách tích hợp AWS Cognito

### Bước 1: Cài đặt AWS Amplify

```bash
cd frontend
npm install aws-amplify @aws-amplify/ui-react
```

### Bước 2: Tạo User Pool trên AWS Cognito

1. Truy cập AWS Console → Cognito → Create User Pool
2. Cấu hình:
   - Sign-in options: Email
   - Password policy: Tùy chỉnh theo nhu cầu
   - MFA: Tùy chọn (khuyến nghị bật)
   - User account recovery: Email
   - Required attributes: email, name
3. Tạo App client:
   - App type: Public client
   - Lưu lại: User Pool ID, App Client ID, AWS Region

### Bước 3: Cấu hình Amplify

Tạo file `src/aws-exports.js`:

```javascript
const awsconfig = {
  Auth: {
    region: 'ap-southeast-1', // Thay bằng region của bạn
    userPoolId: 'ap-southeast-1_XXXXXXXXX', // User Pool ID
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // App Client ID
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  }
};

export default awsconfig;
```

Hoặc thêm vào `.env`:

```env
VITE_AWS_REGION=ap-southeast-1
VITE_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
VITE_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Bước 4: Khởi tạo Amplify trong App

Cập nhật `src/main.jsx`:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify'
import awsconfig from './aws-exports'

Amplify.configure(awsconfig)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Bước 5: Cập nhật auth.js để dùng AWS Cognito

Thay thế nội dung mock trong `src/services/auth.js`:

```javascript
import { Auth } from 'aws-amplify';

export const login = async (email, password) => {
  try {
    const user = await Auth.signIn(email, password);
    return {
      user: {
        email: user.attributes.email,
        name: user.attributes.name || email.split('@')[0],
        sub: user.attributes.sub
      },
      token: user.signInUserSession.idToken.jwtToken
    };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Đăng nhập thất bại');
  }
};

export const logout = async () => {
  try {
    await Auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser();
    return {
      email: user.attributes.email,
      name: user.attributes.name,
      sub: user.attributes.sub
    };
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = async () => {
  try {
    await Auth.currentAuthenticatedUser();
    return true;
  } catch {
    return false;
  }
};

export const forgotPassword = async (email) => {
  try {
    await Auth.forgotPassword(email);
  } catch (error) {
    console.error('Forgot password error:', error);
    throw new Error(error.message || 'Gửi yêu cầu thất bại');
  }
};

export const confirmForgotPassword = async (email, code, newPassword) => {
  try {
    await Auth.forgotPasswordSubmit(email, code, newPassword);
  } catch (error) {
    console.error('Confirm forgot password error:', error);
    throw new Error(error.message || 'Đặt lại mật khẩu thất bại');
  }
};

export const register = async (email, password, name) => {
  try {
    const { user } = await Auth.signUp({
      username: email,
      password: password,
      attributes: {
        email: email,
        name: name
      }
    });
    return user;
  } catch (error) {
    console.error('Register error:', error);
    throw new Error(error.message || 'Đăng ký thất bại');
  }
};
```

### Bước 6: Cập nhật API calls để gửi token

Cập nhật `src/services/api.js` để thêm Authorization header:

```javascript
import { getAuthToken } from './auth';

export const getPresignedUrl = async (params) => {
  const token = await getAuthToken();
  
  const response = await fetch(API_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Thêm token vào header
    },
    body: JSON.stringify(params)
  })

  // ... rest of code
}
```

### Bước 7: Bảo mật API Gateway với Cognito Authorizer

1. Vào API Gateway → Authorizers → Create Authorizer
2. Chọn Cognito User Pool
3. Chọn User Pool vừa tạo
4. Token source: Authorization
5. Gán authorizer vào routes cần bảo vệ

## Tính năng bổ sung

### Forgot Password Flow

Tạo component `ForgotPassword.jsx`:

```javascript
import { useState } from 'react';
import { forgotPassword, confirmForgotPassword } from '../services/auth';

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1); // 1: email, 2: code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await confirmForgotPassword(email, code, newPassword);
      alert('Đặt lại mật khẩu thành công!');
      onBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ... render UI
}
```

### Register Flow

Tương tự tạo component `Register.jsx` sử dụng `register()` từ `auth.js`.

## Testing

### Test local trước khi deploy:

```bash
npm run dev
```

### Test với Cognito:

1. Tạo user test trên Cognito Console
2. Thử đăng nhập với user test
3. Kiểm tra token trong Network tab (DevTools)
4. Verify API calls có gửi Authorization header

## Deploy lên AWS Amplify

Sau khi cấu hình xong:

```bash
npm run build
```

Deploy `dist/` lên Amplify hoặc S3:

```bash
# Với Amplify CLI
amplify publish

# Hoặc S3
aws s3 sync dist/ s3://your-bucket-name --delete
```

## Troubleshooting

### CORS với Cognito
- Thêm domain Amplify vào API Gateway CORS allowed origins
- Thêm Authorization vào allowed headers

### Token expiration
- Implement refresh token logic
- Tự động đăng xuất khi token hết hạn

### Error: "User does not exist"
- Verify user đã được tạo trong User Pool
- Kiểm tra email/username matching

## Security Best Practices

1. ✅ Dùng HTTPS cho production
2. ✅ Enable MFA cho Cognito
3. ✅ Set token expiration phù hợp (default: 1h)
4. ✅ Không lưu token trong localStorage lâu dài
5. ✅ Implement proper error handling
6. ✅ Rate limiting trên API Gateway
7. ✅ CloudWatch logging cho audit trail

## Resources

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/)
- [Amplify UI Components](https://ui.docs.amplify.aws/)
