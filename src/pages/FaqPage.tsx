import { Link } from 'react-router'
import { CalendarPlus } from 'lucide-react'
import { GithubIcon } from '@/components/BrandIcons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FAQ_ITEMS, GITHUB_URL } from '@/lib/faq'
import { usePageTitle } from '@/lib/title'

/** Extra links rendered after specific answers (kept out of the shared copy). */
const ANSWER_LINKS: Record<string, { href: string; label: string }> = {
  free: { href: GITHUB_URL, label: 'Read the source on GitHub' },
  'calendar-privacy': {
    href: GITHUB_URL,
    label: 'Verify it yourself — browse the code',
  },
  'self-host': {
    href: `${GITHUB_URL}#readme`,
    label: 'Self-hosting guide in the README',
  },
}

interface Competitor {
  name: string
  href?: string
  note?: string
  free: string
  openSource: string
  noSignIn: string
  readsCalendar: string
  timeGrids: string
  reminders: string
}

const COMPETITORS: Competitor[] = [
  {
    name: 'Day that works',
    free: 'Yes',
    openSource: 'Yes (MIT)',
    noSignIn: 'Yes',
    readsCalendar: 'Never — by design',
    timeGrids: 'No — days only',
    reminders: 'No',
  },
  {
    name: 'Timeful',
    href: 'https://timeful.app/',
    free: 'Yes',
    openSource: 'Yes (AGPL)',
    noSignIn: 'Yes',
    readsCalendar: 'Optional autofill',
    timeGrids: 'Yes',
    reminders: 'Yes',
  },
  {
    name: 'When2meet',
    href: 'https://www.when2meet.com/',
    free: 'Yes',
    openSource: 'No',
    noSignIn: 'Yes',
    readsCalendar: 'No',
    timeGrids: 'Yes',
    reminders: 'No',
  },
  {
    name: 'LettuceMeet',
    href: 'https://lettucemeet.com/',
    free: 'Yes',
    openSource: 'No',
    noSignIn: 'Yes',
    readsCalendar: 'Optional autofill',
    timeGrids: 'Yes',
    reminders: 'No',
  },
  {
    name: 'Doodle',
    href: 'https://doodle.com/',
    free: 'Freemium + ads',
    openSource: 'No',
    noSignIn: 'Yes',
    readsCalendar: 'Optional connect',
    timeGrids: 'Yes',
    reminders: 'Paid',
  },
  {
    name: 'Rallly',
    href: 'https://rallly.co/',
    free: 'Free core',
    openSource: 'Yes (open core)',
    noSignIn: 'Yes',
    readsCalendar: 'No',
    timeGrids: 'Yes',
    reminders: 'Yes',
  },
  {
    name: 'Crab Fit',
    href: 'https://crab.fit/',
    free: 'Yes',
    openSource: 'Yes (GPL)',
    noSignIn: 'Yes',
    readsCalendar: 'Optional autofill',
    timeGrids: 'Yes',
    reminders: 'No',
  },
  {
    name: 'CabbageMeet',
    href: 'https://github.com/maxerenberg/cabbagemeet',
    note: 'archived 2026, unmaintained',
    free: 'Yes',
    openSource: 'Yes (AGPL)',
    noSignIn: 'Yes',
    readsCalendar: 'Optional autofill',
    timeGrids: 'Yes',
    reminders: 'Yes',
  },
]

const COLUMNS: { key: keyof Competitor & string; label: string }[] = [
  { key: 'free', label: 'Free' },
  { key: 'openSource', label: 'Open source' },
  { key: 'noSignIn', label: 'No sign-in to respond' },
  { key: 'readsCalendar', label: 'Reads your calendar' },
  { key: 'timeGrids', label: 'Time-of-day grids' },
  { key: 'reminders', label: 'Email reminders' },
]

export function FaqPage() {
  usePageTitle('FAQ')

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-muted-foreground">
          The short version: free, open source, no account needed — and it
          never reads anyone&apos;s calendar.
        </p>
      </header>

      <section className="space-y-4">
        {FAQ_ITEMS.map((item) => {
          const link = ANSWER_LINKS[item.id]
          return (
            <Card key={item.id} id={item.id}>
              <CardHeader>
                <CardTitle className="text-base">{item.question}</CardTitle>
                <CardDescription className="text-sm leading-relaxed whitespace-pre-line">
                  {item.answer}
                </CardDescription>
                {link && (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                )}
              </CardHeader>
            </Card>
          )
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          How does it compare?
        </h2>
        <p className="text-muted-foreground text-sm">
          An honest look at the apps we get compared to. Several of them are
          genuinely good — a few are open source too — so the real difference
          is philosophy: Day that works never asks for calendar access, never
          shows ads, and never adds features that would require either.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="bg-muted/50 border-b text-left">
                <th scope="col" className="p-3 font-semibold">
                  App
                </th>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col" className="p-3 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((app) => (
                <tr
                  key={app.name}
                  className={
                    app.name === 'Day that works'
                      ? 'bg-primary/5 border-b font-medium'
                      : 'border-b last:border-b-0'
                  }
                >
                  <th scope="row" className="p-3 text-left font-medium">
                    {app.href ? (
                      <a
                        href={app.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {app.name}
                      </a>
                    ) : (
                      app.name
                    )}
                    {app.note && (
                      <span className="text-muted-foreground block text-xs font-normal">
                        {app.note}
                      </span>
                    )}
                  </th>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="text-muted-foreground p-3">
                      {app[column.key] as string}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-sm">
          When is another app the better choice? If you need hour-by-hour
          availability grids, time zones, or calendar autofill,{' '}
          <a
            href="https://timeful.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Timeful
          </a>{' '}
          is the strongest option — it&apos;s open source too, and more
          featureful. We simply won&apos;t build calendar-reading features:
          autofill requires granting an app access to read your calendar, and
          that&apos;s a line this app will never cross. If your plans come down
          to picking a day, that trade-off is exactly why Day that works stays
          simpler, faster, and more private.
        </p>
      </section>

      <section className="space-y-3 pb-4 text-center">
        <h2 className="text-lg font-semibold">Still curious?</h2>
        <p className="text-muted-foreground text-sm">
          The entire app — frontend, backend hooks, and this page — is open
          source. Inspect it, star it, or run your own copy.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="size-4" />
              View on GitHub
            </a>
          </Button>
          <Button asChild>
            <Link to="/events/new">
              <CalendarPlus />
              Create an event
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
