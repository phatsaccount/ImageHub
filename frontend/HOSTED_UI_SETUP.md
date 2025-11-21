# Hướng Dẫn Cấu Hình AWS Cognito Hosted UI

## Tổng Quan

Ứng dụng hiện đã được chuyển đổi để sử dụng **AWS Cognito Hosted UI** - một giải pháp đăng nhập được AWS quản lý hoàn toàn với giao diện đăng nhập có sẵn, bảo mật cao và dễ dàng tích hợp.

## Lợi Ích của Hosted UI

✅ **Bảo mật cao hơn**: Mật khẩu không bao giờ đi qua frontend của bạn  
✅ **Dễ bảo trì**: AWS quản lý UI, cập nhật bảo mật tự động  
✅ **Hỗ trợ MFA**: Tích hợp sẵn xác thực 2 yếu tố  
✅ **Social Login**: Dễ dàng thêm Google, Facebook, Amazon login  
✅ **Tuân thủ chuẩn**: OAuth 2.0 và OpenID Connect  

## Các Bước Cấu Hình

### 1. Cấu Hình Cognito User Pool

#### 1.1. Tạo/Cập Nhật App Client

1. Truy cập **AWS Cognito Console**
2. Chọn User Pool của bạn
3. Vào **App integration** → **App clients**
4. Tạo mới hoặc chỉnh sửa App client hiện có:

**Cấu hình quan trọng:**

```
App type: Public client
App client name: imagehub-client (hoặc tên bạn chọn)

Authentication flows:
☑ ALLOW_USER_SRP_AUTH
☑ ALLOW_REFRESH_TOKEN_AUTH

Hosted UI settings:
Allowed callback URLs:
  - http://localhost:5173/
  - https://your-production-domain.com/

Allowed sign-out URLs:
  - http://localhost:5173/
  - https://your-production-domain.com/

Identity providers:
☑ Cognito user pool

OAuth 2.0 grant types:
☑ Authorization code grant

OpenID Connect scopes:
☑ Email
☑ OpenID
☑ Profile
```

#### 1.2. Cấu Hình Cognito Domain

1. Trong **App integration** → **Domain**
2. Chọn một trong hai:
   - **Cognito domain**: `your-app-name.auth.ap-southeast-1.amazoncognito.com`
   - **Custom domain**: `auth.your-domain.com` (yêu cầu SSL certificate)

### 2. Cập Nhật File .env

Sao chép `.env.example` thành `.env` và điền các giá trị:

```env
# API Gateway và CloudFront (giữ nguyên)
VITE_API_GATEWAY_URL=https://your-api-gateway-url
VITE_CLOUDFRONT_URL=https://your-cloudfront-url

# Cognito Configuration
VITE_AWS_REGION=ap-southeast-1
VITE_USER_POOL_ID=ap-southeast-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=1234567890abcdefghijklmnop

# Hosted UI Settings (MỚI)
VITE_COGNITO_DOMAIN=your-app-name.auth.ap-southeast-1.amazoncognito.com
VITE_REDIRECT_SIGN_IN=http://localhost:5173/
VITE_REDIRECT_SIGN_OUT=http://localhost:5173/
```

### 3. Lấy Thông Tin Cấu Hình

#### Lấy User Pool ID và Client ID

```bash
# Liệt kê User Pools
aws cognito-idp list-user-pools --max-results 10 --region ap-southeast-1

# Lấy App Client ID
aws cognito-idp list-user-pool-clients \
  --user-pool-id ap-southeast-1_xxxxxxxxx \
  --region ap-southeast-1
```

#### Lấy Cognito Domain

```bash
# Kiểm tra domain hiện tại
aws cognito-idp describe-user-pool \
  --user-pool-id ap-southeast-1_xxxxxxxxx \
  --region ap-southeast-1 \
  --query 'UserPool.Domain'
```

### 4. Test Hosted UI

Sau khi cấu hình xong, bạn có thể test Hosted UI trực tiếp:

```
https://YOUR_COGNITO_DOMAIN/login?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:5173/
```

Ví dụ:
```
https://imagehub.auth.ap-southeast-1.amazoncognito.com/login?client_id=abc123&response_type=code&redirect_uri=http://localhost:5173/
```

## Luồng Hoạt Động

### Luồng Đăng Nhập

