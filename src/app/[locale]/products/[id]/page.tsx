'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, incrementProductView } from '@/lib/api';
import type { ProductDetail } from '@/lib/api';
import { ImageGallery } from '@/components/product/ImageGallery';
import { ParamList } from '@/components/product/ParamList';
import { AddToCart } from '@/components/product/AddToCart';

export default function ProductDetailPage() {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch product and increment view count
  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await getProduct(productId);
        if (res.success) {
          setProduct(res.data);
        }
        // Increment view count (fire and forget)
        incrementProductView(productId).catch(console.error);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{tc('product_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center mb-4 text-sm overflow-x-auto whitespace-nowrap">
          <Link href="/" className="text-gray-600 hover:text-red-600 min-h-[44px] flex items-center">
            {tc('home')}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href="/products" className="text-gray-600 hover:text-red-600 min-h-[44px] flex items-center">
            {tc('products')}
          </Link>
          {product.category_name && (
            <>
              <span className="mx-2 text-gray-400">/</span>
              <Link
                href={`/products?category=${product.category_id}`}
                className="text-gray-600 hover:text-red-600 min-h-[44px] flex items-center"
              >
                {product.category_name}
              </Link>
            </>
          )}
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900 truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Images & Video */}
          <div>
            <ImageGallery
              images={product.images}
              mainImage={product.main_image}
              productName={product.name}
            />

            {/* Video */}
            {product.video_url && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">{t('product_video')}</h3>
                <video
                  src={product.video_url}
                  controls
                  className="w-full rounded-lg max-h-[300px]"
                />
              </div>
            )}
          </div>

          {/* Right Column - Info & Actions */}
          <div className="space-y-4">
            {/* Product Name */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* Price */}
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              {product.price}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{t('sold')}: {product.sales_count}</span>
              <span>{t('views')}: {product.view_count}</span>
              <span>{t('stock')}: {product.stock}</span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-bold mb-2">{t('description')}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Add to Cart / Buy Now */}
            <AddToCart productId={product.id} stock={product.stock} />

            {/* Admin Reference Stats */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-400">
              <p className="italic">{t('admin_reference')}</p>
              <div className="flex gap-4 mt-1">
                <span>{t('views')}: {product.view_count}</span>
                <span>{t('clicks')}: {product.click_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Parameters */}
        {product.params.length > 0 && (
          <div className="mt-8">
            <ParamList params={product.params} />
          </div>
        )}
      </div>
    </div>
  );
}
