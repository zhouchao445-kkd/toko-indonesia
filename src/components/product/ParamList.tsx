import { useTranslations } from 'next-intl';
import type { ProductParam } from '@/lib/api';

interface ParamListProps {
  params: ProductParam[];
}

export function ParamList({ params }: ParamListProps) {
  const t = useTranslations('product');

  if (params.length === 0) return null;

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-bold mb-4">{t('specifications')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {params.map((param) => (
          <div
            key={param.id}
            className="flex flex-col sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-sm font-medium text-gray-500 sm:w-1/3 mb-1 sm:mb-0">
              {param.name}
            </span>
            <span className="text-sm text-gray-900 sm:w-2/3 font-medium">
              {param.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
