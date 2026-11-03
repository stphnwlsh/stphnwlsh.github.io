# stphnwlsh.github.io

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/stphnwlsh/stphnwlsh.github.io/github-pages.yml?label=Build%20Pipeline&logo=github&style=for-the-badge)](https://github.com/stphnwlsh/stphnwlsh.github.io/actions/workflows/github-pages.yml)

My corner of the internet: one page that says who I am, shows off the [Lean Mean Clean Apps](https://leanmeancleanapps.github.io) templates, points at the things I've written and tells you where else to find me. It lives at [stphnwlsh.github.io](https://stphnwlsh.github.io).

## How it's built

On purpose, with as little as possible. There's no framework and nothing to `npm install`, because one page doesn't need a node_modules folder heavier than the page.

- `src/site.json` holds the words: bio, templates, posts and links.
- `src/styles.css` holds the look, using the colours and fonts from my [brand kit](https://github.com/stphnwlsh/stphnwlsh/tree/main/brand).
- `public/` holds the fonts, avatars, icons and social cards, copied as they are.
- `build.mjs` glues it all together into `dist/`. It needs Node 22 or newer (CI uses the version in `.nvmrc`) and nothing else.

```sh
node build.mjs                 # build for today's date
MOVEMBER=on node build.mjs     # preview the November look any time of year
npx serve dist                 # or any static server you like
```

## Movember mode

Every November the moustache comes back and the page goes with it: navy colours, the Movember avatar, a donate strip, a QR code and a moustache on the favicon. Nobody has to remember to flip a switch.

- A few lines of script in the page check the visitor's own date, so the switch happens on the day.
- The build checks the date too (US Central time) so link previews show the right card. The workflow rebuilds daily to keep that honest.
- Add `?movember=1` or `?movember=0` to the URL to preview either look.

## Publishing

[GitHub Actions](https://docs.github.com/en/actions) builds every pull request, and pushes to `main` publish straight to GitHub Pages with the official [deploy-pages](https://github.com/actions/deploy-pages) action, the same setup as the [Lean Mean Clean Apps](https://leanmeancleanapps.github.io) site. No `gh-pages` branch required.

Visits are counted by [GoatCounter](https://www.goatcounter.com/): no cookies, no tracking you around the web, just a number that tells me whether anyone reads this.

## A bit of history

The first version of this site ran on [Hugo](https://gohugo.io/) and the [Lynx](https://github.com/jpanther/lynx) theme, and I wrote up [how I built it](https://medium.com/gitconnected/build-your-personal-brand-with-a-profile-page-using-github-pages-and-hugo-6476de6071d1). It served me well, but a link page with a submodule felt like a lot of moving parts for not a lot of page.

## Support

If something I've built or written has helped you, I'd love it if you'd consider [sponsoring me](https://github.com/sponsors/stphnwlsh). And in November, the moustache would love it if you gave to [Movember](https://movember.com/m/stephenwalsh) instead.
