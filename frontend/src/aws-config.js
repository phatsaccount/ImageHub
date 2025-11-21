
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'YOUR_USER_POOL_ID',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'YOUR_USER_POOL_CLIENT_ID',
      region: import.meta.env.VITE_AWS_REGION || 'ap-southeast-1',
      
      // Cognito Hosted UI Configuration
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:5173/'],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:5173/'],
          responseType: 'code'
        }
      },
      
      // Tùy chọn bổ sung (cho self-hosted flow nếu cần)
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        },
        name: {
          required: true
        }
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false
      }
    }
  }
};

export default awsConfig;
