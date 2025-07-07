
import React, { useState, useCallback } from 'react';
import { Image } from 'lucide-react';

interface ListingImagePreviewProps {
  photos?: string[] | null;
  title: string;
  listingId?: string;
  className?: string;
}

const ListingImagePreview = React.memo(({ photos, title, className = "w-12 h-12" }: ListingImagePreviewProps) => {
  const [imageError, setImageError] = useState(false);

  // Simple check for photos
  const firstPhoto = Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
  const hasPhoto = firstPhoto && firstPhoto.trim() !== '';

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageError(false);
  }, []);

  // Show fallback if no photo or error
  if (!hasPhoto || imageError) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <Image className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
      <img
        src={firstPhoto}
        alt={title}
        className="w-full h-full object-cover"
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
});

ListingImagePreview.displayName = 'ListingImagePreview';

export default ListingImagePreview;
