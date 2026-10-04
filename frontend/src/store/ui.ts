import { create } from 'zustand'
import type { Depot } from '@/domain/types'
import type { Language } from '@/i18n'
import { useStore } from './useStore'

interface Ui {
  depot?: Depot
  language: Language
  setDepot: (d: Depot) => void
  setLanguage: (language: Language) => void
}

const savedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('waybill-language') : null

export const useUi = create<Ui>((set) => ({
  depot: undefined,
  language: savedLanguage === 'si' || savedLanguage === 'ta' ? savedLanguage : 'en',
  setDepot: (depot) => set({ depot }),
  setLanguage: (language) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('waybill-language', language)
    set({ language })
  },
}))

export function useDepot(): Depot {
  const chosen = useUi((s) => s.depot)
  const session = useStore((s) => s.session)
  return chosen ?? session?.depot ?? 'Peliyagoda'
}
