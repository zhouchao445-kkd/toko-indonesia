'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Upload, X, Plus } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface ProductImage {
  url: string;
  sort_order: number;
}

interface ProductParam {
  name: string;
  value: string;
  sort_order: number;
}

export default function AdminProductFormPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const isEdit = productId !== 'new';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    original_price: '',
    stock: '0',
    category_id: '',
    sort_order: '0',
    view_count: '0',
    click_count: '0',
    main_image: '',
    video_url: '',
    status: 'active',
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [paramsList, setParamsList] = useState<ProductParam[]>([]);

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadProduct();
    }
  }, [productId]);

  const loadCategories = async () => {
    try {
      const data = await adminApi.get('/api/admin/categories') as { categories: Category[] };
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await adminApi.get(`/api/admin/products/${productId}`) as { product: Record<string, unknown> };
      const product = data.product as Record<string, unknown>;
      setFormData({
        name: (product.name as string) || '',
        slug: (product.slug as string) || '',
        description: (product.description as string) || '',
        price: (product.price as string) || '',
        original_price: (product.original_price as string) || '',
        stock: (product.stock as number)?.toString() || '0',
        category_id: (product.category_id as number)?.toString() || '',
        sort_order: (product.sort_order as number)?.toString() || '0',
        view_count: (product.view_count as number)?.toString() || '0',
        click_count: (product.click_count as number)?.toString() || '0',
        main_image: (product.main_image as string) || '',
        video_url: (product.video_url as string) || '',
        status: (product.status as string) || 'active',
      });
      setImages((product.images as ProductImage[]) || []);
      setParamsList((product.params as ProductParam[]) || []);
    } catch (err) {
      console.error('Failed to load product:', err);
      alert(t('products.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        original_price: parseFloat(formData.original_price) || null,
        stock: parseInt(formData.stock) || 0,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        sort_order: parseInt(formData.sort_order) || 0,
        view_count: parseInt(formData.view_count) || 0,
        click_count: parseInt(formData.click_count) || 0,
      };

      if (isEdit) {
        await adminApi.put(`/api/admin/products/${productId}`, payload);
        // Update images
        await adminApi.put(`/api/admin/products/${productId}/images`, { images });
        // Update params
        await adminApi.put(`/api/admin/products/${productId}/params`, { params: paramsList });
      } else {
        await adminApi.post('/api/admin/products', payload);
      }

      alert(t('products.saveSuccess'));
      router.push('/admin/products');
    } catch (err) {
      console.error('Failed to save product:', err);
      alert(err instanceof Error ? err.message : t('products.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const data = await adminApi.upload('/api/admin/upload/image', uploadData) as { url: string };
      const newImage: ProductImage = {
        url: data.url,
        sort_order: images.length,
      };
      setImages([...images, newImage]);
      if (!formData.main_image) {
        setFormData({ ...formData, main_image: data.url });
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert(t('products.uploadError'));
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const addParam = () => {
    setParamsList([
      ...paramsList,
      { name: '', value: '', sort_order: paramsList.length },
    ]);
  };

  const updateParam = (index: number, field: 'name' | 'value', value: string) => {
    const newParams = [...paramsList];
    newParams[index] = { ...newParams[index], [field]: value };
    setParamsList(newParams);
  };

  const removeParam = (index: number) => {
    setParamsList(paramsList.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <AdminAuthGuard requirePermission={isEdit ? 'product:edit' : 'product:create'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()} className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? t('products.edit') : t('products.add')}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products.basicInfo')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.name')} *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.slug')} *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products.pricing')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.price')} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.originalPrice')}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.stock')}
                </label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Category & Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products.categoryStatus')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.category')}
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                >
                  <option value="">{t('products.noCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                >
                  <option value="active">{t('products.status.active')}</option>
                  <option value="inactive">{t('products.status.inactive')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.sortOrder')}
                </label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products.images')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.mainImage')}
                </label>
                <Input
                  value={formData.main_image}
                  onChange={(e) => setFormData({ ...formData, main_image: e.target.value })}
                  placeholder="https://..."
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productImages')} (Max 9)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 9 && (
                    <label className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.videoUrl')}
                </label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://..."
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('products.parameters')}</h2>
              <Button type="button" variant="outline" onClick={addParam} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                {t('products.addParam')}
              </Button>
            </div>
            <div className="space-y-3">
              {paramsList.map((param, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Input
                    value={param.name}
                    onChange={(e) => updateParam(index, 'name', e.target.value)}
                    placeholder={t('products.paramName')}
                    className="flex-1 min-h-[44px]"
                  />
                  <Input
                    value={param.value}
                    onChange={(e) => updateParam(index, 'value', e.target.value)}
                    placeholder={t('products.paramValue')}
                    className="flex-1 min-h-[44px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeParam(index)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats (edit only) */}
          {isEdit && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('products.statistics')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('products.viewCount')}
                  </label>
                  <Input
                    type="number"
                    value={formData.view_count}
                    onChange={(e) => setFormData({ ...formData, view_count: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('products.clickCount')}
                  </label>
                  <Input
                    type="number"
                    value={formData.click_count}
                    onChange={(e) => setFormData({ ...formData, click_count: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="min-h-[44px]"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="min-h-[44px]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </AdminAuthGuard>
  );
}