```
1. User clicks "Đăng nhập với AWS Cognito"
   ↓
2. Redirect đến Cognito Hosted UI
   URL: https://YOUR_DOMAIN.auth.region.amazoncognito.com/login
   ↓
3. User nhập email/password trên trang Cognito
   ↓
4. Cognito xác thực và redirect về app với authorization code
   URL: http://localhost:5173/?code=abc123...
   ↓
5. AWS Amplify tự động đổi code lấy tokens
   ↓
6. App kiểm tra và lấy thông tin user
   ↓
7. User đăng nhập thành công
```

### Luồng Đăng Xuất

```
1. User clicks "Đăng xuất"
   ↓
2. App gọi signOut() 
   ↓
3. Cognito xóa session và redirect về app
   URL: http://localhost:5173/
   ↓
4. User về trang login
```

## Code Changes

### Thay Đổi Chính

1. **aws-config.js**: Thêm cấu hình OAuth
2. **auth.js**: Thay `signIn()` bằng `signInWithRedirect()`
3. **Login.jsx**: Thay form bằng button redirect
4. **App.jsx**: Thêm xử lý OAuth callback

### API Đã Thay Đổi

**Trước:**
```javascript
import { login } from './services/auth';
await login(email, password);
```

**Sau:**
```javascript
import { loginWithHostedUI } from './services/auth';
await loginWithHostedUI(); // Tự động redirect
```

## Troubleshooting

### Lỗi: "Invalid redirect_uri"

**Nguyên nhân**: URL callback không khớp với cấu hình trong Cognito

**Giải pháp**:
1. Kiểm tra `VITE_REDIRECT_SIGN_IN` trong `.env`
2. Đảm bảo URL đã được thêm vào "Allowed callback URLs" trong App client
3. URL phải khớp CHÍNH XÁC (bao gồm cả trailing slash)

### Lỗi: "User pool client does not exist"

**Nguyên nhân**: Client ID không đúng hoặc không tồn tại

**Giải pháp**:
```bash
# Kiểm tra lại Client ID
aws cognito-idp describe-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-id YOUR_CLIENT_ID
```

### Lỗi: OAuth callback không hoạt động

**Nguyên nhân**: App không xử lý code trong URL

**Giải pháp**: Code đã được cập nhật trong `App.jsx` để tự động xử lý

### Lỗi: "Domain is not configured"

**Nguyên nhân**: Chưa cấu hình Cognito domain

**Giải pháp**:
1. Vào Cognito Console → App integration → Domain
2. Tạo Cognito domain hoặc custom domain
3. Cập nhật `VITE_COGNITO_DOMAIN` trong `.env`

## Customization (Tùy Chọn)

### Tùy Chỉnh Giao Diện Hosted UI

1. Trong Cognito Console → **App integration** → **Branding**
2. Upload logo, thay đổi màu sắc, CSS tùy chỉnh

### Thêm Social Login

1. Trong **App integration** → **Federated identity providers**
2. Cấu hình Google, Facebook, hoặc SAML
3. Thêm provider vào App client settings

### Thêm MFA (Multi-Factor Authentication)

1. Trong **Sign-in experience** → **Multi-factor authentication**
2. Bật SMS hoặc TOTP
3. Cấu hình trong User Pool settings

## Production Deployment

### Cập Nhật Callback URLs

Trước khi deploy production, thêm production URLs:

```
Allowed callback URLs:
- http://localhost:5173/
- https://app.your-domain.com/
- https://your-domain.com/

Allowed sign-out URLs:
- http://localhost:5173/
- https://app.your-domain.com/
- https://your-domain.com/
```

### Environment Variables

Tạo file `.env.production`:

```env
VITE_COGNITO_DOMAIN=your-app.auth.ap-southeast-1.amazoncognito.com
VITE_REDIRECT_SIGN_IN=https://your-domain.com/
VITE_REDIRECT_SIGN_OUT=https://your-domain.com/
```

### Build và Deploy

```bash
# Build với production env
npm run build

# Deploy frontend lên S3/CloudFront
# ... deployment commands
```

## Tài Liệu Tham Khảo

- [AWS Cognito Hosted UI Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)
- [AWS Amplify Auth Documentation](https://docs.amplify.aws/react/build-a-backend/auth/)
- [OAuth 2.0 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)

## Support

Nếu gặp vấn đề, kiểm tra:

1. ✅ Tất cả biến môi trường trong `.env` đã đúng
2. ✅ Callback URLs trong Cognito đã được cấu hình
3. ✅ App client có đúng OAuth scopes
4. ✅ Cognito domain đã được tạo và active
5. ✅ Browser console để xem error messages

---

**Lưu ý**: Sau khi cấu hình xong, restart development server:
```bash
npm run dev
```
