
export const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
  console.log('=== CONVERTING FILES TO BASE64 ===');
  console.log('Number of files to convert:', files.length);
  
  if (!files || files.length === 0) {
    console.error('No files provided for conversion');
    return [];
  }
  
  // Process files one by one to prevent memory issues and reduce load
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Converting file ${i + 1}:`, file.name, file.size, 'bytes');
    
    if (!file || file.size === 0) {
      console.error(`File ${i + 1} is empty or invalid`);
      continue;
    }
    
    // Check file size (limit to 5MB per file for faster processing)
    if (file.size > 5 * 1024 * 1024) {
      console.warn(`File ${i + 1} is large (${file.size} bytes), compressing...`);
    }
    
    try {
      const base64 = await convertAndCompressFile(file);
      if (base64) {
        results.push(base64);
        console.log(`File ${i + 1} converted successfully`);
      }
    } catch (error) {
      console.error(`File ${i + 1} conversion failed:`, error);
      // Continue with other files instead of failing completely
    }
    
    // Small delay between files to prevent blocking
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('Files converted successfully, total results:', results.length);
  return results;
};

const convertAndCompressFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate optimal dimensions (max 1024px on longest side)
        const maxSize = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use lower quality for faster processing
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        // Ensure the result isn't too large (max 500KB base64)
        if (compressedBase64.length > 500 * 1024) {
          console.warn('Image still too large after compression, using lower quality');
          const smallerBase64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(smallerBase64);
        } else {
          resolve(compressedBase64);
        }
      } catch (error) {
        console.error('Image compression failed:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};
