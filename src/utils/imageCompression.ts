
export const compressBase64Image = (base64String: string, maxSizeKB: number = 200): string => {
  // If the image is already small enough, return as-is
  if (base64String.length < maxSizeKB * 1024) {
    return base64String;
  }

  try {
    // Create a canvas to compress the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise<string>((resolve) => {
      img.onload = () => {
        // Calculate new dimensions (max 800px width)
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.src = base64String;
    }) as any;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return a truncated version as fallback
    return base64String.substring(0, maxSizeKB * 1024);
  }
};
