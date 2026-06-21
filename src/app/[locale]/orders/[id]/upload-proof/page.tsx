'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiUpload } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';

function UploadProofContent() {
  const t = useTranslations('upload');
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError(t('file.invalidType'));
      return;
    }

    // Validate size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(t('file.tooLarge'));
      return;
    }

    setError('');
    setFile(selectedFile);

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(t('file.required'));
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError(t('amount.required'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('amount', amount);

      await apiUpload(`/api/orders/${orderId}/payment-proof`, formData);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/orders/${orderId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="rounded-lg border bg-green-50 p-8">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">{t('success.title')}</h2>
          <p className="text-green-600">{t('success.content')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
      <p className="text-muted-foreground mb-6">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('amount.label')}</label>
          <Input
            type="number"
            placeholder={t('amount.placeholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-h-[44px]"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{t('amount.hint')}</p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('file.label')}</label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-md" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="min-h-[44px]"
                >
                  {t('file.remove')}
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">{t('file.hint')}</p>
                <p className="text-xs text-muted-foreground">{t('file.formats')}</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" className="mt-3 min-h-[44px]">
                  <Upload className="h-4 w-4 mr-1" />
                  {t('file.select')}
                </Button>
              </label>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{t('note')}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <Button type="submit" className="w-full min-h-[44px]" disabled={submitting || !file || !amount}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}

export default function UploadProofPage() {
  return (
    <AuthGuard>
      <UploadProofContent />
    </AuthGuard>
  );
}
