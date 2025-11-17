/**
 * API Service - Xử lý tất cả API calls tới AWS
 */

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'https://8rzkjedi72.execute-api.ap-southeast-1.amazonaws.com/v1/upload-url'
const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL || 'YOUR_CLOUDFRONT_URL'

/**
 * Lấy presigned URL từ API Gateway
 * @param {Object} params - Upload parameters
 * @returns {Promise<Object>} - { uploadUrl, key, expiresIn }
 */
export const getPresignedUrl = async (params) => {
  const response = await fetch(API_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
 * @param {string} uploadUrl - Presigned URL
 * @param {File} file - File để upload
 * @param {Function} onProgress - Callback cho progress (0-100)
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
 * @param {string} s3Key - S3 key của ảnh upload
 * @param {Function} onProgress - Callback cho progress
 * @returns {Promise<string>} - CloudFront URL của ảnh đã xử lý
 */
export const getProcessedImage = async (s3Key, onProgress) => {
  const processedKey = s3Key.replace('uploads/', 'processed/')
  const cloudFrontUrl = `${CLOUDFRONT_URL}/${processedKey}`

  const maxRetries = 20
  const retryDelay = 1000 // 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(cloudFrontUrl, { method: 'HEAD' })
      if (response.ok) {
        return cloudFrontUrl
      }
    } catch (err) {
      // Image not ready yet
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
 * @param {File} file - File cần validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
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
 * @param {Object} params - Upload parameters
 * @param {Object} callbacks - Callbacks cho progress và error
 * @returns {Promise<string>} - URL của ảnh đã xử lý
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
    // Bước 1: Lấy presigned URL
    onProgress(5)
    const { uploadUrl, key } = await getPresignedUrl({
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
