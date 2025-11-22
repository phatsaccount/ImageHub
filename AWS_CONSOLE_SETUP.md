# Hướng dẫn Triển khai Chức năng Lịch sử Ảnh
## (Setup qua AWS Console - Không dùng code)

## 📋 Tổng quan
Tài liệu này hướng dẫn bạn setup chức năng xem lịch sử ảnh đã chỉnh sửa thông qua AWS Console, phù hợp cho việc deploy bằng AWS Amplify.

---

## 🏗️ Kiến trúc

```
User (đã đăng nhập)
    ↓
Frontend (Amplify) → API Gateway → Lambda Functions → DynamoDB
    ↓                                      ↓
    └────────────────────────────── S3 (Presigned URLs)
```

---

## 📝 Bước 1: Tạo DynamoDB Table

### 1.1. Vào DynamoDB Console
- Truy cập: https://console.aws.amazon.com/dynamodb/
- Click **"Create table"**

### 1.2. Cấu hình Table
```
Table name: ImageHistory

Partition key: userId (String)
Sort key: timestamp (String)

Table settings: Default settings

Tags (optional):
  - Key: Project, Value: ImageHub
  - Key: Environment, Value: production
```

### 1.3. Bật TTL (Time To Live)
Sau khi table được tạo:
1. Vào tab **"Additional settings"**
2. Click **"Enable"** ở phần TTL
3. TTL attribute: `ttl`
4. Click **Save**

✅ Ảnh sẽ tự động xóa sau 90 ngày

### 1.4. Bật Point-in-time recovery (Optional - khuyến nghị)
1. Vào tab **"Backups"**
2. Click **"Edit"** ở phần Point-in-time recovery
3. Chọn **"Turn on"**
4. Click **Save**

---

## 🔧 Bước 2: Tạo Lambda Functions

### 2.1. Tạo Lambda: save-image-history

#### A. Tạo Function
1. Vào https://console.aws.amazon.com/lambda/
2. Click **"Create function"**
3. Cấu hình:
   ```
   Function name: imagehub-save-history
   Runtime: Python 3.11
   Architecture: x86_64
   
   Execution role: Create a new role with basic Lambda permissions
   ```
4. Click **"Create function"**

#### B. Upload Code
1. Vào tab **"Code"**
2. Copy toàn bộ code từ file `backend/lambdas/save_image_history/handler.py`
3. Paste vào editor
4. Click **"Deploy"**

#### C. Cấu hình Environment Variables
1. Vào tab **"Configuration"** → **"Environment variables"**
2. Click **"Edit"** → **"Add environment variable"**
3. Thêm:
   ```
   Key: DYNAMODB_TABLE_NAME
   Value: ImageHistory
   ```
4. Click **Save**

#### D. Tăng Timeout
1. Vào tab **"Configuration"** → **"General configuration"**
2. Click **"Edit"**
3. Timeout: `30 seconds`
4. Click **Save**

#### E. Thêm IAM Permissions
1. Vào tab **"Configuration"** → **"Permissions"**
2. Click vào Role name (ví dụ: `imagehub-save-history-role-xxx`)
3. Click **"Add permissions"** → **"Attach policies"**
4. Tìm và chọn: `AmazonDynamoDBFullAccess`
5. Click **"Attach policies"**

### 2.2. Tạo Lambda: get-image-history

Lặp lại tương tự như 2.1 nhưng:

```
Function name: imagehub-get-history
Runtime: Python 3.11

Code: Copy từ backend/lambdas/get_image_history/handler.py

Environment variables:
  - DYNAMODB_TABLE_NAME = ImageHistory
  - S3_BUCKET_NAME = [tên S3 bucket của bạn, ví dụ: imagehub-processed-images]

Timeout: 30 seconds

IAM Permissions:
  - AmazonDynamoDBFullAccess
  - AmazonS3ReadOnlyAccess
```

---

## 🌐 Bước 3: Tạo API Gateway

### 3.1. Tạo REST API
1. Vào https://console.aws.amazon.com/apigateway/
2. Click **"Create API"**
3. Chọn **"REST API"** (không phải Private)
4. Click **"Build"**
5. Cấu hình:
   ```
   Choose the protocol: REST
   Create new API: New API
   API name: ImageHub-History-API
   Description: API for image history management
   Endpoint Type: Regional
   ```
6. Click **"Create API"**

### 3.2. Tạo Resource: /save-history

#### A. Tạo Resource
1. Click **"Actions"** → **"Create Resource"**
2. Cấu hình:
   ```
   Resource Name: save-history
   Resource Path: /save-history
   ✓ Enable API Gateway CORS
   ```
3. Click **"Create Resource"**

