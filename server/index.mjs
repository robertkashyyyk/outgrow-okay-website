// SSR/SEO edge for Outgrow Okay. Runs as the DigitalOcean App Platform web service.
//
// The site is a client-rendered Vite SPA. Search engines and (worse) non-JS social
// scrapers can't see per-post <title>/description/OG tags that the SPA only sets after
// JS runs. This server serves the built SPA for everything, but for insight routes it
// injects server-rendered <head> meta + JSON-LD + the article HTML into the initial
// response, and serves a real sitemap.xml / robots.txt from live data. Because posts
// are fetched per-request, weekly auto-generated posts are covered with no rebuild.

import express from 'express'
import { marked } from 'marked'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const TEMPLATE = readFileSync(join(DIST, 'index.html'), 'utf8')

const SITE = 'https://outgrowokay.com'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const REST = `${SUPABASE_URL}/rest/v1/blog_posts`
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

const app = express()
app.disable('x-powered-by')

// --- helpers ---------------------------------------------------------------

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Public reader only ever sees live published posts (RLS enforces it too).
async function fetchPost(slug) {
  const url = `${REST}?select=title,slug,subtitle,excerpt,content,cover_image_url,tags,published_at&slug=eq.${encodeURIComponent(slug)}&limit=1`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null
  const rows = await res.json()
  return rows[0] ?? null
}

async function fetchPublishedList() {
  const url = `${REST}?select=slug,published_at&order=published_at.desc`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return []
  return await res.json()
}

// Build the SEO <head> block for one article, plus JSON-LD.
function headTags(post) {
  const url = `${SITE}/insights/${post.slug}`
  const title = `${post.title} — Outgrow Okay`
  const desc = (post.excerpt || post.subtitle || '').slice(0, 300)
  const img = post.cover_image_url || `${SITE}/brand/favicon.svg`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: desc,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { '@type': 'Organization', name: 'Outgrow Okay' },
    publisher: { '@type': 'Organization', name: 'Outgrow Okay' },
    mainEntityOfPage: url,
    keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
  }
  return [
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Outgrow Okay" />`,
    `<meta property="og:title" content="${esc(post.title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(post.title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
  ].join('\n    ')
}

// Server-rendered article body so crawlers see the content pre-JS. React replaces
// #root on mount, so this is a progressive-enhancement / SEO layer only.
function articleHtml(post) {
  const cover = post.cover_image_url
    ? `<img src="${esc(post.cover_image_url)}" alt="" style="max-width:100%;height:auto" />`
    : ''
  const sub = post.subtitle ? `<p>${esc(post.subtitle)}</p>` : ''
  return `<article>${cover}<h1>${esc(post.title)}</h1>${sub}<div>${marked.parse(post.content || '')}</div></article>`
}

function renderInto(template, { title, headExtra = '', rootHtml = '' }) {
  let html = template
  if (title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  if (headExtra) html = html.replace('</head>', `    ${headExtra}\n  </head>`)
  if (rootHtml) html = html.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`)
  return html
}

// --- routes ----------------------------------------------------------------

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
})

app.get('/sitemap.xml', async (_req, res) => {
  const posts = await fetchPublishedList().catch(() => [])
  const statics = [
    { loc: `${SITE}/`, prio: '1.0' },
    { loc: `${SITE}/insights`, prio: '0.8' },
    { loc: `${SITE}/workbook`, prio: '0.8' },
  ]
  const urls = [
    ...statics.map((s) => `  <url><loc>${s.loc}</loc><priority>${s.prio}</priority></url>`),
    ...posts.map(
      (p) =>
        `  <url><loc>${SITE}/insights/${p.slug}</loc>${p.published_at ? `<lastmod>${new Date(p.published_at).toISOString().slice(0, 10)}</lastmod>` : ''}<priority>0.7</priority></url>`,
    ),
  ].join('\n')
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
})

app.get('/insights/:slug', async (req, res) => {
  try {
    const post = await fetchPost(req.params.slug)
    if (!post) {
      res.status(200).type('html').send(TEMPLATE) // let the SPA show its not-found state
      return
    }
    const html = renderInto(TEMPLATE, {
      title: `${post.title} — Outgrow Okay`,
      headExtra: headTags(post),
      rootHtml: articleHtml(post),
    })
    res.status(200).type('html').send(html)
  } catch {
    res.status(200).type('html').send(TEMPLATE)
  }
})

app.get('/workbook', (_req, res) => {
  const html = renderInto(TEMPLATE, {
    title: 'The Bottleneck Workbook — Outgrow Okay',
    headExtra:
      `<meta name="description" content="A free working guide to get your business to run without you. Find your one constraint, then request a free, no-obligation review of where to start." />\n` +
      `    <link rel="canonical" href="${SITE}/workbook" />`,
  })
  res.status(200).type('html').send(html)
})

app.get('/insights', (_req, res) => {
  const html = renderInto(TEMPLATE, {
    title: 'Insights — Outgrow Okay',
    headExtra:
      `<meta name="description" content="Practical, no-hype writing for founders and operators on getting out of the day-to-day — systems, automation and AI that let a business run without you in every loop." />\n` +
      `    <link rel="canonical" href="${SITE}/insights" />`,
  })
  res.status(200).type('html').send(html)
})

// Built static assets (JS/CSS/fonts/brand). index:false so "/" falls to the SPA route.
app.use(express.static(DIST, { index: false, maxAge: '1h' }))

// SPA fallback for every other route (final middleware — Express 5 dropped '*').
app.use((_req, res) => {
  res.status(200).type('html').send(TEMPLATE)
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`SSR server listening on ${PORT}`))
