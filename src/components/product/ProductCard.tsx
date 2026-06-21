import Link from 'next/link';
import type { ProductListItem } from '@/lib/api';

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-all min-h-[44px]"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Name */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price */}
        <p className="text-base sm:text-lg font-bold text-red-600 mb-1">
          {product.price}
        </p>

        {/* Sales count */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{product.sales_count} sold</span>
          {product.category_name && (
            <span className="truncate ml-2">{product.category_name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
