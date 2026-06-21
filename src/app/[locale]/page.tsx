import { BannerCarousel } from '@/components/home/BannerCarousel';
import { PopupModal } from '@/components/home/PopupModal';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { HotProducts } from '@/components/home/HotProducts';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Popup Ad */}
      <PopupModal />

      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Hot Products */}
      <HotProducts />
    </div>
  );
}
