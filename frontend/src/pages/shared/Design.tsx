import { CircleCheck, Snowflake, Truck } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/domain/BrandMark'
import { BudgetBar } from '@/components/domain/BudgetBar'
import { BrandTag, Chip, Stamp, TempTag, type Tone } from '@/components/domain/chips'
import { RouteLine } from '@/components/domain/RouteLine'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function Swatch({ name, v, note }: { name: string; v: string; note?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [hex, setHex] = React.useState('')
  React.useEffect(() => {
    if (ref.current) setHex(getComputedStyle(ref.current).getPropertyValue(v).trim())
  })
  return (
    <div ref={ref} className="space-y-1.5">
      <div className="h-16 rounded-lg border" style={{ background: `var(${v})` }} />
      <p className="text-sm font-semibold leading-tight">{name}</p>
      <p className="text-xs tabular-nums text-muted-foreground">{hex}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

const TONES: { t: Tone; name: string; use: string }[] = [
  { t: 'served', name: 'Served', use: 'Delivered, confirmed, loaded and secured' },
  { t: 'ontime', name: 'On time', use: 'Planned and in progress' },
  { t: 'late', name: 'Running late', use: 'At risk: needs a look soon' },
  { t: 'deferred', name: 'Deferred', use: 'Held back, refused, or a rule is broken' },
  { t: 'conflict', name: 'Conflict', use: 'Two changes clash and need a human' },
  { t: 'syncing', name: 'Syncing', use: 'On the way, or sending saved records' },
  { t: 'offline', name: 'Offline', use: 'No signal, saved on the device' },
]

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {sub && <p className="text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </section>
  )
}

function Sample() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <BrandTag brand="Fresh" /> <TempTag temp="chilled" /> <Chip tone="ontime">On time</Chip>
        </div>
        <RouteLine
          steps={[
            { id: '1', state: 'done', title: 'Waypoint Fresh Nugegoda', sub: 'Delivered 5:12 AM' },
            { id: '2', state: 'current', title: 'Waypoint Fresh Dehiwala', sub: 'Window 5:30 to 7:45', aside: '5:41 AM' },
            { id: '3', state: 'next', title: 'Waypoint Fresh Mount Lavinia', sub: 'Window 5:00 to 7:30', aside: '6:02 AM' },
          ]}
        />
      </Card>
      <Card className="space-y-4 p-4">
        <BudgetBar label="Weight" value={2140} max={3500} unit="kg" />
        <BudgetBar label="Volume" value={17.2} max={20} unit="m³" decimals={1} />
        <BudgetBar label="Fresh time budget" value={296} max={270} unit="min" />
        <div className="flex flex-wrap gap-2">
          <Stamp tone="served">Delivered</Stamp>
          <Stamp tone="deferred">Deferred</Stamp>
          <Stamp tone="late">Part delivered</Stamp>
        </div>
      </Card>
    </div>
  )
}

