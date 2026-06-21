'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

export default function AdminBankAccountsPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    branch: '',
    logo_url: '',
    status: 'active',
  });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<{ accounts: BankAccount[] }>('/bank-accounts');
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = () => {
    setEditingAccount(null);
    setFormData({ bank_name: '', account_number: '', account_holder: '', branch: '', logo_url: '', status: 'active' });
    setShowForm(true);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder: account.account_holder,
      branch: account.branch || '',
      logo_url: account.logo_url || '',
      status: account.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_holder: formData.account_holder,
        branch: formData.branch || null,
        logo_url: formData.logo_url || null,
        status: formData.status,
      };

      if (editingAccount) {
        await adminApi.put(`/bank-accounts/${editingAccount.id}`, payload);
      } else {
        await adminApi.post('/bank-accounts', payload);
      }

      setShowForm(false);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to save account:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('finance.confirmDelete'))) return;
    try {
      await adminApi.delete(`/bank-accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  // Only super_admin can manage bank accounts
  const canEdit = hasPermission('bank_accounts.can_edit');
  const canDelete = hasPermission('bank_accounts.can_delete');
  const canCreate = hasPermission('bank_accounts.can_create');
  const canView = hasPermission('bank_accounts.can_view');

  if (!canView) {
    return (
      <AdminAuthGuard>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600">{t('common.noPermission')}</p>
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('finance.bankAccounts')}</h1>
            <p className="text-gray-600 mt-1">{t('finance.bankAccountsDesc')}</p>
          </div>
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">
              <Plus className="w-4 h-4" />
              {t('common.create')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.bankLogo')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.bankName')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.accountNumber')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.accountHolder')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.branch')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {account.logo_url ? (
                          <img src={account.logo_url} alt={account.bank_name} className="w-10 h-10 object-contain rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{account.bank_name}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.account_number}</td>
                      <td className="px-4 py-3">{account.account_holder}</td>
                      <td className="px-4 py-3 text-gray-500">{account.branch || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {account.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={() => handleEdit(account)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(account.id)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingAccount ? t('finance.editBankAccount') : t('finance.createBankAccount')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.bankName')}</label>
                  <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" placeholder="BCA, Mandiri, BNI..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.accountNumber')}</label>
                  <input type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.accountHolder')}</label>
                  <input type="text" value={formData.account_holder} onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.branch')}</label>
                  <input type="text" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('finance.logoUrl')}</label>
                  <input type="text" value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]">
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]">{t('common.cancel')}</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">{t('common.save')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