#### B. Tạo Method POST
1. Chọn resource `/save-history`
2. Click **"Actions"** → **"Create Method"**
3. Chọn **"POST"** từ dropdown
4. Click checkmark ✓
5. Cấu hình:
   ```
   Integration type: Lambda Function
   ✓ Use Lambda Proxy integration
   Lambda Region: [your region]
   Lambda Function: imagehub-save-history
   ```
6. Click **"Save"**
7. Click **"OK"** khi được hỏi về permissions

#### C. Enable CORS
1. Chọn resource `/save-history`
2. Click **"Actions"** → **"Enable CORS"**
3. Giữ nguyên default settings
4. Click **"Enable CORS and replace existing CORS headers"**
5. Click **"Yes, replace existing values"**

### 3.3. Tạo Resource: /get-history

Lặp lại tương tự 3.2 nhưng:
```
Resource Name: get-history
Resource Path: /get-history

Method: GET (thay vì POST)
Lambda Function: imagehub-get-history
```

### 3.4. Deploy API
1. Click **"Actions"** → **"Deploy API"**
2. Cấu hình:
   ```
   Deployment stage: [New Stage]
   Stage name: prod
   Stage description: Production
   Deployment description: Initial deployment
   ```
3. Click **"Deploy"**

### 3.5. Lấy API URLs
Sau khi deploy, bạn sẽ thấy **"Invoke URL"** dạng:
```
https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod
```

API endpoints của bạn sẽ là:
```
SAVE_HISTORY_URL: https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod/save-history
GET_HISTORY_URL: https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod/get-history
```

**LƯU LẠI 2 URLs này!** ← Rất quan trọng

---

## ⚙️ Bước 4: Cập nhật Frontend (.env)

### 4.1. Tạo/Cập nhật file `.env`
Trong folder `frontend/`, tạo hoặc cập nhật file `.env`:

```env
# API Gateway URLs
VITE_API_GATEWAY_URL=https://your-existing-api.execute-api.region.amazonaws.com/v1/upload-url
VITE_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net

# History API URLs (THÊM MỚI)
VITE_SAVE_HISTORY_URL=https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod/save-history
VITE_GET_HISTORY_URL=https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com/prod/get-history
```

**Thay thế** các URLs bằng URLs thực tế từ Bước 3.5

### 4.2. Cập nhật `.env.example`
```env
VITE_API_GATEWAY_URL=
VITE_CLOUDFRONT_URL=
VITE_SAVE_HISTORY_URL=
VITE_GET_HISTORY_URL=
```

---

## 🚀 Bước 5: Deploy lên Amplify

### 5.1. Thêm Environment Variables trong Amplify
1. Vào AWS Amplify Console
2. Chọn app của bạn
3. Vào **"Environment variables"** (trong sidebar)
4. Click **"Manage variables"**
5. Thêm các biến:
   ```
   VITE_SAVE_HISTORY_URL = https://...
   VITE_GET_HISTORY_URL = https://...
   ```
6. Click **"Save"**

### 5.2. Redeploy
1. Commit và push code lên GitHub
2. Hoặc click **"Redeploy this version"** trong Amplify Console

---

## 🔄 Bước 6: Tự động lưu lịch sử (Optional)

Để tự động lưu lịch sử mỗi khi user xử lý ảnh, cập nhật Lambda `image_processor`:

### 6.1. Mở Lambda image_processor
1. Vào Lambda Console
2. Tìm function `image_processor` của bạn

### 6.2. Thêm code sau vào cuối hàm `lambda_handler`
```python
# Thêm vào đầu file
import json

# Thêm vào cuối lambda_handler, SAU KHI upload processed image thành công
if user_id:  # Chỉ lưu nếu user đã đăng nhập
    try:
        lambda_client = boto3.client('lambda')
        
        # Gọi save_image_history
        lambda_client.invoke(
            FunctionName='imagehub-save-history',  # Tên function của bạn
            InvocationType='Event',  # Async call
            Payload=json.dumps({
                'userId': user_id,
                'originalKey': original_key,
                'processedKey': processed_key,
                'metadata': {
                    'width': width,
                    'height': height,
                    'format': output_format,
                    'quality': quality
                }
            })
        )
        print(f"Saved history for user {user_id}")
    except Exception as e:
        print(f"Failed to save history: {str(e)}")
        # Không raise error để không ảnh hưởng workflow chính
```