export function Design() {
  return (
    <div data-mode="light" className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-12 px-5 py-10">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <BrandMark />
            <Link to="/login" className="text-sm underline">Back to the app</Link>
          </div>
          <h1 className="text-5xl font-extrabold leading-tight">Style guide</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Everything here is drawn from the live design tokens in <code>src/styles/tokens.css</code>. Change a token and this page, and the whole app, changes with it.
          </p>
        </header>

        <Section title="Colour" sub="Storm blue and quiet blue-grey for a dependable delivery workspace, with status colors kept separate.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Pale blue-grey" v="--background" note="Page background" />
            <Swatch name="Card surface" v="--card" note="Surfaces" />
            <Swatch name="Line" v="--border" note="Dividers" />
            <Swatch name="Charcoal" v="--foreground" note="Text" />
            <Swatch name="Warm grey" v="--muted-foreground" note="Secondary text" />
            <Swatch name="Storm blue" v="--primary" note="Actions and navigation" />
            <Swatch name="Blue-grey" v="--secondary" note="Secondary actions" />
            <Swatch name="Brand: Fresh" v="--brand-fresh" />
            <Swatch name="Brand: Style" v="--brand-style" />
            <Swatch name="Brand: Tech" v="--brand-tech" />
            <Swatch name="Chilled" v="--chilled" />
            <Swatch name="Ambient" v="--ambient" />
          </div>
        </Section>

        <Section title="Status" sub="Every status is a colour, an icon and a word. Colour is never the only signal.">
          <div className="grid gap-3 sm:grid-cols-2">
            {TONES.map((x) => (
              <Card key={x.t} className="flex items-center gap-3 p-3">
                <Chip tone={x.t}>{x.name}</Chip>
                <span className="text-sm text-muted-foreground">{x.use}</span>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Dark mode" sub="Loaders and drivers start before sunrise and work in glare, so their screens run dark. Same tokens, different values.">
          <div data-mode="dark" className="space-y-4 rounded-xl border bg-background p-5 text-foreground">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch name="Background" v="--background" />
              <Swatch name="Card" v="--card" />
              <Swatch name="Text" v="--foreground" />
              <Swatch name="Primary" v="--primary" />
              <Swatch name="Served" v="--served" />
              <Swatch name="Deferred" v="--deferred" />
            </div>
            <Sample />
            <Button size="xl" block variant="success"><CircleCheck /> Delivered</Button>
          </div>
        </Section>

        <Section title="Type" sub="Clear headings, quiet body text and tabular figures so times and weights line up.">
          <Card className="space-y-4 p-5">
            <p className="font-display text-5xl font-extrabold leading-none">Plan. Load. Deliver.</p>
            <p className="font-display text-3xl font-bold">Trip 1 · Gampaha · 5 stops</p>
            <p className="text-base">Chilled goods must be at 5 °C or below when the truck leaves the depot. The loader seals the door and writes the number on the slip.</p>
            <p className="text-sm text-muted-foreground">Secondary text: 3:30 AM to 8:00 AM · 1,840 kg / 2,200 kg · 16.5 m³</p>
            <p className="font-display text-3xl font-bold tabular-nums">04:30 05:12 06:47 · 1,111 · 2,222</p>
          </Card>
        </Section>

        <Section title="Buttons" sub="At least 44 px tall everywhere, and 56 px for the loader and driver, who work with gloves and one hand.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Publish plan</Button>
            <Button variant="secondary">Suggest a plan</Button>
            <Button variant="outline">Move</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Defer order</Button>
            <Button variant="success">Loaded and secured</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small (36)</Button>
            <Button size="md">Medium (44)</Button>
            <Button size="lg">Large (48)</Button>
            <Button size="xl"><Truck /> Extra large (56)</Button>
          </div>
        </Section>

        <Section title="Components in use">
          <Sample />
          <div className="flex flex-wrap gap-2">
            <TempTag temp="chilled" /> <TempTag temp="ambient" /> <BrandTag brand="Fresh" /> <BrandTag brand="Style" /> <BrandTag brand="Tech" />
            <span className="inline-flex items-center gap-1 rounded-md bg-chilled-bg px-1.5 py-0.5 text-xs font-semibold text-chilled"><Snowflake className="size-3.5" /> Refrigerated</span>
          </div>
        </Section>

        <Section title="Failure pattern" sub="Every failure screen follows the same five steps, so people learn it once.">
          <ol className="grid gap-3 sm:grid-cols-5">
            {[
              ['Detect', 'The system notices, and says so.'],
              ['Say it plainly', 'What happened, in words the person uses.'],
              ['Safe default', 'Nothing is lost. Work carries on.'],
              ['Human choice', 'Two clear options, one recommended.'],
              ['Record it', 'Written to the activity log.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-lg border bg-card p-3">
                <span className="mb-2 grid size-7 place-items-center rounded-full border-2 border-secondary text-sm font-bold">{i + 1}</span>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}
