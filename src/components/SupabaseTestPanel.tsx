'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function SupabaseTestPanel() {
  const t = useTranslations('common.supabase');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleWrite = useCallback(async () => {
    if (!supabase) {
      setStatus({ type: 'error', message: 'Supabase not configured. Check .env' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_ping')
        .insert({ message: `Ping from frontend at ${new Date().toISOString()}` })
        .select()
        .single();

      if (error) throw error;
      setStatus({ type: 'success', message: `${t('success')} ID: ${data.id}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ type: 'error', message: `${t('error')} ${message}` });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleRead = useCallback(async () => {
    if (!supabase) {
      setStatus({ type: 'error', message: 'Supabase not configured. Check .env' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_ping')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setStatus({
        type: 'success',
        message: `${t('success')} Found ${data?.length || 0} records. Latest: ${data?.[0]?.message || 'none'}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ type: 'error', message: `${t('error')} ${message}` });
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('title')}</h2>
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleWrite}
          disabled={loading}
          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('writing') : t('write')}
        </button>
        <button
          onClick={handleRead}
          disabled={loading}
          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('reading') : t('read')}
        </button>
      </div>
      {status.type !== 'idle' && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
