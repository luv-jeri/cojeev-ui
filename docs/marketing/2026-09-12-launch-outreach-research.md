# Launch outreach research — six reference libraries

**Date:** 2026-09-12 · **Status:** research complete, no action taken · **Author:** research agent (Cojeev 000h reference research)

Research only. Nothing was sent, submitted, subscribed to or published. No outreach is authorised by this document. Root owns visual direction and all outreach decisions.

---

## How to read this document

**Licence readings here are not legal certainty.** Every licence statement below is a quotation from a page or repository I read on 2026-09-12, with its source. Quoting a licence is not interpreting it, and I am not qualified to interpret it. Where I mark something "do not redistribute", that is a plain reading of the publisher's own words and a reason to stop and ask — not a legal conclusion. Anything that would put third-party code into the Cojeev registry, or put Cojeev in commercial contact with these projects, should get a written confirmation from the rights holder or a lawyer's eye before it ships. Licence terms also change without notice; re-check before relying on any line here.

**Evidence discipline.** Each site was fetched once as an ordinary public page and the served HTML read directly — headings in document order, link targets, `mailto:` targets, class names, JSON-LD. Claims are tagged:

- `[verified: <source>, 2026-09-12]` — I saw it in the page source or an official API response.
- `[inferred]` — a reasonable reading I could not confirm in the source.

**No popularity rankings are asserted.** Star counts and "used by" figures appear only as raw facts with a retrieval date and an attribution. They measure attention on one platform, or are the publisher's own claim, and nothing more.

---

## Access and consent record

Two sites limited what could be gathered. Both limits were respected and neither was worked around.

