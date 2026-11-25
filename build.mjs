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
import { execSync } from 'node:child_process';

const site = JSON.parse(readFileSync('src/site.json', 'utf8'));
const css = readFileSync('src/styles.css', 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric' }).format(new Date()));
const movember = process.env.MOVEMBER ? process.env.MOVEMBER === 'on' : month === 11;
const year = new Date().getFullYear();
const mo = movember ? '-movember' : ''; // favicon suffix
const ext = 'target="_blank" rel="noopener"';
// The sitemap's lastmod is the date of the last commit, so the daily rebuild doesn't tell search engines the page
// changed when it didn't. IndexNow (in the workflow) reads it to decide whether to ping Bing.
const lastmod = (() => { try { return execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim(); } catch { return new Date().toISOString(); } })();
// The visit counter, PostHog, is switched on by the POSTHOG_KEY repository variable. POSTHOG_HOST points it at the
// relay (PostHog's managed reverse proxy on our own subdomain, so ad blockers leave it alone), and ui_host keeps the
// toolbar and links on PostHog itself. Unset means no counter. Cookieless mode stores nothing in the browser and
// PostHog counts visitors from a daily hash instead, so a visit tomorrow counts as new; the project's cookieless setting
// must stay on or PostHog drops the events. Surveys are off because there aren't any, which saves loading their script
// on every visit.
const { POSTHOG_KEY: phKey, POSTHOG_HOST: phHost = 'https://us.i.posthog.com', POSTHOG_UI_HOST: phUiHost = 'https://us.posthog.com' } = process.env;
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const posthogStub = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);`;
const analytics = phKey ? `
  <script>
    ${posthogStub}
    posthog.init(${json(phKey)}, ${json({ api_host: phHost || 'https://us.i.posthog.com', ui_host: phUiHost || 'https://us.posthog.com', defaults: '2025-05-24', cookieless_mode: 'always', disable_surveys: true })});
  </script>` : '';

// Shared by the page and the 404 page.
const movemberScript = `  <script>
    // Movember mode follows the visitor's date. ?movember=1 or ?movember=0 previews either look.
    (() => {
      const q = new URLSearchParams(location.search).get('movember');
      const on = q ? q === '1' : new Date().getMonth() === 10;
      document.documentElement.toggleAttribute('data-movember', on);
      // The favicon grows a moustache too.
      for (const l of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'))
        l.href = l.getAttribute('href').replace(/(favicon|apple-touch-icon)(-movember)?/, on ? '$1-movember' : '$1');
    })();
  </script>`;
const icons = `  <link rel="icon" href="/img/favicon${mo}.svg" type="image/svg+xml">
  <link rel="icon" href="/img/favicon${mo}-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon${mo}.png">`;

const templates = site.lmca.templates.map(t => `
        <li class="card template" style="--hue: ${t.hue}">
          <img class="on-light" src="/img/lmca/${t.key}-light.svg" width="72" height="72" alt="${esc(t.name)} logo" aria-hidden="true" loading="lazy">
          <img class="on-dark" src="/img/lmca/${t.key}.svg" width="72" height="72" alt="${esc(t.name)} logo" aria-hidden="true" loading="lazy">
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
<html lang="en-AU"${movember ? ' data-movember' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(site.name)} · ${esc(site.headline)}</title>
  <meta name="description" content="${esc(site.description)}">
  <meta name="author" content="${esc(site.name)}">
  <meta name="color-scheme" content="light dark">
  <link rel="canonical" href="${site.url}/">
${icons}
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:locale" content="en_AU">
  <meta property="profile:first_name" content="${esc(site.name.split(' ')[0])}">
  <meta property="profile:last_name" content="${esc(site.name.split(' ').slice(1).join(' '))}">
  <meta property="profile:username" content="${esc(site.handle)}">
  <meta property="og:url" content="${site.url}/">
  <meta property="og:title" content="${esc(site.name)} · ${esc(site.headline)}">
  <meta property="og:description" content="${esc(site.description)}">
  <meta property="og:image" content="${site.url}/og/${movember ? 'card-movember' : 'card'}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(site.name)} · ${esc(site.headline)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
  <script type="application/ld+json">${json({
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'ProfilePage',
      '@id': `${site.url}/#page`,
      url: `${site.url}/`,
      name: `${site.name} · ${site.headline}`,
      inLanguage: 'en-AU',
      dateModified: lastmod,
      isPartOf: { '@type': 'WebSite', '@id': `${site.url}/#website`, url: `${site.url}/`, name: site.name },
      mainEntity: { '@id': `${site.url}/#person` },
    }, {
    '@type': 'Person',
    '@id': `${site.url}/#person`,
    name: site.name,
    alternateName: site.handle,
    url: `${site.url}/`,
    image: `${site.url}/img/stubble-560.webp`,
    jobTitle: site.headline,
    worksFor: { '@type': 'Organization', name: site.employer.name },
    address: { '@type': 'PostalAddress', addressLocality: 'Neenah', addressRegion: 'WI', addressCountry: 'US' },
    knowsAbout: site.knowsAbout,
    sameAs: [...site.links.map(l => l.url), site.lmca.nuget],
    }],
  })}</script>
  <link rel="preload" href="/fonts/InstrumentSerif-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
