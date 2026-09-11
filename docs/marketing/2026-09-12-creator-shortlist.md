# Creator shortlist and launch routes — 000h by Cojeev

**Date:** 2026-09-12 · **Status:** research complete, revised after editorial review · **Author:** executor agent (creator outreach research)

**Nothing here has been sent, posted, submitted, subscribed to or published.** No creator was contacted. No comment was left. No email was sent. No community post was made. No sponsorship was enquired about and **no spend is authorised by this document**. Every draft is marked **HOLD**.

---

## How to read this document

**Every row is cited.** Each factual claim carries the public URL it came from and the date it was read (2026-09-12). Channel names, video titles and publication dates were taken from each page's own machine-readable metadata (`ownerChannelName`, `<meta name="title">`, `itemprop="datePublished"`) — not from memory and not from a summariser.

**Metadata was verified; video substance was not.** This research confirmed that each video exists, who published it, what it is called and when. **It did not watch any video.** Nothing in this document may claim what a video argued, concluded or got right. Every comment draft below is therefore written as a question, not as a reaction — **and each one must be rewritten after actually watching its video, then approved by Root, before it goes anywhere.**

**No email is guessed.** Every address is quoted from a page that publishes it. Where a creator publishes none, the row says **not publicly verified** and gives the route they do publish. **No YouTube "View email address" reveal was used** on any channel — that is a gated, authenticated action and it was not touched. **No commit emails were harvested.**

**No reach, ranking or influence is asserted.** Subscriber and view counts were not collected. "Fit" below means only: *this channel demonstrably publishes work of this kind*, evidenced by a specific video.

**Policy sources are paraphrased, not reproduced.** Each policy and community-rules page is linked so you can read it in full at source; quotation from any one page is kept to a short identifying fragment.

---

## Product facts used in the angles

Verified in this repository on 2026-09-12. **Three claims in the first draft of this document were wrong and are corrected here** — see the note under the table.

| Fact | Where it is in the repo |
|---|---|
| MIT-licensed React component library, installed through the shadcn registry | `LICENCE`; `README.md`; `registry.json` |
| The `Slider` is **built on Radix** — it imports `@radix-ui/react-slider` — and its `appearance="rubber"` mode replaces the rendered track with a generated SVG path | `registry/cojeev/ui/slider.tsx:6,15,22` |
| In that mode, the strand's **waist is computed from the value's extent**, so it narrows as the value is pulled out. The file's own comment: "value, not speed, stretches the gum" | `registry/cojeev/motion/slider-geometry.ts:5-9` |
| **Velocity does something different** — it offsets the strand's midline (`bend`) and reshapes the thumb along its axis of travel. It does not drive the waist | `registry/cojeev/motion/slider-geometry.ts:11-18` (`bend`), `:25-30` (`sliderThumbPath`) |
| Both rubber-track functions together are 13 lines (`:6-18`), in a 37-line file | `registry/cojeev/motion/slider-geometry.ts:6-18` |
| The rubber slider is keyboard-operable (Home / End / arrows) | `components/examples/motion-progress.tsx:23` |
| Nine named motion characters plus an off state, set at project level | `registry/cojeev/motion/settings.ts:17` |
| `motion-drawer` — "a reference-faithful edge drawer, floating quick panel, layered workspace and bottom action tray" | `registry.json`, item `motion-drawer` |
| `bento-grid` / `bento-builder` — compose a layout, then install just the lightweight renderer | `registry.json`, items `bento-grid`, `bento-builder` |
| `assembly-part` — a persistent native component that **stays mounted** while it moves between a floating organism and its measured layout | `registry.json`; `registry/cojeev/ui/assembly-part.tsx:132` |
| While not yet released into the layout, that part is `inert` and `aria-hidden` — **so it is not focusable while floating** | `registry/cojeev/ui/assembly-part.tsx:132` |
| `shape-artwork` — SVG silhouette with cast shadow and rotated rear outline; the same vector layers drive the live preview and the standalone SVG export | `registry.json`, item `shape-artwork` |
| `icon` — 1,722 icon names with Cojeev micro-interactions, outline / duotone / organic treatments, built on Lucide geometry | `registry.json`, item `icon` |
| Reduced-motion is respected; decorative scenes stop work offscreen | `README.md` |

**Corrections applied after checking the source.** The first draft of this document claimed (a) the rubber track's waist is driven by extent *and velocity*, (b) the slider is "not a skin over a Radix track", and (c) assembly parts are "focusable and keyboard-operable while still floating". **All three are wrong.** The waist is driven by extent alone; the slider is built on Radix Slider primitives; floating parts are `inert` and `aria-hidden` until released. Anyone reading a draft below is reading the corrected version — and a reviewer who opens `slider.tsx` will see Radix on line 6, so the honest framing is *Radix for behaviour, own geometry for the track*.

**Live-surface check, 2026-09-12 (facts, not a readiness claim):**

| URL | HTTP | Note |
|---|---|---|
| `https://000h.cojeev.com` | 200 | `<title>000h by Cojeev</title>` |
| `https://000h.cojeev.com/docs/` | 200 | — |
| `https://github.com/luv-jeri/cojeev-ui` | 200 | publicly reachable |
| `https://luv-jeri.github.io/cojeev-ui/` | 200 | — |
| `https://luv-jeri.github.io/cojeev-ui/r/registry.json` | 200 | — |

These URLs resolve. **That is not the same as the release being accepted.** `progress.md` still records live acceptance as unverified, so **every draft here stays on HOLD until Root confirms it.**

---

## Platform rules, and our own house practice — kept separate

### What the platforms actually say

**YouTube's Spam Policy** — [support.google.com/youtube/answer/2801973](https://support.google.com/youtube/answer/2801973), read 2026-09-12. In summary: it prohibits content, metadata and behaviour designed to exploit the community or mislead viewers, and it states that it applies to comments as well as to videos. Among the behaviours it lists as violations are comments that are "high-volume, repetitive, or deceptive" and used to drive traffic — with posting near-identical channel-promotion messages across many videos given as its own example. The page also says plainly that asking viewers to like, comment or subscribe is fine, so it is not a blanket ban on promotion.

**LinkedIn's Spam page** — [linkedin.com/help/linkedin/answer/a1338787](https://www.linkedin.com/help/linkedin/answer/a1338787), read 2026-09-12. It lists engagement-manipulation behaviours it may remove or down-rank, including "excessive, irrelevant, or repetitive comments or messages", chain-letter posts that request likes and shares, and posts that misrepresent how LinkedIn's own features work in order to farm engagement.