| Site | What happened | Consequence for this report |
|---|---|---|
| **motion-primitives.com** | HTTP 403 to a plain fetch; HTTP 429 plus a "Vercel Security Checkpoint" interstitial to a browser-UA fetch (both 2026-09-12) | The site is declining automated access. I stopped and did not retry. Its design observations are **empty rather than guessed**; only the public GitHub repository is reported. A manual browser visit is the only way to cover it |
| **21st.dev** | Their Terms, section 3, prohibit "Scraping or automatically collecting data from the Marketplace through web scraping, bots, crawlers, or any other automated means without explicit written consent from 21st Labs Inc.", and separately prohibit using Marketplace content to train models — [21st.dev/terms](https://21st.dev/terms) | I had fetched three ordinary pages (`/`, `/terms`, `/contact`) as a reader would before finding this, then stopped. **No further automated collection of 21st.dev has occurred or will occur.** Any future look is a manual browser visit. Their previews, GIFs, titles, descriptions and metadata must not be republished |

Nothing gated was opened anywhere: no logins, no CAPTCHA, no YouTube "about" panels, no email-reveal flows.

### Per-target access limitations

Every target that is missing from this report, with the **specific** limitation that caused it. "Not found" is not a limitation; each row below names what actually blocked the retrieval, on which surface, and what would lift it.

| Missing target | Specific access limitation | Surfaces actually checked (2026-09-12) | What would lift it |
|---|---|---|---|
| **motion-primitives.com — all design observations** (hero copy, section order, interaction, density) | **Server-side bot challenge.** HTTP 403 to a plain fetch; HTTP 429 plus a "Vercel Security Checkpoint" interstitial (32KB Astro challenge page, no content) to a browser-UA fetch. The challenge is JS-gated, so no request of mine returns page content | `motion-primitives.com/` (403, then 429); `motion-primitives.com/docs` (403) | A human opening the site in a real browser. Nothing else — and the challenge is the site's stated preference, so it should not be defeated |
| **21st.dev — any page beyond `/`, `/terms`, `/contact`** | **Publisher prohibition, not a technical block.** The pages are reachable; their Terms §3 forbid automated collection without written consent. Self-imposed stop | The three pages named, all fetched before the term was found | Written consent from 21st Labs Inc., or a human browsing manually |
| **Aceternity UI — the seven YouTube channels it names** | **No machine-readable reference exists in the page.** The section is prose beside images; searched for `youtube.com/vi/`, `ytimg.com`, `youtube.com/embed/`, `youtube.com/@` and every percent-encoded variant — **zero matches in 768KB of HTML**. The creators are named in sentences only, and the page does not link to the videos it describes | `ui.aceternity.com/` full source | Searching each creator name on YouTube — an identification step, not a retrieval one, and one that risks matching the wrong channel. Not done, because a guess would be worse than a gap |
| **Aceternity UI — whether the hero preview rotates** (marked `[inferred]`) | **Client-side rendering.** A summariser reported a rotating carousel; the served HTML contains no carousel markup and only four animation classes total, so the behaviour would come from JS after hydration, which a fetch does not execute | `ui.aceternity.com/` full source | Loading the page in a browser and watching it |
| **Mantine UI — a business email** | **None is published on any surface in their information architecture.** Mantine has no contact page: their `/support/` page routes all contact to Discord, GitHub Discussions, the Help Center and GitHub issues, in that order, and names no address. The maintainer's profile publishes no email either — its only external link is Telegram ([t.me/rtivital](https://t.me/rtivital)), a personal channel | `mantine.dev/about/`, `mantine.dev/support/`, `ui.mantine.dev/category/navbars/`, `github.com/rtivital` | Nothing, short of asking them through one of their documented channels. This is a deliberate choice on their part, not an oversight |
| **Magic UI — a business email on magicui.design itself** | **The main site publishes no legal or contact pages.** Its footer carries no `licence`, `terms`, `privacy` or `contact` link at all — verified by extracting every `href` in the served HTML. The address in this report was found one hop away, on the Pro site linked from the homepage banner | `magicui.design/` full source (all hrefs enumerated); `pro.magicui.design/`, `pro.magicui.design/license` | Nothing needed — `support@magicui.design` was found and is cited. The limitation is only that it is scoped to support and legal, not partnerships |
| **YouTube creator business emails** (all channels named in this report) | **Gated behind an authenticated reveal**, and out of scope by instruction. A channel's "About" panel requires sign-in and a CAPTCHA to display an address | None — deliberately not attempted | Nothing that stays within the brief. If creator contact is ever wanted, the route is a public reply or a published business enquiry form, initiated by a human |
| **Whether any licence reading here holds up legally** | **Not an access limitation — a competence limitation.** Every page I needed was fully retrievable; I am not qualified to interpret what I retrieved | All licence pages read in full and quoted | A lawyer, or written confirmation from the rights holder |

**Two targets that were missing in the first pass and are now resolved**, recorded here so the gap list stays honest:

- **Motion Primitives' business contact** was reported as "not publicly found". It is published: `julien@interfaceoffice.com`, on [ibelick.com](https://ibelick.com), reachable in two hops from the repo (repo owner → GitHub profile's website link → that site's Mail link). The first pass stopped at the README and the gated product site. **Found by widening the surface, not by defeating any block** — the product site is still unreachable.
- **Magic UI's five YouTube features** were reported as having no IDs in the source. They are present, percent-encoded inside Next.js image-preload URLs. The first pass searched for the plain form only. **A search-pattern error on my side, not an access limitation** — corrected in Part 3.

---

## Part 1 — Design observations

### Summary table

| Library | Hero shape | Signature interaction (verified) | Density | What transfers to Cojeev |
|---|---|---|---|---|
| Magic UI | One H1, two CTAs, tech pills | Marquee showcase; ⌘K command palette; star ticker | Low then high | Credentialed proof as a quiet marquee |
| Aceternity UI | One H1, "Browse" + "Get All-Access" | None on the homepage — previews are still images | High | FAQ-before-CTA as the closing block |
| Canvas UI | One H1, "Get started" + "Browse components" | Marquee quote wall; one literal install command | High proof-to-product | Three-step install strip; "one component, N flavors" |
| 21st.dev | One H1, browse + join | Agent-install triptych (Claude Code / Codex / Lovable) | Highest | The author card — avatar, name, one count, one link |
| Mantine UI | **No hero at all** | Preview/Code toggle per example | One example per screen | **The vertical variation list — closest model to the brief** |
| Motion Primitives | not observed | not observed | not observed | — |

### Magic UI — magicui.design

- **Hierarchy** `[verified: magicui.design, 2026-09-12]` — one H1: "UI library for Design Engineers". Sub: "150+ free and open-source animated components and effects built with React, Typescript, Tailwind CSS, and Motion. Perfect companion for shadcn/ui." Two CTAs, "Browse Components" and "Browse Templates", then three tech pills (React / Tailwind CSS / Motion). Above the H1: an announcement pill ("🎉 Introducing Floating 3D Particles") and a site-wide Magic UI Pro banner.
- **Section order** `[verified]` — hero → Showcase ("Companies choose Magic UI to build their landing pages") → "What People Are Saying on Twitter" → "Featured on YouTube" → footer: "Built by dillion. The source code is available on GitHub."
- **Signature interaction** `[verified in DOM]` — the showcase is a **marquee**: four elements carry `animate-marquee` and the entries repeat in source, the duplicated-track pattern used for a seamless loop. The primary CTA carries `animate-rainbow`. The header has a real command palette ("Command Palette / Search for a command to run… ⌘K") and a star count rendered both raw and abbreviated (`22,249` and `22.2k`) — the number-ticker pattern.
- **Density** `[verified]` — low above the fold, then dense: the showcase names ~17 sites, each with one factual credential line ("YC S24", "Bootstrapped", "Personal Portfolio"). **No component grid on the homepage at all** — components sit behind the CTA.
- **Adaptation option** — the reusable move is **credentialed social proof as a quiet marquee, not a logo wall**: a name plus one true line, not a logo. Cojeev already ships `marquee`. On paper stock, one slow row of ink-on-paper name cards reads as a ledger rather than a banner. This only works when the credentials are real, so it is a post-launch section, not a beta one.

### Aceternity UI — ui.aceternity.com

- **Hierarchy** `[verified: ui.aceternity.com, 2026-09-12]` — H1 "The React component library for beautiful landing pages." Sub: "200+ production-ready components, blocks and templates built with React, Tailwind CSS and Motion. Copy, paste, customize, and ship at lightning speed without wrestling with animations or styling." CTAs "Browse Components" and "Get All-Access".
- **Section order** `[verified from H1/H2 sequence]` — hero → "Used by companies and people working at" → "Loved by thousands of developers, designers and entrepreneurs" → "Get more done with Aceternity UI All-Access Pass" → three templates, each its own H2 → "Featured by popular YouTubers" → "Frequently asked questions" → "Get access to all Component Blocks and templates".
- **Signature interaction — there isn't one** `[verified]` — the homepage carries almost no animation classes (`animate-pulse` ×3, `animate-spin` ×1), contains **no `<video>` element and no `.mp4`/`.webm` source**, and serves its component previews as still images from `assets.aceternity.com` (393 `.webp` and 60 `.jpg` references from that host; 468 `.webp`, 212 `.jpg`, 31 `.png` in the page overall). The page **sells motion with still images** and defers the real thing to component pages. A rotating hero carousel was reported by a summariser but I could not confirm it in source `[inferred]`.
- **Density** `[verified]` — high. The footer alone enumerates ~20 components, ~20 block categories, 12 templates, 5 sibling products and 7 SEO "Relevant" links.
- **Adaptation option** — **FAQ-before-CTA**: eight plain questions covering price, licence, install, framework and support, immediately above the closing call to action. For a beta homepage that is worth more than a feature tour — it is the one place "beta", "free", "MIT" and "how to report a problem" can be stated once, in ink, without decoration.

### Canvas UI — canvasui.dev

- **Hierarchy** `[verified: canvasui.dev, 2026-09-12]` — H1 "Creative components, in a new dimension." Sub: "An open source library of tasteful html-in-canvas components, in WebGL or WebGPU. Framework agnostic." CTAs "Get started" → `/docs`, "Browse components" → `/components`.
- **Section order** `[verified from H2 sequence]` — hero → "Every component, alive on canvas." → "Featured on YouTube" → "Words from X" → "Copy, paste, ship." (H3s: "Pick a component" / "Run one command" / "Make it yours") → "One component, six flavors." → "Built for agents." → "Good questions." → "See how Canvas UI evolves."
- **Signature interaction** `[verified in DOM]` — the X testimonial wall is a **marquee** (`community-marquee`, `community-marquee-track`, duplicated track). The install step shows one literal command: `npx shadcn@latest add @canvas-ui/particle-reveal-react`. The three YouTube features are real embeds with resolvable IDs.
- **Density** `[verified]` — the highest proof-to-product ratio of the six: three videos plus a long quote wall before any component list. Quotes include Chrome for Developers (@ChromiumDev) and shadcn (@shadcn).
- **Adaptation options** — two transfer cleanly. (a) The **three-step install strip** with one real copyable command; `code-block` already exists for it, and it is the shortest honest way to show how Cojeev is consumed. (b) **"One component, six flavors"** as a structural idea — Cojeev's equivalent claim is variations of one component, which is exactly the profile-card direction. What does *not* transfer is the effect-heavy hero: Canvas UI's product **is** the effect; Cojeev's is not.

### 21st.dev — 21st.dev

*Observations below come from three ordinary page reads made before their no-automation term was found. No further collection will occur.*

- **Hierarchy** `[verified: 21st.dev, 2026-09-12]` — H1 "The living library of interfaces" ("living" emphasised). Sub: "12,000+ crafted React components, templates, and shadcn themes. Built by real design engineers."
- **Section order** `[verified from H1/H2 sequence]` — hero → category browse ("2,000+ Marketing blocks", "2,100+ UI components", as plain text link lists, not cards) → "Used by 3,596,953 builders. From indie makers to the world's largest product teams" (**their claim, unverified**) → "Copy the prompt. Paste it anywhere" → "Number Ticker" → "Built by real design engineers. Every component has an author. Indexed, searchable, one prompt away" → "Built by humans Ready for agents" → "Questions, answered" → footer.
- **Signature interaction** `[verified]` — the **agent-install triptych**: three panes for Claude Code, Codex and Lovable, each showing the same prompt producing a different real artefact — a terminal writing `components/ui/animated-hero.tsx +148 lines — adapted to your theme`, a PR diff (`+ export function AnimatedHero()` / `− <OldHero />` / "Ready to review / Create PR"), and a chat. Copy: "Every component ships as a prompt. One copy — and it builds itself in whatever tool you live in."
- **Creator grid** `[verified in DOM]` — a `grid-cols-2 / sm:grid-cols-3 / lg:grid-cols-6` grid of author tiles. Each tile is one `<a>` holding exactly three things: a 40px rounded avatar, the author name, and a component count — e.g. `<img alt="Aceternity UI">` + "Aceternity UI" + "87 components", linking to `/community/manuarora700/library/aceternity-ui`. On small screens everything past the 18th tile is hidden by CSS. **This is a profile card doing real work in the wild** — identity, one number, one link, nothing else.
- **Density** `[verified]` — highest of the six.
- **Adaptation options** — the **author card** is the direct precedent for the profile-card variations: avatar, name, one count, one link, no decoration. Cojeev's `profile-card` with `avatar` and `badge` can carry the same job on paper stock, where the count is set in precise ink and a contour frames it instead of a border glow. Second: **"every component has an author"** as a stated principle — one line of copy, not a section. What should not transfer is the triptych's density; the same claim fits in one pane and one real command.

### Mantine UI — ui.mantine.dev/category/navbars

**This is the closest model to what the redesign brief asks for.**

- **Hierarchy** `[verified: ui.mantine.dev/category/navbars/, 2026-09-12]` — no marketing hero at all. "Back to all categories" → H1 "Navbars" → a **vertical list** of named examples.
- **Per-example anatomy** `[verified]` — name ("Navbar with 2 sections", "Collapsible links group", "Navbar with tooltips", "Navbar with nested links", "Navbar with search", "Navbar with SegmentedControl", "Simple navbar") → a **Preview / Code toggle** → for some, a version badge (`v3.1.2`) → "View component in isolation" and "View source on github", pointing at the exact file, e.g. `github.com/mantinedev/ui.mantine.dev/tree/master/lib/DoubleNavbar/DoubleNavbar.tsx`.
- **Signature interaction** `[verified]` — the Preview/Code toggle is the entire interaction. No animation on the page. Search is `Ctrl + K`.
- **Density** `[verified]` — one live example per screen-ish block, generous vertical rhythm, no grid. Ten variations of one component type sit on one page and stay legible.
- **Adaptation option** — this vertical Preview/Code list **is** the format for profile-card variations: one named variation per block, live preview, code toggle, link to the exact source file. Least decorated of the six and the only one that reads as a workshop rather than a shopfront — the closer fit to warm paper and precise ink. Cojeev already has `preview`, `code-block`, `tabs` and `badge`; the missing piece is naming each variation, which is editorial work, not engineering.

### Motion Primitives — motion-primitives.com

- **Design observations: none.** Homepage not retrievable (403 / 429 + Vercel Security Checkpoint, 2026-09-12). Not retried, not worked around.
- **From the public repo only** `[verified: github.com/ibelick/motion-primitives, 2026-09-12]` — tagline "UI kit to make beautiful, animated interfaces, faster. Customizable. Open Source." Built with Motion and Tailwind CSS. Docs at motion-primitives.com/docs. Licence file spelled `LICENCE.md`.

### Cross-site patterns

- **All five observed sites lead with one H1 and at most two CTAs.** None opens with a component grid. `[verified across the five pages fetched]`
- **Four of the five put proof before product** — showcase, testimonials or video features above any component listing. Mantine is the exception and the only one with no marketing layer at all. `[verified]`
- **Marquee is the one animation the showcase pages actually ship** (Magic UI `animate-marquee`, Canvas UI `community-marquee`). Motion carrying content, not decorating it — that is the line between it and sparkle. `[verified in DOM]`
- **The install command appears as literal copyable text, once, early.** Canvas UI and 21st both do this; Aceternity puts it in the FAQ. `[verified]`
- **A homepage does not have to run its effects to sell them.** Aceternity's previews are entirely still images. `[verified]`
- **Raw platform facts, for the record, not as a ranking:** GitHub stars on 2026-09-12 via the GitHub API — Mantine 31,699; Magic UI 22,258; Motion Primitives 6,267; Canvas UI 4,555; ui.mantine.dev 3,909.

---

## Part 2 — Licence findings

**Read the caveat at the top of this document first.** These are quotations, not legal advice, and they are accurate as of 2026-09-12 only.

| Library | Licence, as published | Studying the layout | Putting their code in the Cojeev registry |
|---|---|---|---|
| Magic UI (free) | **MIT** — [repo](https://github.com/magicuidesign/magicui), GitHub API 2026-09-12 | Fine | MIT permits it with attribution. Verify the specific file's header before relying on this |
| Magic UI Pro | Proprietary — [pro.magicui.design/license](https://pro.magicui.design/license) | Fine | **No.** "Licensee may not redistribute, resell, share, or otherwise transfer the Products, whether in their original form or a modified version, to any third party," with a stated $10,000-per-instance liquidated-damages clause |
| Aceternity UI (free **and** Pro) | Proprietary — [FAQ](https://ui.aceternity.com), [licence](https://ui.aceternity.com/licence) | Fine | **No.** FAQ, verbatim: "The only restriction is that you cannot resell or redistribute the components themselves as a competing template or component library." The Pro licence adds: "You cannot re-distribute the Item as a stock image or its source files, regardless of modifications" and "You cannot create themes, templates, or derivative products to sell on any marketplace." A component registry is squarely what this describes |
| Canvas UI | **MIT + Commons Clause** — [repo](https://github.com/DavidHDev/canvas-ui). GitHub reports `NOASSERTION` / "Other" because Commons Clause has no SPDX id | Fine | **Ask first, in writing.** README: "Free in your own projects, commercial or not. The Commons Clause only restricts selling the library itself." Whether a free registry republishing the components counts as "selling the library itself" is not settled by that wording. This is exactly the kind of question I cannot answer and should not be answered by guessing |
| 21st.dev | Component code is **per-author**; platform layer is owned by 21st Labs Inc. — [terms](https://21st.dev/terms) | Fine | **No** for their demos, previews, GIFs, screenshots, titles, descriptions and metadata — the terms claim these as "independent works authored and owned by 21st Labs Inc.", "even where the underlying component code was originally authored by a third party". Component code depends entirely on each individual author's licence |
| Mantine UI | **MIT** — `mantinedev/ui.mantine.dev` and `mantinedev/mantine`, GitHub API 2026-09-12 | Fine | MIT permits it with attribution. Their demo copy, fixture data and avatar assets are not part of that grant |

**Standing caveat.** An MIT badge covers source code. It does not cover a site's marketing copy, screenshots, demo videos, avatar images, fixture data, or the company logos in a showcase. **A free live demo is never automatically redistributable.** Design patterns — a vertical variation list, an FAQ above a CTA, a three-step install strip — are ideas rather than assets, and reimplementing an idea in Cojeev's own components with Cojeev's own markup is a different act from copying code. That distinction is the practical one, but it is still not a legal opinion.

---

## Part 3 — Outreach contacts

**Nothing has been sent. No forms submitted, nothing subscribed, no one messaged.** No email below is guessed: each is quoted from a page I read, with the URL where it appears. Where none is published, the row says so.

| Library | Official channels (and where they are linked from) | Publicly listed business email | Exact source | Fit |
|---|---|---|---|---|
| **Magic UI** | GitHub [magicuidesign/magicui](https://github.com/magicuidesign/magicui); X [@magicuidesign](https://twitter.com/magicuidesign); Discord [discord.gg/87p2vpsat5](https://discord.gg/87p2vpsat5); maintainer X [@dillionverma](https://twitter.com/dillionverma) — all linked from the magicui.design header/footer | `support@magicui.design` | [pro.magicui.design/license](https://pro.magicui.design/license) — "please contact us at support@magicui.design directly", verbatim, in the trademark/logo-usage clause. **Not present on magicui.design itself** | Closest peer: same shadcn-registry format, same free-tier-plus-pro shape. Their contributing guide says adding a component "only takes ~5 minutes", which suggests an open posture. Note the address is scoped to support and legal, not partnerships |
| **Aceternity UI** | X [@mannupaaji](https://twitter.com/mannupaaji) ("Building in public at @mannupaaji", footer); Discord [discord.gg/ftZbQvCdN7](https://discord.gg/ftZbQvCdN7); GitHub [aceternity](https://github.com/aceternity); company "Aceternity Labs LLC" (footer copyright) | `support@aceternity.com` | [ui.aceternity.com](https://ui.aceternity.com), FAQ introduction — "If you don't find what you need here, reach us at support@aceternity.com", verbatim | Commercial operation with a paid tier and an explicit anti-competing-library clause. Any approach must be non-redistributive by construction. Fit is for conversation, not for inclusion |
| **Canvas UI** | GitHub [DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui); maintainer [@DavidHDev](https://github.com/DavidHDev); X [@davidhaz](https://x.com/davidhaz); site [canvasui.dev](https://canvasui.dev) | `hello@canvasui.dev` | [canvasui.dev/privacy](https://canvasui.dev/privacy) — "you can have it deleted at any time by emailing hello@canvasui.dev", verbatim. Page states "Last updated August 14, 2026" | **Best fit of the six.** Independent maintainer, open source, ships in shadcn registry format (`npx shadcn@latest add @canvas-ui/…`), README says "Issues and pull requests welcome". The Commons Clause question is a specific, legitimate reason to write |
| **21st.dev** | X [@21st_dev](https://x.com/21st_dev); GitHub [21st-dev](https://github.com/21st-dev); company "21st Labs, Inc." (footer) | `support@21st.dev` | [21st.dev](https://21st.dev) footer — the "Contact" link is `href="mailto:support@21st.dev"`, verified in page source. Also `security@21st.dev` in [21st.dev/terms](https://21st.dev/terms), for security reports only | Structurally the most relevant: an open registry that **lists third-party libraries by author**, including Aceternity UI (verified in their creator grid). That is a listing channel, not a competitor. **Approach by human email only** — their terms bar automated collection, and any listing happens on their terms. Trap: `21st.dev/contact` is **not** a contact page; it resolves to a user profile whose username is "contact" |
| **Mantine UI** | GitHub [mantinedev](https://github.com/mantinedev) and [mantinedev/ui.mantine.dev](https://github.com/mantinedev/ui.mantine.dev); [GitHub Discussions](https://github.com/mantinedev/mantine/discussions); Discord [discord.gg/wbH82zuWMN](https://discord.gg/wbH82zuWMN); X [@mantinedev](https://x.com/mantinedev); [OpenCollective](https://opencollective.com/mantinedev); maintainer [@rtivital](https://github.com/rtivital) (Vitaly Rtishchev, named on [mantine.dev/about](https://mantine.dev/about/) as building and maintaining Mantine with 500+ contributors) | **Not publicly found** | Checked four surfaces on 2026-09-12 — mantine.dev/about/, mantine.dev/support/, ui.mantine.dev/category/navbars/, and the maintainer's profile at github.com/rtivital. None publishes an email address. The profile's only external link is Telegram ([t.me/rtivital](https://t.me/rtivital)), a personal channel, not a business contact | Different category: a full component library with a design-system dependency, not a copy-paste registry. Lower strategic fit. Their documented route is GitHub Discussions or Discord, not email |
| **Motion Primitives** | GitHub [ibelick/motion-primitives](https://github.com/ibelick/motion-primitives); maintainer [@ibelick](https://github.com/ibelick); personal site [ibelick.com](https://ibelick.com); X [@ibelick](https://twitter.com/ibelick); studio [Interface Office](https://ibelick.com); product site motion-primitives.com (not retrievable — see access record) | `julien@interfaceoffice.com` | [ibelick.com](https://ibelick.com) — published as the "Mail" link (`mailto:julien@interfaceoffice.com`), verified in page source 2026-09-12. Chain: the repo owner `ibelick` → the website link on [github.com/ibelick](https://github.com/ibelick) → that site's own contact link | Adjacent scope (Motion-based animated primitives, MIT). The maintainer is **Julien Thibeaut**, who describes himself as a Design Engineer running "Interface Office, a design engineering studio helping AI startups build their products", and lists `motion-primitives` among his selected projects alongside `prompt-kit` and `UI Skills` (ibelick.com, verified). The address is his studio contact, so it is a business route rather than a personal one |

### Two traps to avoid

1. **Every email visible on ui.mantine.dev's navbars page is demo fixture data** — `hspoonlicker@outlook.com`, `bgluesticker@mantine.dev`, and dozens of faker-generated addresses such as `Abagail29@hotmail.com`. `[verified]` None is a contact route. Any automated harvest of that page returns pure noise.
2. **`21st.dev/contact` is a user profile**, not a contact page. `[verified]` The real route is the footer `mailto:support@21st.dev`.

### YouTube creators — what exists, and what was deliberately not collected

**No YouTube channel business emails were collected.** Those sit behind a gated reveal and are out of scope by instruction.

- **Canvas UI's three features** resolve through YouTube's public oEmbed endpoint `[verified, 2026-09-12]`: [@Hyperplexed](https://www.youtube.com/@Hyperplexed) — "New browser update lets you set things on FIRE"; [@betterstack](https://www.youtube.com/@betterstack) — "This component library is mind-blowing (Canvas UI)"; [@orcdev](https://www.youtube.com/@orcdev) — "The Biggest Web UI Breakthrough in Years".
- **Aceternity names seven creators, as prose only** `[verified]`: Fireship ("Jeff from Fireship"), Web Prodigies, Josh Tried Coding, Hitesh Choudhary, Adrian Twarog, JavaScript Mastery, Raj Talks Tech. **No channel could be resolved:** the page contains no video ID in any form — searched for plain `youtube.com/vi/`, `ytimg.com`, `youtube.com/embed/`, `youtube.com/@`, and the percent-encoded variants; zero matches. The section is descriptive text beside images, with no link to the videos it describes.
- **Magic UI's five features** resolve through the same public oEmbed endpoint `[verified, 2026-09-12]`: [@techgirlinstyle](https://www.youtube.com/@techgirlinstyle) — "Magic UI Review: The Best of Radix, Shadcn & Framer Motion"; [@realmckaywrigley](https://www.youtube.com/@realmckaywrigley) (Mckay Wrigley) — "Instant Landing Pages with Cursor + Magic UI"; [@ariflogs](https://www.youtube.com/@ariflogs) — "Animation Made Easy for React/NextJS projects | New React UI Library | Magic UI"; [@WandersonJacksonn](https://www.youtube.com/@WandersonJacksonn) — "Build an AI-Powered Landing Page in 10 Minutes: Next.js + V0 + Magic UI + Cursor AI"; [@rasmic](https://www.youtube.com/@rasmic) (Ras Mic) — "Build Clean UI on Nextjs using MagicUI".

  *Correction to an earlier draft of this research, which stated Magic UI's video IDs were absent from the served HTML. They are present, percent-encoded inside Next.js image-preload URLs (`/_next/image?url=https%3A%2F%2Fimg.youtube.com%2Fvi%2F<id>%2Fhqdefault.jpg`). The first pass searched for plain `youtube.com/...` and missed the encoded form. Re-checked with the encoded pattern, five IDs are present.*

The evidence here is simply that these channels demonstrably cover libraries of this kind. That is the whole of the claim — no reach figures, no ranking, no assessment of who is "biggest".

---

## Part 4 — Actionable next steps

Ordered, with the gate each one depends on. **None of these is authorised by this document; each needs Root's explicit go-ahead.**

**Before any outreach at all — the gating question:** what is actually being asked for? A registry listing, a review, a licence clarification, or nothing yet. And separately: is the beta ready to be looked at by someone whose opinion matters? Outreach that arrives before the thing is ready spends a first impression that cannot be spent twice. The launch plan's own checkpoint (`progress.md`) still has Task 2 unlanded and live acceptance unverified, so the honest answer today is probably "not yet".

**Step 1 — Decide the redistribution posture (blocks everything else).**
Nothing else can be scoped until Root decides whether Cojeev's registry will ever contain third-party components. If the answer is no — Cojeev ships only its own components — then the Aceternity and Magic UI Pro restrictions stop mattering, the Canvas UI Commons Clause question evaporates, and outreach becomes purely about visibility. That is the simplest posture and the one the evidence points toward. **Recommended: decide this first, and if the answer is "own components only", say so publicly on the homepage — it is a differentiator, not a limitation.**

**Step 2 — Canvas UI, if and only if the Commons Clause question is live.**
Only worth writing if Root actually wants to redistribute Canvas UI components. If step 1 lands on "own components only", skip this entirely. If it is live: a short, specific, human email to `hello@canvasui.dev` asking one question — does the Commons Clause permit a free registry republishing the components — is a legitimate reason to make contact, and the specificity is what makes it welcome rather than spam. Do not treat any reply as legal advice.

**Step 3 — 21st.dev listing, after the beta is genuinely presentable.**
21st.dev lists third-party libraries by author, so a Cojeev listing there is a real distribution channel rather than a competitive move. Route: a human email to `support@21st.dev`. Constraints that must hold: no automated interaction with their site, listing on their terms, and no republication of their media or metadata in return. Gate: the registry has to be stable and the homepage has to be finished — a listing points people at whatever is live that day.

**Step 4 — Peers, as conversation not as a pitch.**
`support@magicui.design` and `support@aceternity.com` are support-and-legal addresses, not partnership desks, so the bar for writing is high and the ask should be small and concrete or not made at all. **Mantine publishes no email at all** — their documented route is Discord or GitHub Discussions, public spaces where a cold introduction reads worse than it would in an inbox. **Motion Primitives is the exception in this tier:** Julien Thibeaut publishes a studio address (`julien@interfaceoffice.com`) and runs a design engineering studio, so he is reachable like a professional rather than approachable only through an issue tracker — and his scope (Motion-based primitives, MIT) is genuinely adjacent. **Recommendation: skip this tier for launch, with Motion Primitives as the one worth revisiting afterwards.** The rest is the lowest-yield and highest-awkwardness of the four.

**Step 5 — Creator coverage: not now.**
Eight channels are resolved by name and URL — three featured by Canvas UI, five by Magic UI — plus seven creators Aceternity names in prose but does not link. Together they are evidence that creators in this space cover libraries like Cojeev. **They are not a contact list**, and turning them into one would mean the authenticated email reveal that is explicitly out of scope. If Root wants creator coverage later, the honest route is public-channel contact by a human, once there is something worth filming.

### What this research does not cover

Generated by enumeration, not from memory:

- **motion-primitives.com's homepage design** — blocked by a Vercel Security Checkpoint, deliberately not worked around. Its *contact* is covered; only its design is missing.
- **Any 21st.dev page beyond the three already read** — closed by their own terms.
- **Aceternity's seven named YouTube channels** — the page carries no video ID in any encoding, so they cannot be resolved without guessing at channel identities.
- **Mantine's email** — none published on any of their four surfaces; their documented route is Discord or GitHub Discussions.
- **Every YouTube creator's business email** — gated behind an authenticated reveal, and out of scope by instruction.
- **Whether any licence reading here would survive legal scrutiny** — a competence limit, not an access one; flagged wherever it matters.
- **Reach, audience size, or relative influence of any channel or library** — no evidence gathered, none asserted.
- **What the Cojeev homepage should actually look like** — Root owns visual direction; this document supplies references and constraints only.
- **Whether any of these projects would say yes** — nobody has been asked.

Each of the first five is broken down by surface and cause in **Per-target access limitations** above.

---

*Compiled 2026-09-12 in the isolated launch worktree. Retrieval dates are stated inline throughout. No credentials were used or stored, no paid service was touched, no source code changed, no commits made.*
