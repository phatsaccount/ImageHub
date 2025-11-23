
import { fetchAuthSession } from 'aws-amplify/auth';
import { getCurrentUser } from './auth.js';

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'https://8rzkjedi72.execute-api.ap-southeast-1.amazonaws.com/v1/upload-url'
const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL || 'https://d14vg5o4yx9zqx.cloudfront.net'
const SAVE_HISTORY_URL = import.meta.env.VITE_SAVE_HISTORY_URL
const GET_HISTORY_URL = import.meta.env.VITE_GET_HISTORY_URL || 'https://8rzkjedi72.execute-api.ap-southeast-1.amazonaws.com/v1/history'


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

/**
 * Lấy presigned URL từ API Gateway
 * @param {Object} params 
 * @returns {Promise<Object>} 
 */
export const getPresignedUrl = async (params) => {

  const token = await getAuthToken();
  

  const headers = {
    'Content-Type': 'application/json',
  };
  

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Gọi API (Method POST)
  const response = await fetch(API_GATEWAY_URL, {
    method: 'POST',
    headers: headers, 
    body: JSON.stringify(params)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Không thể tạo URL upload')
  }

  return await response.json()
}

/**
 * Upload file lên S3 sử dụng presigned URL
 * @param {string} uploadUrl 
 * @param {File} file 
 * @param {Function} onProgress 
 * @returns {Promise<void>}
 */
export const uploadToS3 = (uploadUrl, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100)
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Lấy ảnh đã xử lý từ CloudFront với retry logic
 * @param {string} s3Key
 * @param {Function} onProgress
 * @returns {Promise<string>}
 */
export const getProcessedImage = async (s3Key, onProgress) => {
  const processedKey = s3Key.replace('uploads/', 'processed/')
  const cloudFrontUrl = `${CLOUDFRONT_URL}/${processedKey}`

  const maxRetries = 20
  const retryDelay = 1000 

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(cloudFrontUrl, { method: 'HEAD' })
      if (response.ok) {
        return cloudFrontUrl
      }
    } catch (err) {

    }
    
    await new Promise(resolve => setTimeout(resolve, retryDelay))
    
    if (onProgress) {
      onProgress(50 + Math.round((i / maxRetries) * 50))
    }
  }

  throw new Error('Timeout: Không thể lấy ảnh đã xử lý. Vui lòng thử lại sau.')
}

/**
 * Validate file trước khi upload
 * @param {File} file 
 * @returns {Object} 
 */
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024 
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  if (!file) {
    return { valid: false, error: 'Vui lòng chọn file' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Kích thước file không được vượt quá 10MB' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Chỉ hỗ trợ định dạng: JPEG, PNG, WebP' }
  }

  return { valid: true, error: null }
}

/**
 * Xử lý toàn bộ luồng upload và processing
 * @param {Object} params 
 * @param {Object} callbacks 
 * @returns {Promise<string>}
 */
export const processImage = async ({
  file,
  width,
  height,
  quality,
  format,
  watermark
}, {
  onProgress,
  onUploadKey
}) => {
  try {
    // Lấy userId từ user hiện tại
    const currentUser = await getCurrentUser()
    const userId = currentUser?.userId || 'temp'
    
    // Tạo tên file unique với timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const generatedFileName = `${timestamp}.${fileExtension}`
    
    // Tạo S3 key theo định dạng: users/${userId}/${generatedFileName}
    const s3Key = `users/${userId}/${generatedFileName}`
    
    // Bước 1: Lấy presigned URL với key có chứa userId
    onProgress(5)
    const { uploadUrl, key } = await getPresignedUrl({
      key: s3Key,
      filename: file.name,
      contentType: file.type,
      width: parseInt(width),
      height: parseInt(height),
      quality: parseInt(quality),
      format: format,
      watermark: watermark
    })
    
    if (onUploadKey) {
      onUploadKey(key)
    }

    // Bước 2: Upload lên S3
    await uploadToS3(uploadUrl, file, onProgress)
    onProgress(50)

    // Bước 3: Lấy ảnh đã xử lý từ CloudFront
    const processedImageUrl = await getProcessedImage(key, onProgress)
    onProgress(100)

    return processedImageUrl
  } catch (error) {
    throw error
  }
}

/**
 * Lưu lịch sử ảnh vào DynamoDB
 * @param {Object} historyData - { userId, originalKey, processedKey, metadata }
 */
export const saveImageHistory = async (historyData) => {
  if (!SAVE_HISTORY_URL) {
    console.warn('SAVE_HISTORY_URL not configured');
    return;
  }

  try {
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(SAVE_HISTORY_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(historyData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save image history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving image history:', error);
   
  }
};

/**
 * Lấy lịch sử ảnh của user
 * @param {string} userId 
 * @param {number} limit 
 */
export const getImageHistory = async (userId, limit = 50) => {
  if (!GET_HISTORY_URL) {
    throw new Error('GET_HISTORY_URL not configured');
  }

  try {
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = `${GET_HISTORY_URL}?userId=${encodeURIComponent(userId)}&limit=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch image history');
    }
    
    const data = await response.json();
    
    
    if (data.items) {
      data.items = data.items.map(item => {
        
        if (item['cloudfront-url']) {
          item.processedUrl = item['cloudfront-url'];
          console.log('Using cloudfront-url from backend:', item.processedUrl);
        }
        
        else if (item.processedKey) {
          item.processedUrl = `${CLOUDFRONT_URL}/${item.processedKey}`;
          console.log('Generated CloudFront URL from processedKey:', item.processedUrl);
        }
       
        else if (item.processedUrl) {
          console.log('Using processedUrl from backend:', item.processedUrl);
        }
        
        if (item.originalKey && !item.originalUrl) {
          item.originalUrl = `${CLOUDFRONT_URL}/${item.originalKey}`;
        }
        
        return item;
      });
    }
    
    console.log('Processed history data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching image history:', error);
    throw error;
  }
};