import { LANGUAGE_LABELS, type Language, useLanguage } from '@/i18n'
import { useUi } from '@/store/ui'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const language = useLanguage()
  const setLanguage = useUi((s) => s.setLanguage)
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      {!compact && <span>Language</span>}
      <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="rounded-md border bg-card px-2 py-1.5 text-sm text-foreground">
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((key) => <option key={key} value={key}>{LANGUAGE_LABELS[key]}</option>)}
      </select>
    </label>
  )
}
