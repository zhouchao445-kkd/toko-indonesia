'use client';

import { useEffect, useState } from 'react';
import { getBanners } from '@/lib/api';
import type { Banner } from '@/lib/api';

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    getBanners()
      .then((res) => {
        if (res.success) setBanners(res.data);
      })
      .catch(console.error);
  }, []);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-gray-100">
      <div className="relative h-[200px] sm:h-[300px] lg:h-[400px]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {banner.link_url ? (
              <a
                href={banner.link_url}
                className="block w-full h-full min-h-[44px]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ) : (
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>

      {/* Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center`}
              aria-label={`Banner ${index + 1}`}
            >
              <span
                className={`block w-3 h-3 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
            aria-label="Previous banner"
          >
            &#8249;
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
            aria-label="Next banner"
          >
            &#8250;
          </button>
        </>
      )}
    </section>
  );
}
