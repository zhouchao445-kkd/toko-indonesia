import { getRequestConfig } from 'next-intl/server';
import { routing, DEFAULT_LOCALE, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? DEFAULT_LOCALE;
  
  return {
    ...routing,
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
