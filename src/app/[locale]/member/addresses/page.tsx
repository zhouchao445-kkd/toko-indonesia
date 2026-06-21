'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Plus, Edit, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiFetch } from '@/lib/api-client';

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
}

function AddressesContent() {
  const t = useTranslations('member');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', province: '', city: '', district: '', detail: '', is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    try {
      const data = await apiFetch<{ success: boolean; data: Address[] }>('/api/users/me/addresses');
      if (data.success) setAddresses(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, []);

  const resetForm = () => {
    setForm({ name: '', phone: '', province: '', city: '', district: '', detail: '', is_default: false });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (addr: Address) => {
    setForm({ name: addr.name, phone: addr.phone, province: addr.province, city: addr.city, district: addr.district, detail: addr.detail, is_default: addr.is_default });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await apiFetch(`/api/users/me/addresses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      resetForm();
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addresses.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('addresses.deleteConfirm'))) return;
    try {
      await apiFetch(`/api/users/me/addresses/${id}`, { method: 'DELETE' });
      await loadAddresses();
    } catch {
      // ignore
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiFetch(`/api/users/me/addresses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_default: true }),
      });
      await loadAddresses();
    } catch {
      // ignore
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('addresses.title')}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          {t('addresses.add')}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">{t('loading')}</p>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t('addresses.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addr.name}</span>
                    <span className="text-sm text-muted-foreground">{addr.phone}</span>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <Star className="h-3 w-3" />
                        {t('addresses.default')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {addr.detail}, {addr.district}, {addr.city}, {addr.province}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => handleEdit(addr)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-red-600" onClick={() => handleDelete(addr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!addr.is_default && (
                <Button variant="outline" size="sm" className="mt-2 min-h-[44px]" onClick={() => handleSetDefault(addr.id)}>
                  {t('addresses.setDefault')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? t('addresses.edit') : t('addresses.add')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.name')}</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.phone')}</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.province')}</label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.city')}</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.district')}</label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('addresses.detail')}</label>
                <Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} className="min-h-[44px]" required />
              </div>
              <label className="flex items-center gap-2 min-h-[44px]">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="h-4 w-4" />
                <span className="text-sm">{t('addresses.setDefault')}</span>
              </label>

              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="min-h-[44px] flex-1" onClick={resetForm}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="min-h-[44px] flex-1" disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddressesPage() {
  return (
    <AuthGuard>
      <AddressesContent />
    </AuthGuard>
  );
}