**LinkedIn's Professional Community Policies** — [linkedin.com/legal/professional-community-policies](https://www.linkedin.com/legal/professional-community-policies), read 2026-09-12. It requires members to use their true identity and to share information that is real and authentic.

### What we choose to do, which is stricter

These are **Cojeev's own guardrails, not platform requirements.** They are deliberately more conservative than the rules above, because the cost of reading as spam is higher than the cost of posting less.

1. **One comment per creator, on one video, written for that video.** The policy targets high-volume repetitive comments; a handful of distinct, on-topic comments is not that. We are choosing a hard limit of one anyway.
2. **No link in the comment.** Not a stated platform rule. Our reason: a comment ending in a URL reads as traffic-driving even when the substance is real, and the substance is what we want read. **The earlier draft of this document claimed YouTube "frequently holds link comments for review" — that was not verified and has been removed.**
3. **Maker affiliation stated in the comment itself.** Not a stated YouTube rule for comments; it is our rule, and it is what LinkedIn's authenticity requirement asks for on that platform.
4. **The comment must stand up without the product sentence.** If deleting the 000h line leaves nothing worth reading, don't post it.
5. **No automation, anywhere.** Every comment, post and email is written and sent by a person.
6. **The creator's own stated rules outrank all of the above.** Checked 2026-09-12: none of the twelve videos below publishes comment rules in its description. Re-check the description and any pinned comment before posting, since descriptions change.

---

## Access record — what declined automated access

