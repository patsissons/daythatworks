// Crawler-facing /faq rendering. Crawlers don't run the SPA, so
// pb_hooks/seo.pb.js serves index.html with the og marker block rebuilt for
// the FAQ page, including FAQPage JSON-LD structured data.
//
// FAQ_ITEMS mirrors src/lib/faq.ts and must stay in exact sync —
// src/lib/seo.test.ts enforces parity; edit both files together.

var FAQ_TITLE = 'FAQ — Day that works'
var FAQ_DESCRIPTION =
  'Answers about Day that works: it is free and open source, needs no account, and never reads anyone’s calendar — plus an honest comparison with Timeful, When2meet, LettuceMeet, and Doodle.'

var FAQ_ITEMS = [
  {
    question: 'How does Day that works work?',
    answer:
      'Create an event, pick every date that could work, and share one link. Everyone taps the days they can make — no account needed — and the day that works best for the whole group is recommended automatically.',
  },
  {
    question: 'Is it free?',
    answer:
      'Yes. Day that works is completely free and open source. There are no paid tiers, no ads, and no features held back — you can read every line of the code that runs this site on GitHub.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. Responding to an event only asks for your name. A lightweight guest identity is kept in your browser so you can edit your response later, and you can erase it any time with "Log out & forget me".',
  },
  {
    question: 'Can this app see my calendar?',
    answer:
      'No — never. Day that works has no calendar read access of any kind: no OAuth calendar scopes, no calendar API calls, nothing to grant. The add-to-calendar buttons only write — they hand your browser a prefilled link or an .ics file, and your calendar app takes it from there. Because the app is open source, you can verify this yourself in the code.',
  },
  {
    question: 'How is the best day picked?',
    answer:
      'Each response marks the days that work. The app counts how many people can make each candidate day, and the day with the most people available (or days, when tied) is recommended as the best day.',
  },
  {
    question: 'Can I change or delete my response?',
    answer:
      'Yes. Your response is tied to your browser identity (or your account, if you signed in), so revisiting the event lets you update it. Every response also gets a personal permalink you can save to jump back to it from any device.',
  },
  {
    question: 'Can I hide who responded?',
    answer:
      'Yes. Event creators can turn on hidden names so responder names are only visible to the creator — everyone else just sees the counts.',
  },
  {
    question: 'What data do you collect?',
    answer:
      'Four kinds of records, and nothing else: events, availability responses (a name and the chosen days), user identities (just a name and email — guest identities can be erased any time), and a short-lived rate-limit log of salted IP hashes that purges itself automatically. There are no ads, no analytics trackers, and no third-party scripts, and email addresses are never shown to other users.',
  },
  {
    question: 'Can I self-host it?',
    answer:
      'Yes. The whole app is a single PocketBase instance serving a static frontend — the README on GitHub walks through running your own copy.',
  },
  {
    question: 'Why whole days only, and no time slots?',
    answer:
      'On purpose. Most group plans stall at "which day", not "which hour", so Day that works stays radically simple: pick days, share a link, done. If you need hour-by-hour grids or calendar-based autofill, Timeful is an excellent open-source option — that is a feature we deliberately do not offer, because doing it well requires reading your calendar.',
  },
]

/** schema.org FAQPage structured data built from FAQ_ITEMS. */
function buildFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(function (item) {
      return {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      }
    }),
  }
}

/**
 * Route handler for GET /faq: serve the built index.html with FAQ meta and
 * FAQPage JSON-LD. Uses PocketBase JSVM globals ($os, toString).
 */
function serveFaqPage(e) {
  var html
  try {
    html = toString($os.readFile(__hooks + '/../pb_public/index.html'))
  } catch (err) {
    return e.next() // no built frontend (bare local instance)
  }

  var og = require(__hooks + '/lib/og.js')
  var host = e.request.host
  var scheme =
    host.indexOf('127.') === 0 || host.indexOf('localhost') === 0
      ? 'http'
      : 'https'
  var origin = scheme + '://' + host

  html = og.injectMeta(html, {
    title: FAQ_TITLE,
    description: FAQ_DESCRIPTION,
    url: origin + '/faq',
    image: origin + '/og.png',
    imageIsDefault: true,
    jsonLd: JSON.stringify(buildFaqJsonLd()),
  })

  return e.html(200, html)
}

module.exports = {
  FAQ_TITLE,
  FAQ_DESCRIPTION,
  FAQ_ITEMS,
  buildFaqJsonLd,
  serveFaqPage,
}
