import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Amplify } from 'aws-amplify'

//Cấu hình Amplify để kết nối với Cognito
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_85cLSjXEy',
      userPoolClientId: '5re0qege6no62piq816hb49npp',
      loginWith: { email: true }
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
