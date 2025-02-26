# Internationalization (i18n) in Scarlett NextJS

This project uses Next.js App Router with dynamic route segments (`[locale]`) for internationalization.

## Directory Structure

```
src/
  app/
    [locale]/
      page.tsx
      layout.tsx
      ...
  locales/
    en/
      common.json
    zh/
      common.json
  hooks/
    useTranslation.ts
  components/
    LanguageSwitcher.tsx
```

## How to Use

### 1. Adding Translations

Add your translations to the appropriate JSON files in the `src/locales` directory. The structure should be the same across all language files.

Example:
```json
{
  "app": {
    "title": "Scarlett AI"
  }
}
```

### 2. Using Translations in Components

Import and use the `useTranslation` hook in your components:

```tsx
'use client'
import useTranslation from '@/hooks/useTranslation';

function MyComponent() {
  const { t, locale } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>Current locale: {locale}</p>
    </div>
  );
}
```

### 3. Switching Languages

Use the `LanguageSwitcher` component:

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function Layout() {
  return (
    <header>
      <nav>
        {/* Other navigation items */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

Or manually switch languages:

```tsx
'use client'
import { useRouter, usePathname } from 'next/navigation';

function LanguageSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  
  const switchToEnglish = () => {
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)(?:\/|$)/, '/');
    router.push(`/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`);
  };
  
  const switchToChinese = () => {
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)(?:\/|$)/, '/');
    router.push(`/zh${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`);
  };
  
  return (
    <div>
      <button onClick={switchToEnglish}>English</button>
      <button onClick={switchToChinese}>中文</button>
    </div>
  );
}
```

### 4. Adding New Languages

1. Add the new locale to the `locales` array in `src/middleware.ts`
2. Create a new directory in `src/locales` for the new language
3. Add translation files with the same structure as the existing ones
4. Update the `resources` object in `src/hooks/useTranslation.ts`

## Best Practices

1. Use nested keys to organize translations (e.g., `app.title`, `nav.home`)
2. Keep the same structure across all language files
3. Use parameters for dynamic content: `t('greeting', { name: 'John' })`
4. Add new translations as you develop new features 