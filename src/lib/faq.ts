// FAQ copy shared by the FAQ page and the crawler-facing FAQPage JSON-LD in
// pb_hooks/lib/seo.js. Keep answers plain text — src/lib/seo.test.ts asserts
// the two stay in exact sync, so edit both files together.

export const GITHUB_URL = 'https://github.com/patsissons/daythatworks'

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'how-it-works',
    question: 'How does Day that works work?',
    answer:
      'Create an event, pick every date that could work, and share one link. Everyone taps the days they can make — no account needed — and the day that works best for the whole group is recommended automatically.',
  },
  {
    id: 'free',
    question: 'Is it free?',
    answer:
      'Yes. Day that works is completely free and open source. There are no paid tiers, no ads, and no features held back — you can read every line of the code that runs this site on GitHub.',
  },
  {
    id: 'account',
    question: 'Do I need an account?',
    answer:
      'No. Responding to an event only asks for your name. A lightweight guest identity is kept in your browser so you can edit your response later, and you can erase it any time with "Log out & forget me".',
  },
  {
    id: 'calendar-privacy',
    question: 'Can this app see my calendar?',
    answer:
      'No — never. Day that works has no calendar read access of any kind: no OAuth calendar scopes, no calendar API calls, nothing to grant. The add-to-calendar buttons only write — they hand your browser a prefilled link or an .ics file, and your calendar app takes it from there. Because the app is open source, you can verify this yourself in the code.',
  },
  {
    id: 'best-day',
    question: 'How is the best day picked?',
    answer:
      'Each response marks the days that work. The app counts how many people can make each candidate day, and the day with the most people available (or days, when tied) is recommended as the best day.',
  },
  {
    id: 'edit-response',
    question: 'Can I change or delete my response?',
    answer:
      'Yes. Your response is tied to your browser identity (or your account, if you signed in), so revisiting the event lets you update it. Every response also gets a personal permalink you can save to jump back to it from any device.',
  },
  {
    id: 'hide-names',
    question: 'Can I hide who responded?',
    answer:
      'Yes. Event creators can turn on hidden names so responder names are only visible to the creator — everyone else just sees the counts.',
  },
  {
    id: 'data',
    question: 'What data do you collect?',
    answer:
      'Only what the app needs to function: your event details and each response’s name and chosen days. There are no ads, no analytics trackers, and no third-party scripts, and email addresses are never shown to other users.',
  },
  {
    id: 'self-host',
    question: 'Can I self-host it?',
    answer:
      'Yes. The whole app is a single PocketBase instance serving a static frontend — the README on GitHub walks through running your own copy.',
  },
  {
    id: 'why-days-only',
    question: 'Why whole days only, and no time slots?',
    answer:
      'On purpose. Most group plans stall at "which day", not "which hour", so Day that works stays radically simple: pick days, share a link, done. If you need hour-by-hour grids or calendar-based autofill, Timeful is an excellent open-source option — that is a feature we deliberately do not offer, because doing it well requires reading your calendar.',
  },
]
