'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getSettings, type Settings } from '@/lib/api';

export function Footer() {
  const t = useTranslations('footer');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.success) setSettings(res.data);
      })
      .catch(console.error);
  }, []);

  const siteName = settings?.site_name || t('site_name');
  const workHours = settings?.work_hours || t('work_hours_value');
  const contactEmail = settings?.contact_email || 'support@tokoku.id';
  const contactPhone = settings?.contact_phone || '+62 21 1234 5678';

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Site Info */}
          <div>
            <h3 className="font-semibold mb-3">{siteName}</h3>
            <p className="text-sm text-muted-foreground">
              {t('site_description')}
            </p>
          </div>

          {/* Work Hours */}
          <div>
            <h3 className="font-semibold mb-3">{t('work_hours')}</h3>
            <p className="text-sm text-muted-foreground">{workHours}</p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3">{t('customer_service')}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('contact_email')}: {contactEmail}</p>
              <p>{t('contact_phone')}: {contactPhone}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
