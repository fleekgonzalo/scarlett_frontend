import { useParams } from 'next/navigation';
import { useCallback } from 'react';

// Import all translation files
import enCommon from '@/locales/en/common.json';
import zhCommon from '@/locales/zh/common.json';

// Define the translation dictionaries
const resources = {
  en: {
    common: enCommon,
  },
  zh: {
    common: zhCommon,
  },
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof enCommon>;

export function useTranslation(namespace: 'common' = 'common') {
  // Use useParams from App Router instead of useRouter from Pages Router
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  
  // Get the translations for the current locale and namespace
  const translations = resources[locale as 'en' | 'zh']?.[namespace] || resources.en[namespace];
  
  // Function to get a translation by key
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>) => {
      // Split the key by dots to access nested properties
      const keys = key.split('.');
      
      // Get the translation value
      let translation = keys.reduce((obj, key) => obj?.[key], translations as any);
      
      // If translation is not found, return the key
      if (!translation) {
        console.warn(`Translation key "${key}" not found in ${locale}.${namespace}`);
        return key;
      }
      
      // Replace parameters in the translation
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      }
      
      return translation;
    },
    [locale, namespace, translations]
  );
  
  return {
    t,
    locale,
  };
}

export default useTranslation; 