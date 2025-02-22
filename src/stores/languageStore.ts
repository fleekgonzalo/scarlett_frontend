import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LanguageState {
  currentLocale: 'en' | 'zh'
  setLocale: (locale: 'en' | 'zh') => void
  isLearningChinese: boolean
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLocale: 'en',
      setLocale: (locale) => set({ currentLocale: locale }),
      get isLearningChinese() {
        return get().currentLocale === 'en'
      },
    }),
    {
      name: 'language-store',
    }
  )
) 