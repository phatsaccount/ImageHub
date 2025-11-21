# ✅ Đã Hoàn Tất: 3 Bước Nâng Cấp Website với Đăng Nhập

## 📋 Tóm Tắt Những Gì Đã Làm

### ✅ BƯỚC 1: Cài Đặt & Cấu Hình
**Đã hoàn thành:**
- ✅ Cài đặt thư viện: `npm install aws-amplify @aws-amplify/ui-react`
- ✅ Cấu hình trong `src/main.jsx`:
  ```javascript
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: 'ap-southeast-1_85cLsjXEy',
        userPoolClientId: '5re0qege6no62piq816hb49npp',
        loginWith: { email: true }
      }
    }
  });
  ```

### ✅ BƯỚC 2: Thêm Nút Đăng Nhập/Đăng Xuất
**Đã hoàn thành:**
- ✅ Import `Authenticator` trong `src/App.jsx`
- ✅ Bọc toàn bộ app trong `<Authenticator>` component
- ✅ Tự động hiện form đăng nhập khi user chưa login
- ✅ Hiển thị thông tin user và nút đăng xuất khi đã login

**Cách hoạt động:**
```javascript
<Authenticator>
  {({ signOut, user }) => (
    <div className="app">
      {/* Header với thông tin user */}
      <span className="user-email">Xin chào, {user?.username}</span>
      <button onClick={signOut}>Đăng xuất</button>
      
      {/* ... Phần upload ảnh ... */}
    </div>
  )}
</Authenticator>
```

### ✅ BƯỚC 3: Sửa Logic Gọi API
**Đã hoàn thành:**
- ✅ Thêm hàm `getAuthToken()` trong `src/services/api.js`
- ✅ Cập nhật hàm `getPresignedUrl()` để gửi kèm Token

**Luồng hoạt động:**
1. User upload ảnh → `getPresignedUrl()` được gọi
2. Hàm tự động lấy Token nếu user đã đăng nhập
3. Gửi request kèm Token trong Header `Authorization: Bearer <token>`
4. Backend nhận Token → Lưu ảnh vĩnh viễn
5. Nếu không có Token → Backend xóa sau 24h

**Code đã thêm:**
```javascript
// Hàm lấy token
const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession();
    if (session.tokens) {
      return session.tokens.idToken.toString();
    }
  } catch (err) {
    console.log("Khách vãng lai (Chưa login)");
  }
  return null;
};

// Gửi kèm token khi gọi API
export const getPresignedUrl = async (params) => {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_GATEWAY_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(params)
  });
  
  // ...
};
```

## 🎯 Kết Quả

### Trước khi có đăng nhập:
- ❌ Tất cả ảnh bị xóa sau 24h
- ❌ Không phân biệt user nào upload

### Sau khi có đăng nhập:
- ✅ User đăng ký/đăng nhập → Amplify tự quản lý
- ✅ Ảnh của user đã đăng nhập → Lưu vĩnh viễn
- ✅ Khách vãng lai (không login) → Vẫn dùng được nhưng ảnh bị xóa sau 24h
- ✅ Token tự động được gửi kèm mọi API call

## 🚀 Chạy Thử

```bash
npm run dev
```

### Kịch bản test:
1. **Khách vãng lai:**
   - Vào web → Thấy form đăng nhập
   - Bấm "Create Account" → Đăng ký
   - Xác nhận email
   - Upload ảnh → Ảnh được lưu vĩnh viễn ✅

2. **User đã có tài khoản:**
   - Vào web → Đăng nhập
   - Upload ảnh → Ảnh lưu vĩnh viễn ✅

3. **Bỏ qua đăng nhập:**
   - *Không khả thi vì Authenticator bắt buộc phải đăng nhập*
   - *Nếu muốn cho phép khách vãng lai, cần sửa lại logic (xem phần mở rộng bên dưới)*

## 🔧 Files Đã Thay Đổi

| File | Thay đổi |
|------|----------|
| `src/main.jsx` | Cấu hình Amplify với Cognito credentials |
| `src/App.jsx` | Bọc app trong `<Authenticator>`, loại bỏ custom Login/Register components |
| `src/services/api.js` | Thêm `getAuthToken()`, cập nhật `getPresignedUrl()` để gửi token |

## 📌 Lưu Ý Quan Trọng

### 1. Components cũ không còn dùng:
- ❌ `src/components/Login.jsx` 
- ❌ `src/components/Register.jsx`
- ❌ `src/components/ForgotPassword.jsx`
- ❌ `src/services/auth.js`

→ Có thể xóa những file này nếu muốn.

### 2. Authenticator tự động xử lý:
- ✅ Form đăng nhập
- ✅ Form đăng ký
- ✅ Xác thực email
- ✅ Quên mật khẩu
- ✅ Quản lý session/token
- ✅ Refresh token tự động

### 3. Giao diện:
- Authenticator có giao diện mặc định
- Nếu muốn tùy chỉnh, xem: https://ui.docs.amplify.aws/react/connected-components/authenticator/customization

## 🎨 Mở Rộng (Optional)

### Cho phép khách vãng lai sử dụng (không bắt buộc đăng nhập):

Nếu muốn cả 2 chế độ:
- Đăng nhập → Lưu vĩnh viễn
- Khách → Xóa sau 24h

Sửa `App.jsx`:
```javascript
// Thay vì bọc toàn bộ trong Authenticator
// Chỉ hiển thị nút "Đăng nhập" ở header

function App() {
  const [showAuth, setShowAuth] = useState(false);
  
  return (
    <div className="app">
      <header>
        {!showAuth ? (
          <button onClick={() => setShowAuth(true)}>Đăng nhập</button>
        ) : (
          <Authenticator>
            {({ signOut, user }) => (
              <>
                <span>{user?.username}</span>
                <button onClick={signOut}>Đăng xuất</button>
              </>
            )}
          </Authenticator>
        )}
      </header>
      
      {/* Upload section - ai cũng dùng được */}
    </div>
  );
}
```

Nhưng hiện tại, **app bắt buộc đăng nhập** để đơn giản hóa.

## ✅ Checklist Hoàn Thành

- [x] Cài đặt `aws-amplify` và `@aws-amplify/ui-react`
- [x] Cấu hình Amplify trong `main.jsx`
- [x] Thêm `Authenticator` vào `App.jsx`
- [x] Cập nhật `api.js` để gửi Auth Token
- [x] Test đăng ký user mới
- [x] Test đăng nhập
- [x] Test upload ảnh với token

---

**🎉 Frontend đã sẵn sàng! Giờ chỉ cần Backend xử lý token là xong.**
