/// <reference path="../pb_data/types.d.ts" />

// Serve /faq with crawler-visible meta and FAQPage JSON-LD; the SPA renders
// the same content client-side for humans (see src/pages/FaqPage.tsx).
routerAdd('GET', '/faq', (e) => {
  return require(`${__hooks}/lib/seo.js`).serveFaqPage(e)
})
