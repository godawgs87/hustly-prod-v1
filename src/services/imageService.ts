
// Centralized image service for managing image loading
export class ImageService {
  private static instance: ImageService;
  
  static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }
  
  // Check if listing has actual photos
  hasPhotos(photos: string[] | null): boolean {
    return Array.isArray(photos) && photos.length > 0 && photos[0] && photos[0].trim() !== '';
  }
  
  // Get first photo if available
  getDisplayImage(photos: string[] | null): string | null {
    if (this.hasPhotos(photos)) {
      return photos![0];
    }
    return null;
  }
}

export const imageService = ImageService.getInstance();
