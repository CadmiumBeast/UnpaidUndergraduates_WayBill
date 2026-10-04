import { KeyRound, LockKeyhole, Wifi } from 'lucide-react'
import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/domain/BrandMark'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { ACCOUNTS, ROLE_HOME } from '@/domain/accounts'
import { useStore } from '@/store/useStore'
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher'
import { translate, useLanguage } from '@/i18n'

export function Login() {
  const nav = useNavigate()
  const session = useStore((s) => s.session)
  const login = useStore((s) => s.login)
  const online = useStore((s) => s.world.d.online)
  const [user, setUser] = React.useState('')
  const [pin, setPin] = React.useState('')
  const [remember, setRemember] = React.useState(false)
  const [error, setError] = React.useState('')
  const [fails, setFails] = React.useState(0)
  const [selectedDemo, setSelectedDemo] = React.useState('')
  const locked = fails >= 3
  const language = useLanguage()
  const tx = (key: string) => translate(language, key)

  if (session) return <Navigate to={ROLE_HOME[session.role]} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (locked) return
    const res = await login(user, pin, remember)
    if (!res.ok) {
      setFails((n) => n + 1)
      setError(res.reason ?? 'Could not sign in.')
      setPin('')
      return
    }
    const acc = ACCOUNTS.find((a) => a.username === user.trim().toLowerCase())!
    nav(ROLE_HOME[acc.role])
  }

  return (
    <div data-mode="light" className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between"><BrandMark light className="text-primary-foreground" /><LanguageSwitcher compact /></div>
        <div className="max-w-md">
          <p className="reveal-up text-sm font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Waybill · delivery operations</p>
          <h1 className="reveal-up mt-4 text-5xl font-extrabold leading-[1.05] [animation-delay:120ms]">Plan once. Keep every handoff clear.</h1>
          <p className="reveal-up mt-4 text-lg opacity-90 [animation-delay:220ms]">
            Waypoint's dispatchers, loaders, drivers and store managers see the same trip, each in the way they work.
          </p>
          <div className="reveal-up mt-10 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm [animation-delay:340ms]">
            <div className="flex items-center justify-between">
              <p className="font-semibold">How a delivery day moves</p>
              <span className="flex items-center gap-2 text-xs text-primary-foreground/70"><span className="route-pulse size-2 rounded-full bg-green-300" /> Live flow</span>
            </div>
            <ol className="mt-5 space-y-4">
              {['Orders close at 4 PM', 'The plan is built and explained', 'The dock loads in stop order', 'The driver delivers, even offline', 'The store confirms what arrived'].map((t, i) => (
              <li key={t} className="flex items-center gap-4 reveal-up" style={{ animationDelay: `${460 + i * 90}ms` }}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-white/70 text-sm font-bold text-white">{i + 1}</span>
                <span className="font-medium">{t}</span>
              </li>
              ))}
            </ol>
          </div>
        </div>
        <p className="text-sm opacity-70">Demo build with mock data. Tech-Triathlon 2026 Designathon.</p>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center justify-between lg:hidden"><BrandMark /><LanguageSwitcher compact /></div>
          <div>
            <p className="text-sm font-semibold text-primary">Welcome to Waybill</p>
            <h2 className="mt-1 text-3xl font-bold">{tx('login.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tx('login.subtitle')}</p>
          </div>

          {!online && (
            <p className="flex items-start gap-2 rounded-md bg-offline-bg px-3 py-2 text-sm text-offline-fg">
              <Wifi className="mt-0.5 size-4 shrink-0" /> {tx('login.offline')}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={tx('login.staffId')}>
              <Input big autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} placeholder="for example kasun" disabled={locked} />
            </Field>
            <Field label={tx('login.pin')} error={error}>
              <Input
                big
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4 digits"
                disabled={locked}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {tx('login.remember')}
            </label>
            {locked ? (
              <div className="flex items-start gap-2 rounded-md bg-deferred-bg px-3 py-3 text-sm text-deferred-fg">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                <p>Too many wrong PINs. This account is locked for now. Ask your dispatcher to reset your PIN.</p>
              </div>
            ) : (
              <Button type="submit" size="lg" block>
                <KeyRound /> {tx('login.signIn')}
              </Button>
            )}
            {!locked && <p className="text-center text-xs text-muted-foreground">{tx('login.forgot')}</p>}
          </form>

          <div className="space-y-3 border-t pt-5">
            <div>
              <p className="text-sm font-semibold">{tx('login.demo')}</p>
              <p className="mt-1 text-xs text-muted-foreground">New here? Choose a role to prefill a safe demo account.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => {
                    setUser(a.username)
                    setPin(a.pin)
                    setError('')
                    setFails(0)
                    setSelectedDemo(a.username)
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${selectedDemo === a.username ? 'border-primary bg-accent ring-2 ring-primary/20' : 'bg-card'}`}
                >
                  <span className="block text-sm font-semibold">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">{tx(`role.${a.role}`)}</span>
                </button>
              ))}
            </div>
            {selectedDemo && <p className="text-xs text-primary">{tx('login.signIn')} as {ACCOUNTS.find((a) => a.username === selectedDemo)?.name}. Review the fields above, then continue.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
