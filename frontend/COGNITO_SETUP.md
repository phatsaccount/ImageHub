# Hướng dẫn Setup AWS Cognito cho ImageHub

## Bước 1: Tạo User Pool trên AWS Cognito

### 1.1. Truy cập AWS Console
- Vào AWS Console → Services → Cognito
- Chọn "Create user pool"

### 1.2. Cấu hình Sign-in
- **Provider types**: Cognito user pool
- **Cognito user pool sign-in options**: 
  - ✅ Email
- Click "Next"

### 1.3. Cấu hình Security
- **Password policy**: Custom (hoặc Cognito defaults)
  - Minimum length: 8
  - Require lowercase: Yes
  - Require uppercase: Yes
  - Require numbers: Yes
  - Require special characters: Optional
- **Multi-factor authentication**: Optional (có thể bật sau)
- **User account recovery**: Email only
- Click "Next"

### 1.4. Cấu hình Sign-up
- **Self-service sign-up**: Enable
- **Attribute verification**: 
  - ✅ Send email message, verify email address
- **Required attributes**:
  - ✅ email
  - ✅ name
- Click "Next"

### 1.5. Cấu hình Message delivery
- **Email provider**: Send email with Amazon SES (hoặc Cognito default cho test)
- **FROM email address**: no-reply@verificationemail.com (nếu dùng Cognito default)
- Click "Next"

### 1.6. Integrate your app
- **User pool name**: `imagehub-user-pool` (hoặc tên bạn chọn)
- **Hosted authentication pages**: Don't use
- **App type**: Public client
- **App client name**: `imagehub-web-client`
- **Client secret**: Don't generate
- **Authentication flows**: 
  - ✅ ALLOW_USER_SRP_AUTH
  - ✅ ALLOW_REFRESH_TOKEN_AUTH
- Click "Next"

### 1.7. Review and create
- Kiểm tra lại cấu hình
- Click "Create user pool"

## Bước 2: Lấy thông tin cấu hình

Sau khi tạo xong User Pool:

### 2.1. Lấy User Pool ID
- Vào User Pool vừa tạo
- Tab "User pool overview"
- Copy **User pool ID** (dạng: `ap-southeast-1_xxxxxxxxx`)

### 2.2. Lấy App Client ID
- Tab "App integration"
- Scroll xuống phần "App clients and analytics"
- Click vào app client vừa tạo
- Copy **Client ID** (dạng: `1a2b3c4d5e6f7g8h9i0j1k2l3m`)

### 2.3. Xác nhận Region
- Region hiển thị trong User Pool ID (vd: `ap-southeast-1`)

## Bước 3: Cấu hình Frontend

### 3.1. Cập nhật file .env

Mở file `frontend/.env` và điền thông tin:

```env
# AWS Cognito Configuration
VITE_AWS_REGION=ap-southeast-1
VITE_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m

# AWS API Gateway URL (giữ nguyên)
VITE_API_GATEWAY_URL=https://8rzkjedi72.execute-api.ap-southeast-1.amazonaws.com/v1/upload-url

# CloudFront URL (giữ nguyên)
VITE_CLOUDFRONT_URL=https://d14vg5o4yx9zqx.cloudfront.net
```

### 3.2. Restart dev server

```powershell
# Stop server hiện tại (Ctrl+C)
# Chạy lại
npm run dev
```

## Bước 4: Test Authentication

### 4.1. Tạo user test trên Cognito Console

- Vào User Pool → Users
- Click "Create user"
- Chọn "Send an email invitation"
- Nhập:
  - Email: test@example.com
  - Temporary password: TempPass123!
  - Mark email as verified: Yes
- Click "Create user"

### 4.2. Test trên frontend

1. Truy cập `http://localhost:3001`
2. Đăng nhập với:
   - Email: test@example.com
   - Password: TempPass123!
3. Nếu yêu cầu đổi password → nhập password mới
4. Đăng nhập thành công → vào màn hình chính

### 4.3. Test Forgot Password

1. Click "Quên mật khẩu?"
2. Nhập email
3. Kiểm tra email → nhận code xác nhận
4. Nhập code và mật khẩu mới
5. Đăng nhập với mật khẩu mới

## Bước 5: Bảo mật API Gateway với Cognito Authorizer

### 5.1. Tạo Authorizer

- Vào API Gateway → Authorizers
- Click "Create Authorizer"
- Cấu hình:
  - Name: `CognitoAuthorizer`
  - Type: Cognito
  - Cognito User Pool: Chọn user pool vừa tạo
  - Token Source: `Authorization`
  - Token validation: (để mặc định)
- Save

### 5.2. Gán Authorizer cho routes

- Vào Routes (hoặc Resources cho REST API)
- Chọn route cần bảo vệ (vd: POST /upload-url)
- Attach authorization: Chọn `CognitoAuthorizer`
- Deploy API

### 5.3. Test với token

API sẽ yêu cầu header:
```
Authorization: Bearer <JWT_TOKEN>
```

Frontend đã tự động thêm header này khi gọi API.

## Bước 6: Cấu hình CORS cho API Gateway

Đảm bảo API Gateway cho phép:
- **Allowed Origins**: `https://your-amplify-domain.com` hoặc `*` (dev only)
- **Allowed Headers**: `Content-Type, Authorization`
- **Allowed Methods**: `POST, OPTIONS`

## Bước 7: Deploy lên AWS Amplify

### 7.1. Build production

```powershell
npm run build
```

### 7.2. Deploy với Amplify

```bash
# Nếu chưa có amplify app
amplify init
amplify add hosting
amplify publish

# Hoặc push code lên GitHub và connect với Amplify Console
```

### 7.3. Cấu hình Environment Variables trên Amplify

- Vào Amplify Console → App Settings → Environment variables
- Thêm:
  - `VITE_AWS_REGION`
  - `VITE_USER_POOL_ID`
  - `VITE_USER_POOL_CLIENT_ID`
  - `VITE_API_GATEWAY_URL`
  - `VITE_CLOUDFRONT_URL`
- Redeploy app

## Troubleshooting

### Lỗi: "User does not exist"
- Kiểm tra user đã được tạo trong User Pool
- Verify email đã được mark as verified

### Lỗi: "NotAuthorizedException"
- Kiểm tra password đúng
- Nếu là temporary password, cần đổi password trước

### Lỗi: "UserNotConfirmedException"
- User chưa verify email
- Vào Cognito Console → Users → Confirm user manually

### Lỗi CORS
- Kiểm tra API Gateway CORS settings
- Thêm `Authorization` vào allowed headers
- Thêm domain Amplify vào allowed origins

### Token expired
- Token mặc định hết hạn sau 1 giờ
- Implement refresh token logic nếu cần session dài hơn

## Best Practices

1. ✅ Bật MFA cho production
2. ✅ Dùng custom domain thay vì Cognito hosted UI
3. ✅ Set password policy mạnh
4. ✅ Enable advanced security features
5. ✅ Monitor với CloudWatch
6. ✅ Backup user pool configuration
7. ✅ Use environment-specific user pools (dev/staging/prod)

## Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Amplify Auth](https://docs.amplify.aws/gen1/javascript/build-a-backend/auth/)
- [Cognito Pricing](https://aws.amazon.com/cognito/pricing/)
