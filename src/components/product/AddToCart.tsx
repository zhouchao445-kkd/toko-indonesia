'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface AddToCartProps {
  productId: string;
  stock: number;
}

export function AddToCart({ productId, stock }: AddToCartProps) {
  const t = useTranslations('product');
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check login status (using admin_token as temporary indicator)
    const token = localStorage.getItem('admin_token');
    setIsLoggedIn(!!token);
  }, []);

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, Math.min(stock, quantity + delta));
    setQuantity(newQty);
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    // TODO: P4 - Add to cart logic
    alert(t('add_to_cart') + ' - ' + quantity);
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    // TODO: P4 - Buy now logic
    alert(t('buy_now') + ' - ' + quantity);
  };

  const isOutOfStock = stock <= 0;

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">{t('quantity')}:</span>
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg"
          >
            −
          </button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= stock}
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg"
          >
            +
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {t('stock')}: {stock}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Add to Cart */}
        <div className="relative group flex-1">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full h-12 min-h-[44px] rounded-lg font-medium transition-colors ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isLoggedIn
                ? 'bg-white border-2 border-red-600 text-red-600 hover:bg-red-50'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isOutOfStock ? t('out_of_stock') : t('add_to_cart')}
          </button>
          {!isLoggedIn && !isOutOfStock && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t('add_to_cart_tooltip')}
            </div>
          )}
        </div>

        {/* Buy Now */}
        <div className="relative group flex-1">
          <button
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className={`w-full h-12 min-h-[44px] rounded-lg font-medium transition-colors ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isLoggedIn
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isOutOfStock ? t('out_of_stock') : t('buy_now')}
          </button>
          {!isLoggedIn && !isOutOfStock && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t('buy_now_tooltip')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