| Source | What happened | Consequence |
|---|---|---|
| `reddit.com/r/reactjs/about/rules.json` and `/r/webdev/about/rules.json` | HTTP 403, 2026-09-12 | **Not retried, no user-agent substitution attempted.** Reddit is therefore *not* one of the three community routes below — its self-promotion rules could not be read here, and recommending a route whose rules you have not read is the error this document is trying to avoid |
| `themeselection.com/contact-us/` | HTTP 403, 2026-09-12 | Not retried. ThemeSelection noted as observed only, not shortlisted |
| `loggingstudio.com` (linked from Arif Logs' channel) | Connection failed, 2026-09-12 | Not retried; not used as a contact route |

Per instruction, **21st.dev was not fetched again** and `motion-primitives.com` was not retried. No further peer-library licensing information was collected.

---

## Part 1 — Creator shortlist (12 rows)

Fit was decided by reading each channel's actual recent video list, not by reputation.

**On the comment drafts.** Each is 35–65 words and contains: a maker disclosure, at most one product fact, and one genuine technical question tied to the video's verified title. They contain **no claim about what the video said**, because no video was watched. They are starting points that must be rewritten after viewing.

---

### Row 1 — OrcDev · strongest fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@orcdev](https://www.youtube.com/@orcdev) — canonical `https://www.youtube.com/channel/UCClMPKqtJ1LbRBCDP948g5Q`, channel name "OrcDev" |
| **Video** | [youtube.com/watch?v=az8zNsfkhaQ](https://www.youtube.com/watch?v=az8zNsfkhaQ) |
| **Title / date** | "Top 10 Shadcn UI Libraries You NEED in 2026" · published **2026-05-01** (`2026-05-01T06:00:08-07:00`) |
| **Why this creator** | His recent titles are overwhelmingly shadcn-registry coverage — also "4 UI Libraries You've Never Heard Of" ([DTD3OoEwoLU](https://www.youtube.com/watch?v=DTD3OoEwoLU), 2026-06-03), "This Tool Fixes Every Shadcn Project", "NEW Shadcn Components Revealed!", "The Biggest Web UI Breakthrough in Years" ([aVgR5YHk4QA](https://www.youtube.com/watch?v=aVgR5YHk4QA), 2026-07-24). His channel also links his own registry, `8bitcn.com` |
| **Component angle** | A roundup rewards one thing you can see. `Slider appearance="rubber"` (`registry/cojeev/ui/slider.tsx:15`) keeps Radix Slider for behaviour and replaces the track with a generated SVG path that narrows at the waist as the value stretches (`registry/cojeev/motion/slider-geometry.ts:5-18`), while Home / End / arrows still work |
| **Contact — organic route** | **Public social, published on his channel about page (read 2026-09-12):** [x.com/orcdev](https://x.com/orcdev), [github.com/TheOrcDev](https://github.com/TheOrcDev), Discord `discord.gg/uFB5YzH9YG`, [orcdev.com](https://www.orcdev.com/) |
| **Contact — not for outreach** | `sponsors@orcdev.com` appears as `mailto:sponsors@orcdev.com` on [orcdev.com](https://www.orcdev.com/). **It is a paid-sponsorship inbox and is recorded as evidence only. No paid enquiry is authorised, so do not write to it** |

**Comment draft — HOLD (53 words)**

> Maker note: I build 000h by Cojeev, an MIT shadcn-registry library, so I'm not a neutral viewer here. Question that roundups like this raise for me — when you compare registry libraries, do you weigh how much a component changes underneath the Radix primitive, or mainly how it looks? Curious which decides it.

---

### Row 2 — Jan Marshal · strongest fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@janmarshalcoding](https://www.youtube.com/@janmarshalcoding) — channel name "Jan Marshal" |
| **Video** | [youtube.com/watch?v=HEG6vCUKLqk](https://www.youtube.com/watch?v=HEG6vCUKLqk) |
| **Title / date** | "5 Insane Shadcn/ui Component Libraries You Need to See" · published **2026-06-24** (`2026-06-24T06:30:40-07:00`) |
| **Why this creator** | He has published this format three times: "I found the BEST React Component Libraries Built on top of Shadcn UI" (`kh-QOXuwywg`), "I Found the ULTIMATE React Component Libraries Built on Shadcn UI" (`cjZjqP3EqdE`), and the 2026 one above. A recurring format means there is a next one |
| **Component angle** | `organism-assembly` / `assembly-part` (`registry.json`) — a real component that **stays mounted** while it travels from a floating cluster of shapes into its measured position, rather than a preview being swapped for a live component. Note the honest limit: while floating it is `inert` and `aria-hidden` (`registry/cojeev/ui/assembly-part.tsx:132`), so it becomes interactive on arrival, not before |
| **Contact — organic route** | **[x.com/janmarshaldev](https://twitter.com/janmarshaldev)**, published on his channel about page (read 2026-09-12). This is the route to use |
| **Contact — not for outreach** | A chain exists — channel → [janmarshal.com](https://janmarshal.com/) → [marshalcode.com](https://www.marshalcode.com) → its contact page, which is branded "SyntaxPath" and publishes `support@syntaxpath.com` for questions about a tutorial, the starter kit or the course. **It is a product-support inbox under a different brand name, three hops out. Recorded as evidence only; not verified as his, and not an outreach route** |

**Comment draft — HOLD (48 words)**

> I maintain one of these, 000h by Cojeev (MIT, shadcn registry) — flagging that up front. A question about your criteria: when you pick five, does a library need components that behave differently from the Radix primitive underneath, or is a coherent design language enough on its own?

---

### Row 3 — Arif Logs · strong fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@ariflogs](https://www.youtube.com/@ariflogs) — channel name "Arif Logs" |
| **Video** | [youtube.com/watch?v=mc-fNBM6r8U](https://www.youtube.com/watch?v=mc-fNBM6r8U) |
| **Title / date** | "I Found The Most Unique Shadcn Based UI Libraries!" · published **2026-01-16** (`2026-01-16T03:38:07-08:00`) |
| **Why this creator** | Sustained shadcn coverage by title — "ShadCN Just Dropped the Biggest Update of 2025!", "ShadCN V3 is a Game Changer! \| ShadCN MCP", "ShadCN UI Ecommerce Blocks are FINALLY Here!", "Why Does Everyone Love Fumadocs, Including Shadcn?" (relevant: 000h's documentation uses Fumadocs, per `README.md`), "Animations Using Only TailwindCSS v4!" |
| **Component angle** | `shape-artwork` (`registry.json`) exports the same vector layers it renders — silhouette, cast shadow, rotated rear outline — as standalone SVG or React, carrying the current shadow and outline settings. Pairs with the 1,722-name `icon` set built on Lucide geometry with outline, duotone and organic treatments |
| **Contact** | **Not publicly verified.** His channel publishes four links (read 2026-09-12): [loggingstudio.com](https://loggingstudio.com) (connection failed, not retried), [retroui.dev](http://retroui.dev), [x.com/ariflogs](https://twitter.com/ariflogs), Discord `discord.gg/jfSYD4JXkX`. **retroui.dev publishes `contact@neobrutalism.com`, but that page's own author metadata names "NeoBrutalism" / neobrutalism.com — not him — so it is not his address and must not be used as one.** Route: X, or his Discord under that server's rules |

**Comment draft — HOLD (43 words)**

> Maker disclosure: I build 000h by Cojeev, MIT, on the shadcn registry. Genuine question about "unique" — do you count a library as unique when it draws its own shapes and icons, or does that only count when the interaction behaviour differs too?

---

### Row 4 — Hyperplexed · strong fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@Hyperplexed](https://www.youtube.com/@Hyperplexed) — canonical `https://www.youtube.com/channel/UCmEzz-dPBVrsy4ZluSsYHDg`, channel name "Hyperplexed" |
| **Video** | [youtube.com/watch?v=1YGSVVBnqrg](https://www.youtube.com/watch?v=1YGSVVBnqrg) |
| **Title / date** | "A viewer sent me an insanely cool effect" · published **2026-07-29** (`2026-07-29T15:15:41-07:00`) |
| **Why this creator** | The title states the channel's format — an effect arrives from a viewer and gets rebuilt. The video's own description links a GitHub repo for the effect (`github.com/githyperplexed/double-helix-gallery`), so the submission-to-episode path is visible in public metadata. He is also one of three creators Canvas UI features |
| **Component angle** | One effect, not a library. `sliderRubberProfile` / `sliderRubberPath` (`registry/cojeev/motion/slider-geometry.ts:6-18`, thirteen lines between them) generate a track path whose waist narrows as the value's extent grows, with thumb velocity offsetting the strand's midline |
| **Contact** | `hello@hyperplexed.io` — published on [hyperplexed.io/contact](https://hyperplexed.io/contact) under the heading "Email", introduced as "You can reach me at". **Note:** the page renders it through Cloudflare's email obfuscation; the value is in the page's own `data-cfemail` attribute and decodes to `hello@hyperplexed.io`. The page describes itself as being for questions or feedback, so this is a genuinely open route |

**Comment draft — HOLD (51 words)**

> Maker disclosure: I build 000h by Cojeev, an MIT React library. One of its sliders swaps the track for an SVG path whose middle thins as the value stretches. Question for you — with viewer submissions, do you prefer getting a live page, or just the bare maths behind the effect?

---

### Row 5 — Better Stack · strong fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@betterstack](https://www.youtube.com/@betterstack) — canonical `https://www.youtube.com/channel/UCkVfrGwV-iG9bSsgCbrNPxQ`, channel name "Better Stack" |
| **Video** | [youtube.com/watch?v=JZf_m_BVDaQ](https://www.youtube.com/watch?v=JZf_m_BVDaQ) |
| **Title / date** | "This component library is mind-blowing (Canvas UI)" · published **2026-08-01** (`2026-08-01T19:00:07-07:00`) |
| **Why this creator** | This is a component-library video, which is the relevant precedent. They have others: "I Found the BEST UI Library" ([aQB0B3a1fh8](https://www.youtube.com/watch?v=aQB0B3a1fh8), 2025-05-13), "Shadcn is now PERFECT for Vibe Coding (v2 changes)" (`sIvYbCZzAts`), "Vuetify vs PrimeVue — BEST UI Framework Breakdown" (`CL8xW84S-lA`). **Note: an earlier draft of this document used their open-weights TTS licensing video instead. That was the wrong target — it is not a component-library video — and it has been replaced** |
| **Component angle** | The plain licensing facts, since open-source posture is a recurring subject on that channel: MIT (`LICENCE`), no paid tier, components install as source into the consumer's own project through the shadcn registry with no dependency on any private Cojeev application (`README.md`), fonts under their own SIL Open Font Licences (`FONT-NOTICES.md`), attributed icon geometry keeping its bundled notices |
| **Contact** | `hello@betterstack.com` — published on the [betterstack.com](https://betterstack.com/) homepage as a `mailto:` link, verified in the served HTML 2026-09-12. This is a company address; the video's presenter is not separately reachable, so a message should ask to be passed on |

**Comment draft — HOLD (47 words)**

> Flagging that I maintain one of these: 000h by Cojeev, MIT, shadcn registry. A question about how you assess them — when a component library looks strong in a demo, what is the first thing you check to see whether it holds up in a real project?

---

### Row 6 — techgirlinstyle · strong format fit, activity caveat

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@techgirlinstyle](https://www.youtube.com/@techgirlinstyle) — channel name "techgirlinstyle". Her channel description, read 2026-09-12, covers tech, AI, coding and career, describes her as a principal front-end engineer with large-tech experience, and states a focus on getting women into tech |
| **Video** | [youtube.com/watch?v=AkN6xJcnVYs](https://www.youtube.com/watch?v=AkN6xJcnVYs) |
| **Title / date** | "Magic UI Review: The Best of Radix, Shadcn & Framer Motion" · published **2024-09-30** (`2024-09-30T05:00:17-07:00`) |
| **Why this creator** | The closest format match on the list by title: structured single-library reviews — also "Comprehensive Review of shadcn/ui - Is This React Toolkit Right for Your Project?" (`52phRp615rU`), "Radix UI: The Toolkit That Changes Everything (Honest Review 2024)" (`dMSS2HsrWgA`), "Framer Motion vs CSS Keyframes: Which is BETTER?" (`Qfyxz0cQl-E`), "Can AI REALLY change Component Libraries forever?" (`eIV-t9b9CvE`). **Caveat: the listing returned only 18 videos and the most recent are not from 2026, so the channel may be dormant. Confirm before writing** |
| **Component angle** | Motion as a project-level setting: nine named motion characters chosen once for the app rather than per component (`registry/cojeev/motion/settings.ts:17`), reduced-motion respected, decorative scenes idle offscreen, real controls keyboard-operable throughout (`README.md`) |
| **Contact** | **Not publicly verified.** Her channel about page publishes **no external links at all** (checked 2026-09-12) and no address appears on any surface reachable from it. The gated YouTube reveal was not used. Route: a YouTube comment |

**Comment draft — HOLD (47 words)**

> Maker note: I build 000h by Cojeev, MIT, shadcn registry, so I'm not a neutral viewer. A question your review format raises for me — when motion is configured per component rather than once per project, does that help or hurt consistency across the apps you've shipped?

---

### Row 7 — Josh tried coding · good fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@JoshtriedCoding](https://www.youtube.com/@JoshtriedCoding) — canonical `https://www.youtube.com/channel/UCvGwM5woTl13I-qThI4YMCg`, channel name "Josh tried coding" |
| **Video** | [youtube.com/watch?v=hX4a-i_Y7Vk](https://www.youtube.com/watch?v=hX4a-i_Y7Vk) |
| **Title / date** | "I Found The Most Underrated Animation Library" · published **2024-08-11** (`2024-08-11T07:00:37-07:00`) |
| **Why this creator** | A recurring "I found this library" format, and the channel is actively shipping in 2026 — "This New Tailwind Plugin is Awesome", "The AI SDK Killer is Finally Here... (Tanstack AI)", "Gemini 3.0 Is Actually Insane at UI Design" |
| **Component angle** | `motion-drawer` (`registry.json`) covers the edge drawer, floating quick panel, layered workspace and bottom action tray in one component, under one motion vocabulary |
| **Contact** | **Not publicly verified.** [joshtriedcoding.com](https://www.joshtriedcoding.com/) is a newsletter signup page with no address and no outbound links (read 2026-09-12). His channel publishes Discord `discord.gg/zPd7jQdcq5` and [x.com/joshtriedcoding](https://twitter.com/joshtriedcoding). Route: X, or his Discord under that server's rules |

**Comment draft — HOLD (49 words)**

> Disclosure: I maintain 000h by Cojeev, MIT, on the shadcn registry. A question about how you judge these — for an animation library, do you weigh how many separate packages it lets you drop, or only whether the motion itself is good? Curious which one decides it for you.

---

### Row 8 — Kevin Powell · good fit, different axis

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@KevinPowell](https://www.youtube.com/@KevinPowell) — canonical `https://www.youtube.com/channel/UCJZv4d5rbIKd4QHMPkcABCw`, channel name "Kevin Powell" |
| **Video** | [youtube.com/watch?v=fG6ToJJ9x_Y](https://www.youtube.com/watch?v=fG6ToJJ9x_Y) |
| **Title / date** | "This library changes how JS and CSS work together" · published **2026-08-05** (`2026-08-05T06:00:22-07:00`) |
| **Why this creator** | He is not a React-library reviewer and should not be approached as one. He is the best fit on the list for the *geometry and motion* layer — his 2026 titles include "Scroll-driven animations without any JS" (`bBh8fpb3h5c`), "The most fun I've had with CSS in a while thanks to offset-path" (`pMo2CzcSiko`), "Transition to and from display: none" (`KD3_l3S_D6M`), "I finally used GSAP... and I get the hype now" (`AiZsEIhIves`). The chosen video is one of the few where a library is the subject |
| **Component angle** | The rubber track's path maths (`registry/cojeev/motion/slider-geometry.ts`), offered as an open question rather than a claim — whether a shape whose middle narrows with a value could have been CSS is a fair thing to ask him |
| **Contact — organic route** | **Public social, published on his channel about page (read 2026-09-12):** Discord `discord.gg/nTYCvrK`, [bsky.app/profile/kevinpowell.co](https://bsky.app/profile/kevinpowell.co), [front-end.social/@kevinpowell](https://front-end.social/@kevinpowell), [x.com/KevinJPowell](https://twitter.com/KevinJPowell), [github.com/kevin-powell](https://github.com/kevin-powell), [codepen.io/kevinpowell](https://codepen.io/kevinpowell/) |
| **Contact — not for outreach** | `speaking@kevinpowell.co` appears as `mailto:speaking@kevinpowell.co` on [kevinpowell.co/speaking](https://www.kevinpowell.co/speaking). **It is published for speaking engagements only and is recorded as evidence. Do not use it for a library review request.** No general address is published on `kevinpowell.co`, `/about`, `/courses` or `/newsletter`; `/contact` returns 404 |

**Comment draft — HOLD (49 words)**

> Maker disclosure: I build 000h by Cojeev, an MIT React library. One slider in it regenerates its track as an SVG path rather than styling a div. Honest question, since you'd know — is there a CSS-only way to get a shape whose middle narrows as a value grows?

---

### Row 9 — Tobi Mey · good fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@tobi-mey](https://www.youtube.com/@tobi-mey) — channel name "Tobi Mey" |
| **Video** | [youtube.com/watch?v=yth_3N3LWDw](https://www.youtube.com/watch?v=yth_3N3LWDw) |
| **Title / date** | "Shadcn Just Dropped Its Biggest Update Yet" · published **2025-12-12** (`2025-12-12T14:14:26-08:00`) |
| **Why this creator** | Surfaced by searching YouTube for shadcn component-library coverage rather than by reputation. The video's subject is the shadcn registry ecosystem that 000h ships into |
| **Component angle** | `bento-grid` / `bento-builder` (`registry.json`) — compose a layout in the builder, then install only the renderer for it. A registry-shaped idea rather than a component-shaped one |
| **Contact** | `tobi@tobimey.dev` — published as `mailto:tobi@tobimey.dev` on [tobimey.dev](https://tobimey.dev/), read 2026-09-12. His channel also publishes [github.com/tobimey](https://github.com/tobimey) and [x.com/tobimey](https://x.com/tobimey) |

**Comment draft — HOLD (43 words)**

> Flagging that I ship a registry on top of shadcn: 000h by Cojeev, MIT. Question about the update — do you think the registry format's real value is that installing puts source in your own repo, or is it mostly the distribution convenience?

---

### Row 10 — Adrian Twarog · medium fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@AdrianTwarog](https://www.youtube.com/@AdrianTwarog) — canonical `https://www.youtube.com/channel/UCvM5YYWwfLwpcQgbRr68JLQ`, channel name "Adrian Twarog" |
| **Video** | [youtube.com/watch?v=IYLV26d0dOc](https://www.youtube.com/watch?v=IYLV26d0dOc) |
| **Title / date** | "37 x Interactive React JS Components to Try - Aceternity UI" · published **2024-02-12** (`2024-02-12T21:27:38-08:00`) |
| **Why this creator** | A direct format analogue — a walkthrough of a component library of this type — and Aceternity separately names him among creators who covered them. **Caveat: his 2026 titles have moved to AI tooling and no-code** ("Top 10 No Code Tools of 2026", "Hermes Agent - Crash Course", "Stop Using These AI App Builders..."). This is a warm precedent, not a live slot |
| **Component angle** | The `icon` set — 1,722 names with Cojeev micro-interactions in outline, duotone and organic treatments on Lucide geometry (`registry.json`), with replayable motion families in `animated-icon` |
| **Contact — organic route** | **Public social, published on his channel about page (read 2026-09-12):** [x.com/adrian_twarog](https://twitter.com/adrian_twarog), [dev.to/adriantwarog](https://dev.to/adriantwarog) |
| **Contact — not for outreach** | `teachme@adriantwarog.com` appears on [enhanceui.com](https://www.enhanceui.com/), in the FAQ about upgrading a plan and again in the refunds section. **It is a course-support and refunds inbox, recorded as evidence only. Do not send a review request there** |

**Comment draft — HOLD (44 words)**

> Maker disclosure: I build 000h by Cojeev, MIT, shadcn registry. A question about the walkthrough format — when you show a large number of components in sequence, what tells you a library is coherent rather than just big? Genuinely curious what you look for.

---

### Row 11 — JavaScript Mastery · medium fit

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@javascriptmastery](https://www.youtube.com/@javascriptmastery) — canonical `https://www.youtube.com/channel/UCmXmlB4-HJytD7wek0Uo97A`, channel name "JavaScript Mastery" |
| **Video** | [youtube.com/watch?v=AW1yfBKRMKc](https://www.youtube.com/watch?v=AW1yfBKRMKc) |
| **Title / date** | "Master Web Animations in 2 Hours \| Build an Awwwards-Level Website" · published **2025-06-20** (`2025-06-20T08:48:08-07:00`) |
| **Why this creator** | Not a library reviewer — a course-build channel — but the animation and creative-frontend strand is recurring ("Creative Frontend Course \| Master GSAP, Three.js & React in 10 Hours" `ATdaYQw0ptk`, "Master Creative Frontend in 2 Hours with React, Three.js & GSAP" `DEeaT6FxEws`). The realistic outcome is use inside a build, not a review |
| **Component angle** | Motion as a project-level setting (`registry/cojeev/motion/settings.ts:17`), reduced-motion respected and decorative scenes idle offscreen; the material sculptures use bounded WebGL with static fallbacks and Three.js installs only with the components that need it (`README.md`) |
| **Contact** | `contact@jsmastery.pro` — published as `mailto:contact@jsmastery.pro` on [jsmastery.com](https://www.jsmastery.com/), read 2026-09-12. `support@jsmastery.pro` appears on the same page; prefer the general `contact@` |

**Comment draft — HOLD (49 words)**

> Disclosure: I maintain 000h by Cojeev, an MIT React library where the motion character is a project-level setting rather than a per-component one. A question for a course build like this — do learners get more consistent results from one shared motion setting, or from tuning each section themselves?

---

### Row 12 — Code With Antonio · lower fit, verified contact

| Field | Value |
|---|---|
| **Channel** | [youtube.com/@codewithantonio](https://www.youtube.com/@codewithantonio) — canonical `https://www.youtube.com/channel/UCW_4e6sUTMWHxlF06aErH9w`, channel name "Code With Antonio" |
| **Video** | [youtube.com/watch?v=_y_ixdk9aRg](https://www.youtube.com/watch?v=_y_ixdk9aRg) |
| **Title / date** | "Build and Deploy an AI Coding Agent \| Cursor Clone with Next.js 16 \| Full Course 2026" · published **2026-01-30** (`2026-01-30T05:45:11-08:00`) |
| **Why this creator** | **Fit stated honestly: he has no library-review videos.** His channel is long-form full-stack builds (Jira, Slack, Miro, Cursor clones), all needing a UI layer, in the shadcn ecosystem. Listed because the contact is verified and the adoption path is plausible — not because a review is likely. **If Root wants a shorter list, cut this row and Row 10 first** |
| **Component angle** | The registry install that puts source in the viewer's own repo (`README.md`), and the task, conversation and agent panels plus the reusable action dock, which are composed from the same base primitives (`README.md`) |
| **Contact** | `team@codewithantonio.com` — published as `mailto:team@codewithantonio.com` on [codewithantonio.com](https://www.codewithantonio.com/), read 2026-09-12. Reached from his channel bio link `cwa.run/yt`, which redirects there |

**Comment draft — HOLD (45 words)**

> Maker disclosure: I build 000h by Cojeev, MIT, on the shadcn registry. A question about long builds like this — when a project needs chat, task and tool-trace panels, do you prefer taking all three from one library, or picking whichever fits each panel best?

---

### Checked and deliberately not shortlisted

Refined on evidence. Each was on the candidate list or surfaced during search, and each was read before being set aside. **These are observations about publishing history and published contact surfaces only — not judgements of anyone's work.**

| Creator | Channel | Why not |
|---|---|---|
| **Fireship** | [@Fireship](https://www.youtube.com/@Fireship) | The 30 most recent titles, read 2026-09-12, are AI-industry news; none is component-library coverage. The Aceternity mention is a 2024-era precedent. Contact is also weak: the only address found, `hi@fireship.dev`, appears **on the site's 404 page** as the address for reporting a missing page — not a business route |
| **Hitesh Choudhary** | [@HiteshCodeLab](https://www.youtube.com/@HiteshCodeLab), [@chaiaurcode](https://www.youtube.com/@chaiaurcode) | Recent titles are Spring Boot, FastAPI, Kubernetes, observability, LLM tooling and system design. The shadcn crash course on @chaiaurcode is roughly two years old. No email published on [hitesh.ai](https://hitesh.ai/) or [chaicode.com](https://chaicode.com/) |
| **Web Prodigies** | [@WebProdigies](https://www.youtube.com/@WebProdigies) | Long-form SaaS builds, with the 2026 slate moving toward Claude Code and AI systems. [webprodigies.com](https://webprodigies.com/) is a funnel site whose only email in source is the placeholder `you@example.com`; the channel's single external link is a Skool community |
| **Mckay Wrigley** | [@realmckaywrigley](https://www.youtube.com/@realmckaywrigley) | The Magic UI video exists, but recent titles are AI coding agents and Obsidian workflows |
| **Ras Mic** | [@rasmic](https://www.youtube.com/@rasmic) | Same pattern — agentic engineering and AI subscriptions, with one adjacent title, "Building beautiful UI using AI (My design workflow)" |
| **ThemeSelection** | [@themeselection](https://www.youtube.com/@themeselection) | On-topic by title ("10 Best Shadcn UI Libraries Every Developer Should Know (2026)"), but it is a commercial template vendor's own channel, so a roundup slot may be a commercial placement rather than editorial. Their contact page returned **HTTP 403 and was not retried**, so no contact was verified |
| **Josef Bender** | [@josefbender](https://www.youtube.com/@josefbender) | On-topic recent title "Shadcn UI? in 2026?". [josefbender.com](https://www.josefbender.com/) publishes no email and its served HTML exposes no links; `/contact` returns 404. Held back only for lack of a verifiable route |

---

## Part 2 — LinkedIn: three launch routes and a maker post

All three follow the LinkedIn pages summarised above. None uses engagement bait, a share request, or automation.

**Route A — a first-person maker post from Sanjay's own profile, with the work visible in the post itself.** LinkedIn requires true identity and authentic information, which a personal maker post satisfies by construction. Put a short screen recording of one component directly in the post rather than relying on a link preview, so a viewer who never leaves the feed still sees the thing. Reply to comments yourself. **Recommended primary route.**

**Route B — a LinkedIn article, not a post, on one narrow technical decision.** An article stays findable and holds code and images a post cannot. The subject should be one decision with a genuine trade-off. The rubber slider is the honest candidate: it keeps Radix Slider for behaviour and replaces only the drawn track, which is a real architectural choice with costs on both sides. Link the library once, at the end, as a source rather than a call to action.

**Route C — one comment on someone else's post, where there is something real to add.** Not a campaign. LinkedIn lists excessive, irrelevant or repetitive commenting as spam, so the rule is: comment when you would have commented anyway, disclose that you build a library in the ecosystem, and don't paste the link. **No tool may comment on your behalf.**

### Maker post draft — HOLD

Every factual sentence below traces to the repo. Lines in `[brackets]` are personal-voice claims this research cannot verify — **Root must confirm each one is true or cut it.** Nothing here reports an experience on Sanjay's behalf.

> I've been building a React component library, and I want to describe one decision in it rather than pitch the whole thing.
>
> It's called 000h. MIT licensed, installed through the shadcn registry — which means the source lands in your project and is yours to edit, rather than arriving as a dependency you can't touch.
>
> The decision is in the slider.
>
> It uses Radix Slider underneath, so the behaviour, the keyboard handling and the accessibility come from a primitive that is already well tested. What it replaces is only the drawing: in `rubber` mode the track is not a styled div but an SVG path, regenerated as the value changes, whose middle narrows as the value is pulled further out — like a stretched strand of gum. Drag velocity is a second, smaller input: it offsets the strand's midline and reshapes the thumb along its direction of travel.
>
> The constraint that shaped it is that none of this may cost you anything. Home, End and the arrow keys behave exactly as they would on a plain slider. Reduced-motion is respected. Someone navigating by keyboard gets an ordinary, correct control and none of the theatre.
>
> [That tension — expressive by default, plain when it should be — became the brief for the whole library rather than a detail of one component.]
>
> [If you build interfaces in React, the source is open and readable, and I'd rather someone told me where it's wrong than have nobody look.]
>
> — Sanjay, maker of 000h by Cojeev

*Why it fits the rules: no "comment below for the link", no share request, no reaction bait, first-person and honestly attributed, and it is worth reading without clicking anything.*

---

## Part 3 — Three community launch routes, with their actual rules

Reddit is deliberately absent: its rules endpoint returned HTTP 403 here and was not retried, so its self-promotion rules could not be read.

### Route 1 — Show HN

Rules paraphrased from [news.ycombinator.com/showhn.html](https://news.ycombinator.com/showhn.html) and [news.ycombinator.com/newsguidelines.html](https://news.ycombinator.com/newsguidelines.html), both read 2026-09-12. **Read them in full at source before submitting.**

Show HN is explicitly for "something you've made that other people can play with". Reading material — blog posts, signup pages, newsletters, lists — is off topic there precisely because it cannot be tried. The project must be your own and you must be present in the thread to discuss it. Barriers such as signups or email walls are discouraged because they cost you feedback. If the work isn't ready to be tried, the page asks you to wait and come back when it is. Routine version bumps generally aren't substantive enough, though a major overhaul may be. Soliciting upvotes or comments is prohibited. The site guidelines separately ask that HN not be used primarily for promotion — posting your own work part of the time is fine.

**What that means concretely.** 000h qualifies: the docs site is live, there's no signup, and the components can be tried in a browser. Submit the **docs/components URL**, not a landing page. Title it plainly — `Show HN: 000h – MIT React components with organic shapes and motion`. Be in the thread answering questions; that is a requirement, not a courtesy. **Ask nobody to upvote.**

### Route 2 — Lobsters

Rules paraphrased from [lobste.rs/about](https://lobste.rs/about), read 2026-09-12. Their stated rule of thumb is that self-promotion should stay under a quarter of a user's stories and comments, and submitters are required to tag their own stories from a predefined list.

**What that means concretely.** The quarter rule is a *history* requirement, not a submission checkbox — an account whose first and only post is its own project cannot satisfy it. If nobody at Cojeev has a Lobsters account with genuine comment history, this route is not available now and should not be forced. **An earlier draft of this document also called Lobsters "invitation-based"; that was not verified on the page read here and has been removed.** Treat this as a later route that has to be earned.

### Route 3 — Reactiflux (the React community Discord)

Rules paraphrased from [reactiflux.com/promotion](https://www.reactiflux.com/promotion), read 2026-09-12. The page opens by saying "This is a community, not a free audience", and rules out prominent commercial activity — recruiting, lead generation, marketing, market research, solicitation — outside channels meant for it. Its recommended way to share your own work is to be an active, positive member and to offer it when it genuinely answers someone's question. Before posting anything that might read as commercial, it asks you to request the channel's permission and state your intent plainly. Paywalled material should generally only be shared in response to another member, and episodic content should be promoted as a whole rather than episode by episode, at most fortnightly.

**What that means concretely.** Enter as a participant. Share 000h when it is the answer to something asked. Ask the channel first if a post could read as commercial. This is a slow route by design.

---

## Part 4 — First-week schedule (low volume)

Ordered by dependency, not by clock. Nothing starts before Root confirms live acceptance.

**Gate (before Day 1).** Root confirms live acceptance. Concretely: the docs site loads on a phone and on a cold cache; `npx shadcn@latest add` succeeds against the public registry from a clean project; licence and font notices are reachable from the homepage; the README's claims match what is actually installable. **Separately, every comment draft has been rewritten after watching its video, and approved.**

**Day 1 — the owned surface only.** Publish the LinkedIn maker post (Route A). Nothing else. This is the day something breaks, and it should break in front of your own network. Fix whatever the first readers hit.

**Day 2 — quiet.** Act on Day 1's feedback. No new channel.

**Day 3 — Show HN.** Only if Day 1 surfaced nothing structural. Submit, then stay in the thread and answer. One submission; no second attempt that week.

**Day 4 — quiet.** Act on the thread's feedback, which is usually the most useful of the week.

**Day 5 — the first three creator comments.** Rows 1, 2 and 4 (OrcDev, Jan Marshal, Hyperplexed) — strongest fits, each on its own video, each rewritten after viewing. **Three, not twelve.** By hand, from a normal signed-in account.

**Day 6 — the first two creator emails.** Rows 4 and 9 (`hello@hyperplexed.io`, `tobi@tobimey.dev`) — the two addresses published as genuinely open contact routes. Two emails. **No email to `sponsors@`, `speaking@` or `teachme@`.**

**Day 7 — stop and read.** No new outreach. Count what happened: replies, issues opened, installs attempted, questions asked twice. Week two is built from that, not from this document.

**Standing limits:** at most three creator comments in a day; never two on the same channel; no follow-up to an unanswered email inside the same week; and a creator's own stated rules outrank everything here.

---

## Part 5 — Creator pitch email (organic review request)

**HOLD.** Send only after live acceptance, only to an address whose published scope fits a general enquiry, and only one per creator. **Do not send to Rows 1, 2, 8 or 10** — their only published addresses are sponsorship, product-support, speaking or refunds inboxes.

**Subject:** `000h — MIT React component library, if it's ever useful`

> Hi [name],
>
> I'm Sanjay — I build 000h by Cojeev, and I'm writing as its maker, not as a viewer who stumbled on it.
>
> **This is not a sponsorship enquiry and there's no budget behind it.** If your inbox sorts those separately, this belongs in the other pile.
>
> I'm writing because of [exact video title] ([URL]) — [one specific, true sentence about that video, written only after watching it].
>
> What 000h is: an MIT React component library that installs through the shadcn registry, so the source lands in your own project rather than arriving as a dependency. Docs and live components: https://000h.cojeev.com · source: https://github.com/luv-jeri/cojeev-ui
>
> One thing I'd point you at: [ONE component, described plainly — for example, the slider keeps Radix underneath for behaviour and replaces only the drawn track with an SVG path that narrows as the value stretches].
>
> What I'm asking for is a look and your honest read. If it isn't right for your channel that's a completely fine answer and I won't follow up. If it is, tell me what you'd need — a build, a demo, a written breakdown — and I'll put it together.
>
> Thanks either way.
>
> Sanjay
> Maker, 000h by Cojeev · https://000h.cojeev.com

**Rules attached to this template:**

- **The video sentence must be real.** Watch the video first. Leave the placeholder in rather than inventing something.
- **Never describe another library as worse.** Say what 000h does; say nothing about what anyone else fails to do.
- **One email. No follow-up.** The template says you won't, so don't.
- **A reply is not owed and not likely.** Most cold outreach goes unanswered. That is the normal outcome and says nothing about the library.

---

## Part 6 — Press kit checklist

What a creator needs in order to say yes without doing your work for them. Build it **before** Day 5. Suggested home: a `press/` page on 000h.cojeev.com, reachable without a signup.

**Identity**
- [ ] Exact name and how to write it: **000h by Cojeev** — "000h" the library, "Cojeev" the maker. State whether "000h" is spoken as letters or as a word; people will say it on camera.
- [ ] One-line description, pre-written: "An MIT-licensed React component library with organic shapes and purposeful motion, installed through the shadcn registry."
- [ ] 50-word and 150-word versions of the same description.
- [ ] Maker attribution line, and the affiliation a creator should state on air.

**Assets**
- [ ] Logo / wordmark, SVG and PNG, light and dark.
- [ ] Six to eight component screenshots at 1920×1080, both themes, no browser chrome.
- [ ] Short silent screen recordings (MP4) of what a video would show: the rubber slider being dragged, the assembly studio composing, the drawer's four surfaces, a bento layout being built. Silent so they drop into any edit.
- [ ] A reduced-motion recording of the same components, to show the fallback honestly.

**Facts a creator will state on camera and must not get wrong**
- [ ] Licence: MIT. Fonts under their own SIL Open Font Licences. Attributed icon geometry keeps its bundled notices.
- [ ] Requirements: React 19, TypeScript, Tailwind CSS v4, an initialised shadcn project with an `@/` alias; Node.js 22.12+ to develop.
- [ ] The install command, tested from a clean project on the day the kit is published.
- [ ] Component count — matching `registry.json` that day, or phrased as a range.
- [ ] **What is built on Radix and what is original.** The slider is a good worked example: Radix for behaviour and accessibility, own geometry for the drawn track. A reviewer will open the file; the kit should say it first.
- [ ] Accessibility posture: keyboard operation of real controls, reduced-motion support, offscreen work suspension — and the honest limits, such as assembly parts being inert until they arrive in the layout.
- [ ] What the library does **not** do, written down. A creator who discovers a limitation on camera that the kit hid will say so on camera.

**Explicitly not in the kit**
- [ ] **No install counts, download numbers, adoption claims or named users.** None is verified.
- [ ] **No "production ready" claim.** Not until Root says so.
- [ ] **No testimonials**, because there are none.
- [ ] **No comparison table against other libraries.**

---

## Part 7 — Organic review request vs paid sponsorship

Two different things, never blurred in a message.

|  | Organic review request | Paid sponsorship |
|---|---|---|
| **What it is** | Asking someone to look, with no consideration offered | Buying placement in their content |
| **Authorised here?** | Drafts prepared, **all on HOLD** pending live acceptance and per-video rewriting | **No. No spend is authorised by this document. No paid enquiry was made and none should be made on the strength of it** |
| **What you may promise** | Nothing. No money, no equity, no affiliate cut, no reciprocal promotion | Not applicable — out of scope |
| **Expected outcome** | Most will not reply. Normal, and not a signal | — |
| **Editorial control** | None. If they look and dislike it, that is the review | — |
| **Disclosure** | You state that you are the maker, in the first two lines | A sponsored placement carries the creator's own disclosure obligations and, in many places, legal ones |

**Three things that must not be said, in any draft, ever:**

1. **Do not imply a review is a favour with a cost attached.** "Happy to support the channel" reads as an offer of money.
2. **Do not imply sponsorship is free.** `sponsors@orcdev.com` exists because that channel sells placements. Writing there about an unpaid review is a misuse of the address — which is why this document routes OrcDev through his public social accounts instead.
3. **Do not imply a reply is expected.** No "looking forward to hearing back", no deadline, no second email.

**If Root later wants paid placement:** a separate decision, a separate budget, a separate brief. Not authorised here, not researched here, and no rate was requested from anyone.

---

## Verification limits

Generated by enumerating the twelve rows and the remaining parts.

| Limit | Where | Detail |
|---|---|---|
| **No video was watched** | All 12 rows | Only metadata was verified — publisher, title, publication date. **Every comment draft and the pitch email's video sentence must be rewritten after actually viewing, then approved by Root** |
| **Three creators publish no email** | Rows 3, 6, 7 | Arif Logs, techgirlinstyle, Josh tried coding. Gated YouTube reveals were not used. Routes given are the social accounts they do publish |
| **Four addresses are recorded as evidence but are not outreach routes** | Rows 1, 2, 8, 10 | `sponsors@orcdev.com` (paid inbox), `support@syntaxpath.com` (product support, three hops out, different brand, not verified as Jan Marshal's), `speaking@kevinpowell.co` (speaking only), `teachme@adriantwarog.com` (course support and refunds). Each row gives a published social route instead |
| **One address is a company inbox, not the presenter's** | Row 5 | `hello@betterstack.com`; the person on camera is not separately reachable |
| **techgirlinstyle may be dormant** | Row 6 | Only 18 videos returned and the recent ones are not from 2026. Confirm activity before writing |
| **Adrian Twarog's format has moved on** | Row 10 | His component-library video is from 2024-02-12; his 2026 titles are AI tooling and no-code |
| **Reddit's self-promotion rules were not read** | Part 3 | HTTP 403 for r/reactjs and r/webdev. Not retried, no user-agent substitution. Reddit is not recommended from this document |
| **ThemeSelection's contact not verified** | Not shortlisted | HTTP 403. Not retried |
| **Lobsters availability is unknown** | Part 3, Route 2 | Their quarter self-promo rule is a history requirement; whether it is satisfiable depends on whether anyone at Cojeev has a standing account |
| **Josef Bender has no verifiable route** | Not shortlisted | On-topic channel; site publishes no address and `/contact` 404s |
| **Comment rules checked once, at one moment** | All 12 rows | All twelve descriptions were read 2026-09-12 and **none publishes comment rules**. Descriptions change — re-read the description and any pinned comment before posting |
| **Three product claims were wrong in the first draft and are corrected** | Product facts | Waist is driven by extent, not velocity; the slider is built on Radix; floating assembly parts are `inert` and `aria-hidden`, so not focusable while floating. All corrected above, and all drafts rewritten accordingly |
| **Two bracketed lines in the maker post are unverified** | Part 2 | They are personal-voice claims about Sanjay's intent. Root must confirm or cut each |
| **Live acceptance is unverified** | All parts | Five public URLs return HTTP 200 (recorded above), but `progress.md` still records live acceptance as unverified. **Everything stays on HOLD** |

---

## Verdict

**DONE_WITH_LIMITS.**

Delivered: twelve creator rows, each with an official channel URL, one exact relevant video URL, a title and publication date verified from that video's own page metadata, a component angle traced to a file in this repository, a contact route with its evidence URL and its scope stated plainly (including four addresses marked *not for outreach*), and a 35–65-word comment draft carrying a maker disclosure, at most one product fact and one genuine question. Plus three LinkedIn routes and a maker post draft, three community routes with their rules summarised and linked, a dependency-ordered first-week schedule, a creator pitch email, a press-kit checklist, and organic review kept separate from paid sponsorship.

The limits are the fourteen rows above — chiefly: **no video was watched, so every draft needs rewriting after viewing**; three creators publish no email; four published addresses are scoped to sponsorship, support, speaking or refunds and are not outreach routes; and Reddit's rules could not be read because Reddit declined automated access and was not retried.

Nothing was sent. No git commit was made. Every draft is on HOLD pending Root's confirmation of live acceptance.