### 6.3. Thêm IAM Permission
1. Vào tab **"Configuration"** → **"Permissions"**
2. Click vào Role name
3. Click **"Add permissions"** → **"Create inline policy"**
4. Chọn JSON tab, paste:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:imagehub-save-history"
        }
    ]
}
```
5. Thay `REGION` và `ACCOUNT_ID` bằng giá trị thực
6. Click **"Review policy"**
7. Policy name: `InvokeSaveHistoryLambda`
8. Click **"Create policy"**

---

## ✅ Bước 7: Test chức năng

### 7.1. Test Save History (Manual)
1. Vào Lambda Console → `imagehub-save-history`
2. Tab **"Test"**, tạo test event:
```json
{
  "body": "{\"userId\":\"test-user-123\",\"processedKey\":\"processed/test.jpg\",\"originalKey\":\"uploads/test.jpg\",\"metadata\":{\"width\":800,\"height\":600,\"format\":\"jpeg\",\"quality\":85}}"
}
```
3. Click **"Test"**
4. Kiểm tra response: `statusCode: 200`

### 7.2. Kiểm tra DynamoDB
1. Vào DynamoDB Console
2. Chọn table `ImageHistory`
3. Tab **"Explore table items"**
4. Click **"Scan"** → **"Run"**
5. Bạn sẽ thấy item vừa tạo

### 7.3. Test Get History
1. Vào Lambda Console → `imagehub-get-history`
2. Tab **"Test"**, tạo test event:
```json
{
  "queryStringParameters": {
    "userId": "test-user-123",
    "limit": "10"
  }
}
```
3. Click **"Test"**
4. Kiểm tra response có items

### 7.4. Test Frontend
1. Đăng nhập vào app
2. Upload và xử lý một ảnh
3. Click nút **"Lịch sử"** trên header
4. Kiểm tra xem ảnh có hiển thị không

---

## 🔍 Troubleshooting

### Lỗi: "Failed to fetch image history"
**Nguyên nhân:**
- API URL chưa đúng
- CORS chưa được cấu hình
- Lambda thiếu permissions

**Giải pháp:**
1. Kiểm tra lại URLs trong `.env`
2. Enable CORS cho API Gateway resources
3. Kiểm tra IAM roles của Lambda

### Lỗi: "Access Denied" khi generate presigned URLs
**Nguyên nhân:**
- Lambda thiếu quyền S3

**Giải pháp:**
1. Vào Lambda role của `get-image-history`
2. Attach policy `AmazonS3ReadOnlyAccess`

### Ảnh không hiển thị trong History
**Nguyên nhân:**
- `image_processor` chưa gọi `save_image_history`
- Hoặc S3 bucket name sai

**Giải pháp:**
1. Cập nhật `image_processor` theo Bước 6
2. Kiểm tra `S3_BUCKET_NAME` trong `get-image-history` Lambda

### CORS Error trong browser console
**Nguyên nhân:**
- API Gateway chưa enable CORS đúng

**Giải pháp:**
1. Chọn resource trong API Gateway
2. Actions → Enable CORS
3. Đảm bảo có OPTIONS method
4. Redeploy API

---

## 📊 Chi phí dự kiến

### DynamoDB (Pay-per-request)
- Write: $1.25 per million requests
- Read: $0.25 per million requests
- Storage: $0.25/GB/month
- **Ước tính**: ~$1-3/tháng cho 1000 users

### Lambda
- First 1M requests/month: FREE
- $0.20 per 1M requests after
- **Ước tính**: Trong free tier

### API Gateway
- First 1M calls/month: FREE
- $3.50 per million after
- **Ước tính**: Trong free tier

### S3
- Tùy thuộc số lượng ảnh lưu trữ
- **Ước tính**: $1-5/tháng

**Tổng:** ~$2-8/tháng cho 1000 active users

---

## 🔐 Bảo mật (TODO cho Production)

### Hiện tại: ⚠️ API Public
- Bất kỳ ai có URL đều gọi được API
- Cần thêm authentication

### Khuyến nghị cho Production:

#### 1. Thêm Cognito Authorizer
1. Vào API Gateway
2. Authorizers → Create New Authorizer
3. Type: Cognito
4. Cognito User Pool: [chọn pool của bạn]
5. Token Source: Authorization
6. Áp dụng cho từng Method

#### 2. Validate userId từ token
Trong Lambda code, thêm:
```python
def lambda_handler(event, context):
    # Lấy userId từ Cognito token
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    token_user_id = claims.get('sub')  # Cognito User ID
    
    # So sánh với userId trong request
    request_user_id = event.get('queryStringParameters', {}).get('userId')
    
    if token_user_id != request_user_id:
        return {
            'statusCode': 403,
            'body': json.dumps({'error': 'Forbidden'})
        }
    # ... rest of code
```

---

## 📚 Tài liệu tham khảo

- [AWS Lambda Python](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. CloudWatch Logs của từng Lambda function
2. API Gateway execution logs
3. Browser console (F12) cho frontend errors

---

**🎉 Chúc bạn triển khai thành công!**
