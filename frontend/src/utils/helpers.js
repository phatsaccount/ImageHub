/**
 * Utility functions cho ImageHub
 */

/**
 * Format file size thành dạng dễ đọc
 * @param {number} bytes - Kích thước file theo bytes
 * @returns {string} - Formatted size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Tạo preview từ file
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 data URL
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onloadend = () => {
      resolve(reader.result)
    }
    
    reader.onerror = () => {
      reject(new Error('Không thể đọc file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Download file từ URL
 * @param {string} url - URL của file
 * @param {string} filename - Tên file khi download
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}

/**
 * Debounce function
 * @param {Function} func - Function cần debounce
 * @param {number} wait - Thời gian đợi (ms)
 * @returns {Function}
 */
export const debounce = (func, wait) => {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Validate dimensions
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateDimensions = (width, height) => {
  const minSize = 1
  const maxSize = 4000
  
  if (!width || !height) {
    return { valid: false, error: 'Vui lòng nhập kích thước' }
  }
  
  if (width < minSize || width > maxSize) {
    return { valid: false, error: `Chiều rộng phải từ ${minSize} đến ${maxSize}px` }
  }
  
  if (height < minSize || height > maxSize) {
    return { valid: false, error: `Chiều cao phải từ ${minSize} đến ${maxSize}px` }
  }
  
  return { valid: true, error: null }
}

/**
 * Validate quality
 * @param {number} quality - Quality (1-100)
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateQuality = (quality) => {
  if (!quality || quality < 1 || quality > 100) {
    return { valid: false, error: 'Chất lượng phải từ 1 đến 100' }
  }
  
  return { valid: true, error: null }
}
