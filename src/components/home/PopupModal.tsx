'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getPopups } from '@/lib/api';
import type { Popup } from '@/lib/api';

export function PopupModal() {
  const t = useTranslations('home');
  const [popup, setPopup] = useState<Popup | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if popup was already shown in this session
    const seenIds = localStorage.getItem('popup_seen_ids');
    const seenSet = new Set(seenIds ? JSON.parse(seenIds) : []);

    getPopups()
      .then((res) => {
        if (res.success && res.data.length > 0) {
          // Find first popup not yet seen
          const unseen = res.data.find((p) => !seenSet.has(p.id));
          if (unseen) {
            setPopup(unseen);
            setShow(true);
            // Mark as seen
            seenSet.add(unseen.id);
            localStorage.setItem('popup_seen_ids', JSON.stringify([...seenSet]));
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleClose = () => {
    setShow(false);
  };

  if (!show || !popup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/80 hover:bg-white rounded-full text-gray-600 hover:text-gray-900 transition-colors shadow"
          aria-label={t('popup_close')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        {popup.image_url && (
          <img
            src={popup.image_url}
            alt={popup.title}
            className="w-full h-auto max-h-[300px] object-cover"
          />
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-bold mb-2">{popup.title}</h3>
          {popup.content && (
            <p className="text-sm text-gray-600 mb-3">{popup.content}</p>
          )}
          {popup.link_url && (
            <a
              href={popup.link_url}
              className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors min-h-[44px] flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('view_all_products')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
