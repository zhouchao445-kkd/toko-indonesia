'use client';

import { useState } from 'react';
import type { ProductImage } from '@/lib/api';

interface ImageGalleryProps {
  images: ProductImage[];
  mainImage?: string;
  productName: string;
}

export function ImageGallery({ images, mainImage, productName }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use product_images if available, otherwise fallback to main_image
  const imageList = images.length > 0 ? images.map((img) => img.image_url) : mainImage ? [mainImage] : [];

  if (imageList.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        No image available
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % imageList.length);
  };

  return (
    <div>
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
        <img
          src={imageList[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Navigation arrows */}
        {imageList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              aria-label="Previous image"
            >
              &#8249;
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              aria-label="Next image"
            >
              &#8250;
            </button>
          </>
        )}

        {/* Image counter */}
        {imageList.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {imageList.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {imageList.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 min-w-[44px] min-h-[44px] transition-all ${
                idx === currentIndex
                  ? 'ring-2 ring-red-600 ring-offset-2'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
