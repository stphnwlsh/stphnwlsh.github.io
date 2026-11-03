// Builds the one-page site into dist/ from src/site.json, src/styles.css and public/.
// No dependencies: Node 22 or newer is all it needs.
//
//   node build.mjs              # build for today's date
//   MOVEMBER=on node build.mjs  # force Movember mode on (or off) for a preview
//
// November is Movember: the page switches look by itself. The build sets the mode for today's date
// (US Central time) so link previews pick the right card, and a few lines of script in the page
// check the visitor's own date too, so the switch never waits on a rebuild.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';

const site = JSON.parse(readFileSync('src/site.json', 'utf8'));
const css = readFileSync('src/styles.css', 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric' }).format(new Date()));
const movember = process.env.MOVEMBER ? process.env.MOVEMBER === 'on' : month === 11;
const year = new Date().getFullYear();
const mo = movember ? '-movember' : ''; // favicon suffix
const ext = 'target="_blank" rel="noopener"';

const templates = site.lmca.templates.map(t => `
        <li class="card template" style="--hue: ${t.hue}">
          <img class="on-light" src="/img/lmca/${t.key}-light.svg" width="72" height="72" alt="" loading="lazy">
          <img class="on-dark" src="/img/lmca/${t.key}.svg" width="72" height="72" alt="" loading="lazy">
          <h3>${esc(t.name)}</h3>
          <p>${esc(t.builds)}</p>
          <p class="card-links"><a class="badge" href="${t.docs}" ${ext}>Docs</a><a class="badge" href="${t.repo}" ${ext}>GitHub</a></p>
        </li>`).join('');

const writing = site.writing.map(w => `
        <li><a class="card post" href="${w.url}" ${ext}>
          <span class="post-title">${esc(w.title)}</span>
          <span class="post-blurb">${esc(w.blurb)}</span>
          <span class="post-meta">${esc(w.where)}</span>
        </a></li>`).join('');

const links = site.links.map(l => `<li><a class="pill" href="${l.url}" ${ext}>${esc(l.name)}</a></li>`).join('');

const html = `<!doctype html>
<html lang="en"${movember ? ' data-movember' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(site.name)}</title>
  <meta name="description" content="${esc(site.description)}">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="${site.url}/">
  <link rel="icon" href="/img/favicon${mo}.svg" type="image/svg+xml">
  <link rel="icon" href="/img/favicon${mo}-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon${mo}.png">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${site.url}/">
  <meta property="og:title" content="${esc(site.name)}">
  <meta property="og:description" content="${esc(site.description)}">
  <meta property="og:image" content="${site.url}/og/${movember ? 'card-movember' : 'card'}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="/fonts/InstrumentSerif-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <script>
    // Movember mode follows the visitor's date. ?movember=1 or ?movember=0 previews either look.
    (() => {
      const q = new URLSearchParams(location.search).get('movember');
      const on = q ? q === '1' : new Date().getMonth() === 10;
      document.documentElement.toggleAttribute('data-movember', on);
      // The favicon grows a moustache too.
      for (const l of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'))
        l.href = l.getAttribute('href').replace(/(favicon|apple-touch-icon)(-movember)?/, on ? '$1-movember' : '$1');
    })();
  </script>
  <style>
${css}
  </style>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <aside class="strip nov" aria-label="Movember">
    <p><strong>Growing a mo for Movember.</strong> <a href="${site.movember.url}" ${ext}>Please give: ${esc(site.movember.label)}</a></p>
  </aside>

  <main id="main">
    <section class="hero">
      <div class="hero-text">
        <p class="chip"><span class="not-nov">@${site.handle}</span><span class="nov">@${site.handle} · Movember ${year}</span></p>
        <h1>${esc(site.name)}</h1>
        <p class="tagline">${site.tagline.map(l => `<span>${esc(l)}</span>`).join(' ')}</p>
      </div>
      <div class="face" aria-hidden="true">
        <img class="not-nov" src="/img/stubble-560.webp" width="560" height="560" alt="">
        <img class="nov" src="/img/movember-560.webp" width="560" height="560" alt="" loading="lazy">
      </div>
    </section>

    <section id="about" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <div class="about">
        <div class="prose">
          ${site.about.map(p => `<p>${esc(p)}</p>`).join('\n          ')}
          <p class="nov"><strong>Why I grow a mo:</strong> ${esc(site.movember.why)} <a href="${site.movember.url}" ${ext}>Please give.</a></p>
        </div>
        <a class="qr nov" href="${site.movember.url}" ${ext}>
          <img src="/img/movember-qr.svg" width="160" height="160" alt="QR code for movember.com/m/stephenwalsh" loading="lazy">
          <span>Scan to give</span>
        </a>
      </div>
    </section>

    <section id="templates" aria-labelledby="templates-title">
      <div class="section-head">
        <img src="/img/lmca-spectrum.svg" width="48" height="48" alt="" loading="lazy">
        <h2 id="templates-title"><a href="${site.lmca.url}" ${ext}>Lean Mean Clean Apps</a></h2>
      </div>
      <p class="lede">${esc(site.lmca.intro)}</p>
      <ul class="grid templates">${templates}
      </ul>
    </section>

    <section id="writing" aria-labelledby="writing-title">
      <h2 id="writing-title">Writing</h2>
      <p class="lede">${esc(site.writingIntro)}</p>
      <ul class="grid posts">${writing}
      </ul>
    </section>

    <section id="find-me" aria-labelledby="find-title">
      <h2 id="find-title">Find me</h2>
      <p class="lede">${esc(site.findIntro)}</p>
      <ul class="pills">${links}</ul>
    </section>
  </main>

  <footer>
    <p>© ${year} ${esc(site.name)}. No cookies here, just a visit counter.</p>
  </footer>
  <script data-goatcounter="https://${site.goatcounter}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</body>
</html>
`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('public', 'dist', { recursive: true });
writeFileSync('dist/index.html', html);
writeFileSync('dist/.nojekyll', '');
console.log(`built dist/ (Movember mode ${movember ? 'on' : 'off'})`);