${movemberScript}
  <style>
${css}
  </style>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <aside class="strip nov" aria-label="Movember">
    <p><strong>Growing a mo for Movember.</strong> Please give: <a href="${site.movember.url}" ${ext}>${esc(site.movember.label)}</a></p>
  </aside>

  <main id="main">
    <section class="hero">
      <div class="hero-text">
        <p class="chip"><span class="not-nov">@${site.handle}</span><span class="nov">@${site.handle} · Movember ${year}</span></p>
        <h1>${esc(site.name)}</h1>
        <p class="tagline">${site.tagline.map(l => `<span>${esc(l)}</span>`).join(' ')}</p>
      </div>
      <div class="face" aria-hidden="true">
        <!-- The biggest thing on screen, so it loads first and only one photo is fetched. The build picks it for today's
             date and the script swaps it if the visitor's date (or ?movember=) disagrees. -->
        <img src="/img/${movember ? 'movember' : 'stubble'}-560.webp" width="560" height="560" alt="Photo of ${esc(site.name)}" fetchpriority="high"
             data-nov="/img/movember-560.webp" data-not-nov="/img/stubble-560.webp">
        <script>
          (i => { const src = i.dataset[document.documentElement.hasAttribute('data-movember') ? 'nov' : 'notNov']; if (i.getAttribute('src') !== src) i.src = src; })(document.currentScript.previousElementSibling);
        </script>
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
        <img src="/img/lmca-spectrum.svg" width="48" height="48" alt="Lean Mean Clean Apps logo" aria-hidden="true" loading="lazy">
        <h2 id="templates-title"><a href="${site.lmca.url}" ${ext}>Lean Mean Clean Apps</a></h2>
      </div>
      <p class="lede">${esc(site.lmca.intro)}</p>
      <p class="lede trust">${esc(site.lmca.trust.before)}<a href="${site.lmca.nuget}" ${ext}>${esc(site.lmca.trust.nuget)}</a>${esc(site.lmca.trust.middle)}<a href="${site.lmca.github}" ${ext}>${esc(site.lmca.trust.github)}</a>${esc(site.lmca.trust.after)}</p>
      <ul class="grid templates">${templates}
      </ul>
      <p class="lede sponsor">${esc(site.lmca.sponsor.before)}<a href="${site.lmca.sponsor.url}" ${ext}>${esc(site.lmca.sponsor.link)}</a>${esc(site.lmca.sponsor.after)}</p>
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
  </footer>${analytics}
</body>
</html>
`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('public', 'dist', { recursive: true });
writeFileSync('dist/index.html', html);
writeFileSync('dist/.nojekyll', '');
// GitHub Pages serves 404.html for any address that doesn't exist. It stays out of search results.
writeFileSync('dist/404.html', `<!doctype html>
<html lang="en-AU"${movember ? ' data-movember' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found · ${esc(site.name)}</title>
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light dark">
${icons}
${movemberScript}
  <style>
${css}
  </style>
</head>
<body>
  <main id="main">
    <section class="hero not-found">
      <div class="hero-text">
        <p class="chip">404</p>
        <h1>Nothing here.</h1>
        <p class="tagline"><span>This page doesn't exist, or it wandered off.</span> <span>Like my moustache every 1 December.</span></p>
        <ul class="pills"><li><a class="pill" href="/">Back to the home page</a></li></ul>
      </div>
    </section>
  </main>${analytics}
</body>
</html>
`);
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.url}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`);
// llms.txt (llmstxt.org): the page as plain Markdown, for AI assistants that read it instead of the HTML.
writeFileSync('dist/llms.txt', `# ${site.name}

> ${site.description}

${site.about.join('\n\n')}

## Lean Mean Clean Apps

${site.lmca.intro} ${site.lmca.trust.before}NuGet${site.lmca.trust.middle}GitHub${site.lmca.trust.after}

- [Lean Mean Clean Apps docs](${site.lmca.url}/): every template's docs, plus an llms.txt of their own
${site.lmca.templates.map(t => `- [${t.name}](${t.docs}): ${t.builds}. \`dotnet new install ${t.package}\`, source on [GitHub](${t.repo})`).join('\n')}

## Writing

${site.writing.map(w => `- [${w.title}](${w.url}): ${w.blurb} (${w.where})`).join('\n')}

## Find me

${site.links.map(l => `- [${l.name}](${l.url})`).join('\n')}
`);
console.log(`built dist/ (Movember mode ${movember ? 'on' : 'off'})`);
