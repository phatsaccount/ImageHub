import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Amplify } from 'aws-amplify'

// BƯỚC 1: Cấu hình Amplify để kết nối với Cognito
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_85cLsjXEy', // ID từ Backend
      userPoolClientId: '5re0qege6no62piq816hb49npp', // ID từ Backend
      loginWith: { email: true }
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
