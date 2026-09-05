# TripMate AI — Project Handoff

**Purpose:** bring a brand-new Claude Code session fully up to speed without
access to any previous conversation. Read this file first, before touching code.

**Last updated:** 2026-09-05
**Repository state:** one commit (`Initial commit from Create Next App`).
Everything described below is uncommitted work in the working tree.

---

## 0. Project direction — this changed on 2026-08-29

**TripMate AI is a personal portfolio project.** It is published on LinkedIn and
used when applying for software / AI engineering roles.

**It is not a graduation project, and it never will be again.** If an earlier
note, comment, or document tells you otherwise, that note is stale — this file
and `PRD.md` v3.0 are authoritative.

**Positioning:**

> **TripMate AI — an intelligent travel planner and travel companion.**

**Do not build, and do not propose:** a research question, a multi-agent
orchestrator, a critic-and-revise loop, an A/B/C system comparison, an
evaluation harness or fixed test set, statistical significance testing, payment
or checkout of any kind, or real flight/hotel booking. All of this was in the
previous plan and has been removed on purpose.

**Do build:** features that make the product genuinely useful to a traveller and
that demonstrate a nameable, employable skill. The roadmap is §9.

**What the project demonstrates to someone reading a CV:** Next.js App Router,
React, TypeScript, LLM integration, structured AI output, external API
integration, Supabase, authentication, database design, Row Level Security,
localization with RTL, real-world data integration, and considered UI/UX.

**Two source documents exist and both matter:**

- `PRD.md` (v3.0, Portfolio Edition) — the full requirements and the Part II
  feature roadmap. This is the plan.
- `PROJECT_HANDOFF.md` — this file, the current state.

> There is no third handoff file. An older `HANDOFF.md` existed and was deleted
> on 2026-08-29 with the user's approval: it duplicated this file and still
> described the abandoned graduation direction. Do not recreate it — one
> handoff, or the two drift apart.

---

## 1. What the project is

An AI travel planner and companion focused on Saudi domestic tourism, with
international destinations also supported.

A user enters five things — origin, destination, departure date, budget in SAR,
and number of days — and receives a day-by-day itinerary with real named places
and per-day costs. The product's distinguishing behaviour is **budget honesty**:
when a budget cannot realistically cover the trip, the model says so and names a
realistic minimum rather than inventing cheap prices to appear compliant.

The interface is bilingual (English / Arabic with full RTL) with light and dark
themes. Trips are saved per user.

---

## 2. Technology stack (exact versions in use)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js, App Router, Turbopack | 16.2.12 |
| UI runtime | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Language | TypeScript, `strict: true` | 5.x |
| Validation | Zod | 4.4.3 |
| AI provider | Groq (`groq-sdk`) | 1.5.0 |
| Database + Auth | Supabase (`@supabase/ssr`, `supabase-js`) | 0.12.4 / 2.112.3 |

- Path alias: `@/*` maps to the project root (see `tsconfig.json`).
- Seven runtime dependencies. Keep it that way unless there is a real problem to
  solve — see §12.
- Development machine is **Windows**; the shell is **PowerShell 5.1**. A Bash
  tool is also available and is generally the safer choice — see §8.

---

## 3. What is implemented and verified

Every item below was exercised in a real browser against the live Supabase
project and the live Groq API, not merely written.

### Authentication
- **Email confirmation is switched off in the Supabase project** (changed
  2026-09-05). Sign-up therefore returns an authenticated session immediately
  and the user lands on `/plan`; there is no "check your email" screen, and it
  should not be reintroduced while confirmation stays off.
- `AuthForm` still checks for that session rather than assuming it: if Supabase
  returns no session and no error — which happens if confirmation is switched
  back on, and also when Supabase hides a duplicate sign-up — the form says the
  account was created and asks the user to sign in, instead of redirecting into
  a protected route the middleware would bounce them out of.
- Sign in, sign out — unchanged
- `/auth/callback` and the `emailRedirectTo` option are kept and still correct.
  They are inert while confirmation is off, and are what makes the flow work
  again if it is turned back on.
- Middleware refreshes the session on every request and redirects signed-out
  visitors away from protected routes

### Trip generation
- Server-side call to Groq using **strict JSON-schema structured output**
- Itinerary is generated in the user's chosen language (English or Arabic)
- Day count, activity length, and tip count are constrained by the prompt
- Budget warning behaviour verified: 1,500 SAR for Riyadh to Tokyo returns a
  warning naming about 6,200 SAR as a realistic minimum, with `estimatedBudget`
  set to the true cost rather than the requested one

### Place grounding (Phase 2, completed 2026-08-29)
- Each activity now carries a `place` field alongside its text, and those names
  are resolved against Geoapify server-side after the itinerary renders
- Resolved places show the provider's official name, address, a verified
  photograph where one exists, and a "View on Google Maps" link
- Verified against the live providers across Tokyo, AlUla and Taif: 15 of 17
  names resolved, 11 of those 15 with a photograph. Tokyo 6/6 photographs;
  AlUla and Taif lower because several real places have no usable image
  anywhere on Wikimedia. Correctly refused "Eiffel Tower" for AlUla, a
  nonsense string, and "AlUla Old Town" (which the geocoder could only answer
  with the city itself)
- Unresolved activities render exactly as they did before grounding existed

### Destination sections (added 2026-08-29)
- **Useful apps** — curated per country, grouped by category, official links only
- **Local essentials** — currency, language, emergency number, plug, time zone
- **Before you go** — a short checklist, ticked state kept in `localStorage`
  per trip. It says "check the entry requirements", never whether a visa is
  needed: that depends on nationality and is not a claim this app can make.
- All three appear only when the destination's country is known and curated;
  otherwise they hide or show a plain unavailable state

### Language switching (added 2026-08-29)
- Switching language translates the existing itinerary in place rather than
  regenerating it, so the reader keeps the same trip
- Chunked, sequential, and cached; place keys and all numbers pass through
  untouched

### Persistence
- Save a generated trip; it gets a permanent URL at `/result/[id]`
- List saved trips at `/my-trips`
- Delete a trip, with an inline confirmation step
- All of the above scoped per user by Row Level Security

### Interface
- Full visual design: sand background, deep navy primary, gold accent, Georgia
  serif for display headings
- Light and dark themes, persisted to `localStorage`, applied before first paint
  so there is no flash
- English / Arabic toggle, persisted to a cookie, resolved **server-side** so the
  first HTML response already carries the correct `lang` and `dir`
- Itinerary days render collapsed; tapping one reveals its activities
- Responsive and verified at 375 / 768 / desktop widths with no horizontal
  overflow
- Per-page titles, custom SVG favicon at `app/icon.svg`
- Icons are hand-written inline SVG. There is no icon library, and **no emoji is
  used as a UI icon**.

### Build health (checked 2026-08-29)
- `npx tsc --noEmit` — clean
- `npm run build` — succeeds, 18 routes generated
- `npx eslint .` — 2 errors, both pre-existing and both the same rule
  (`react-hooks/set-state-in-effect` in `app/result/page.tsx` and
  `components/ThemeToggle.tsx`). Neither has been touched. New code avoids the
  pattern by reading browser storage through `useSyncExternalStore` instead —
  see `lib/local-store.ts`.
- One warning, unrelated to correctness: Next 16.2 deprecates the `middleware`
  file convention in favour of `proxy`. Cosmetic for now.

### Security posture verified by direct probing

With no session, using only the public anon key against the Supabase REST API:

| Probe | Result |
|---|---|
| `SELECT *` on `trips` | `[]` — zero rows |
| `SELECT` by a known trip id | `[]` |
| `DELETE` a known trip | HTTP 204, **zero rows actually deleted** |
| `GET/POST /api/trips` | 401 |
| `GET /my-trips` | redirect to `/login` |

Note on that `DELETE`: PostgREST returns 204 for a delete that affects zero rows.
The status code alone does not prove a delete succeeded — the row was re-read
afterwards to confirm it survived.

---

## 4. Architecture

### Request flow

```
Browser (/plan)
   |  POST /api/trips/generate  { from, destination, departureDate,
   |                              budget, days, locale }
   v
app/api/trips/generate/route.ts
   |  validates with tripInputSchema
   v
lib/ai.ts  generateTripPlan()
   |  Groq chat.completions.create with response_format json_schema (strict)
   |  retries once if the shape or day count is wrong
   v
returns { input, plan }
   |
   v
Browser stores it in sessionStorage, navigates to /result
   |  user clicks "Save trip"
   v
POST /api/trips  ->  Supabase insert (user_id from the session)
   v
redirect to /result/[id]  (permanent URL, server-rendered)
```

Part II enrichment (places, weather, and so on) hangs off this flow as an
**additive post-processing step**, never as a replacement for it. See §9.

### File map

```
app/
  layout.tsx                  root: theme script, locale resolution, dir/lang,
                              LocaleProvider, Navbar, Footer
  globals.css                 design tokens for both themes (see section 7)
  icon.svg                    favicon
  page.tsx                    landing page
  plan/page.tsx               trip form page (server) -> TripForm (client)
  result/page.tsx             unsaved result, reads sessionStorage (client)
  result/[id]/page.tsx        saved result, reads Supabase (server)
  result/layout.tsx           sets the page title for both result routes
  my-trips/page.tsx           saved trips list (server)
  login/page.tsx              -> AuthForm mode="signin"
  signup/page.tsx             -> AuthForm mode="signup"
  auth/callback/route.ts      exchanges the email code for a session
  auth/signout/route.ts       POST only, then redirects to /login
  api/trips/generate/route.ts POST — validate, call AI, return plan
  api/trips/route.ts          POST save, GET list
  api/trips/[id]/route.ts     GET one, DELETE one
  api/trips/enrich/route.ts   POST — resolve place names + country facts
  api/trips/translate/route.ts POST — translate one chunk of itinerary text

components/
  Navbar.tsx                  server component; reads user + locale
  Footer.tsx  Hero.tsx  Features.tsx  CTA.tsx     server components
  TripForm.tsx                client; validation, loading, error states
  TripResult.tsx              client; shared by both result routes
  DayCard.tsx                 client; one collapsible day
  SaveTripButton.tsx          client
  DeleteTripButton.tsx        client; inline confirm, no window.confirm
  AuthForm.tsx                client; sign-in and sign-up in one component
  LocaleProvider.tsx          client context carrying the server-resolved locale
  LocaleToggle.tsx            client; writes the cookie, calls router.refresh()
  ThemeToggle.tsx             client; toggles the .dark class on <html>

lib/
  ai.ts                       Groq client, system prompt, token budget, retries
  schema.ts                   Zod schemas — the single source of truth for the
                              request shape, the response shape, and the JSON
                              Schema sent to Groq
  places.ts                   Geoapify resolution, the correctness gates, and
                              the cache. Server only — holds the API key
  wikimedia.ts                verified place photographs, three-tier lookup
  maps.ts                     Google Maps link building (no API, no key)
  format.ts                   locale-aware numbers, money and dates
  translate.ts                Groq translation of itinerary text (server only)
  translatable.ts             pulls text out of a plan and puts it back
  translation-cache.ts        where a finished translation is kept
  local-store.ts              browser storage as a React external store
  data/useful-apps.ts         curated apps per country
  data/country-facts.ts       curated currency/language/plug/emergency/timezone
  i18n.ts                     every UI string in English and Arabic, plus the
                              destination list
  locale-server.ts            reads the locale cookie in server components
  supabase/client.ts          browser Supabase client
  supabase/server.ts          server Supabase client (cookie-based session)
  storage.ts                  sessionStorage bridge from /plan to /result
  site-url.ts                 base URL used for email confirmation links

middleware.ts                 session refresh + route protection
next.config.ts                allows images from images.unsplash.com
supabase/schema.sql           table, index, RLS policies — run this once
supabase/email-templates/confirm-signup.html   branded confirmation email
PRD.md                        full requirements and the Part II roadmap
```

### Protected routes

`middleware.ts` protects any path starting with `/plan`, `/result`, or
`/my-trips`. A signed-out visitor is redirected to `/login?next=<original-path>`
and returned there after signing in.

---

## 5. External services

### Groq — trip generation

- Model: **`openai/gpt-oss-120b`**
- Called from `lib/ai.ts`, server-side only
- Uses `response_format: { type: "json_schema", json_schema: { strict: true } }`
- `reasoning_effort: "low"` — reasoning tokens share the per-minute budget
- `max_completion_tokens` is computed per request:
  `Math.min(6800, 1500 + days * 220)`

**Why this model and not a Llama model:** on Groq, only the `openai/gpt-oss-*`
family supports strict structured outputs. Every other Groq model offers loose
JSON mode only, which can return valid JSON with the wrong shape and forces
hand-written repair code. This constraint drove the model choice, not benchmark
scores.

### Supabase — database and auth

- Postgres table `trips` with Row Level Security
- Email/password auth with confirmation enabled
- The `@supabase/ssr` package is used so the session lives in cookies and is
  readable by both server components and route handlers

### Geoapify — place resolution

- Called from `lib/places.ts`, server-side only, key in `GEOAPIFY_API_KEY`
- Free tier: 3,000 requests a day, no credit card
- Endpoint: geocoding search, one result per place

**Never pass the UI language to Geoapify.** `lang` does not merely translate
the reply, it changes which result is returned. Searching "Tokyo Skytree" with
`lang=en` returns Tokyo Skytree; the identical search with `lang=ar` returns
**Hilton Tokyo**. Passing the reader's language through would have shown Arabic
users a different place than English users — a wrong-place bug visible only in
Arabic. Lookup is therefore hardcoded to English, which is also why the AI is
told (prompt rule 13) to write `place` in Latin script regardless of locale.
The visible cost is that a resolved place carries its English name in the
Arabic interface, while the surrounding activity text stays Arabic.

**How a match is judged correct.** This is the part to understand before
changing anything here, because the obvious approach is wrong:

1. The destination is geocoded once, giving a centre point and a country code.
2. Every place is then searched with a proximity bias and a **country filter**.
3. A result more than **250km** from the destination centre is rejected.
4. A result whose name is just the destination itself is rejected — that is
   what the geocoder returns when it cannot find the landmark, and pinning the
   whole city would be a broader-entity error.

**There is deliberately no confidence threshold**, and re-adding one would
break this. Geoapify's `confidence` scores how closely the result's *name*
resembles the query, not whether it is the right place. Searching "Hegra"
inside Saudi Arabia returns "Al-Hijr Archaeological Site (Madâin Sâlih)" — the
correct answer — at confidence **0**, while searching without the country
filter returns **Hegra, Norway** at confidence **1**. A threshold rejected the
right answer and trusted the wrong one. Correctness is geographic here.

### Wikimedia — verified place photographs

- Called from `lib/wikimedia.ts`, no key, no account, no billing
- English Wikipedia regardless of UI language, because Arabic Wikipedia has far
  fewer geotagged articles; only the attribution link is affected

**Two independent gates, both required**, because this is where the project
previously shipped its worst defect:

1. The article must be **geotagged within 3km** of the resolved coordinates.
2. The article title, after dropping any "(qualifier)", must **equal** a name
   already held for the place — either the geocoder's or the itinerary's.

Equality, not containment. Containment was tried and matched the article
"Shibuya" (the whole district) to the place "Shibuya Scramble Crossing",
producing a skyline photograph captioned as a street crossing. Disambiguation
pages are refused, and an article with no lead image yields no photograph.

Photographs are **hotlinked, never copied**: `next/image` is deliberately set
to `unoptimized` so Next does not fetch and cache a copy on our server, and
attribution links back to the article. Nothing is written to the database.

### Photo lookup is three tiers, all bound to one identified entity

After an article is matched (geotag within 3km **and** title equal to a name we
hold), an image is looked for in falling order of certainty:

1. the article's own lead image;
2. the image Wikidata records as *the* image of that entity (**P18**);
3. a photograph from the Commons category Wikidata ties to that entity (P373),
   skipping maps, logos, coats of arms and anything not a `.jpg`.

Tiers 2 and 3 exist because plenty of real articles carry no lead image — Hegra
is one, and it now gets a photograph through tier 3. All three are bound to the
matched entity rather than to a search term, which is what keeps them different
in kind from a keyword image search. Coverage went from 4 of 15 to 11 of 15
without loosening the matching rule.

### Unsplash — decorative imagery only

- `next.config.ts` allows `images.unsplash.com` under `remotePatterns`
- Used only for two decorative photographs in the hero, which depict nothing in
  particular and are labelled as nothing in particular
- **Never** used for a named place. See §7, "a missing image beats a wrong
  image".

---

## 6. Database and authorization

### Table `trips`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `user_id` | uuid, not null | FK to `auth.users`, `on delete cascade` |
| `title` | text | AI-generated trip title |
| `from_location` | text | user input |
| `destination` | text | as returned by the model |
| `departure_date` | date | |
| `budget` | integer | **what the user asked to spend** |
| `estimated_budget` | integer | **what the plan actually costs** |
| `days` | integer | |
| `itinerary` | jsonb | array of day objects |
| `travel_tips` | jsonb | array of strings |
| `budget_warning` | text, nullable | null when the budget is workable |
| `created_at` | timestamptz | defaults to `now()` |

Index: `trips (user_id, created_at desc)` — matches the My Trips query.

**`budget` and `estimated_budget` are not redundant.** The gap between them is
exactly what `budget_warning` explains. Collapsing them into one column would
throw away the product's most distinctive behaviour.

### Row Level Security

RLS is enabled and four policies exist, all scoped `to authenticated` and all
keyed on `auth.uid() = user_id`: select, insert, update, delete. The insert
policy uses `with check`, so a user cannot write a row under someone else's
`user_id` even by editing the request body.

**No route handler filters by `user_id`.** Authorization lives in the database on
purpose: a forgotten filter in application code is a data leak, whereas a
forgotten filter under RLS simply returns nothing. Preserve this property when
adding queries.

### Session handling

Always use `supabase.auth.getUser()`, never `getSession()`. `getSession()` trusts
the cookie as presented; `getUser()` revalidates the token with Supabase. Only
the second is safe as an authorization check. This applies in `middleware.ts`,
route handlers, and server components alike.

---

## 7. Important technical decisions

**One schema, three uses.** `lib/schema.ts` defines the trip shape once in Zod.
`tripPlanJsonSchema()` converts it via `z.toJSONSchema(schema, {io: "input"})`
for the Groq request; `tripPlanSchema.safeParse()` validates the response; the
inferred TypeScript types flow through the UI. They cannot drift apart.

**Numeric fields accept a number or a string.** They are typed
`z.union([z.number(), z.string()]).transform(Number)`. This renders in the
request schema as `anyOf: [number, string]` and coerces on parse. The reason is
in section 8 — Groq's strict mode rejects the whole reply over a single quoted
number.

**Locale is resolved on the server.** The chosen language is stored in the cookie
`tripmate:lang` and read in `app/layout.tsx` before rendering, so the first HTML
response already carries the right `lang` and `dir`. Switching language writes
the cookie and calls `router.refresh()` rather than flipping strings
client-side, because `dir="rtl"` and the translated text must change together.

**Theme is applied before first paint** by a small inline script in the document
head that reads `localStorage` and adds a `.dark` class. Without it, dark-mode
users see a white flash on every navigation.

**The design system has no hard-coded colours in components.** Every colour comes
from a token in `app/globals.css`. Changing a brand colour is one edit there, not
a search across thirty files.

**A separate token exists for gold text.** The brand gold `#c9a227` scores only
2.26:1 against the sand background, well below the 4.5:1 minimum. Small gold
labels use `--color-accent-text` (`#8a6c0a`, 4.65:1) while fills and dots keep
the bright gold. Do not collapse these two tokens.

**The AI plans; external data grounds.** The model decides what to do on which
day. It is not trusted for place metadata, coordinates, photographs, weather,
currency, or app recommendations — those come from real sources or curated data.
This is the organising principle of the whole Part II roadmap.

**A missing image beats a wrong image.** The stock photography originally used
for destination cards was wrong: the card labelled "AlUla" showed a Dubai hotel,
and "Abha" showed African savanna. The URLs had been verified to *load*, never to
*depict the right place*. Any image shown next to a named place must come from
that resolved place. When none exists, show the gradient placeholder.

**Language switching translates; it never regenerates.** A second generation
would cost as much as the first and return a *different* itinerary, which is not
what someone flipping the language switch is asking for. The plan's structure is
kept and only its text is replaced — `planStrings`/`withStrings` in
`lib/translatable.ts` are exact inverses and must stay that way, because
translated text is matched back purely by position. Place keys and every number
are excluded from translation.

**The content language is detected, not stored.** Arabic and Latin scripts do
not overlap, so one regular expression over the title answers it — which avoids
a column, a migration, and keeping a flag in step with the text. It would need
revisiting only if a third language in Latin script were added.

**Browser storage is read through `useSyncExternalStore`.** Copying it into
state inside an effect renders the wrong value first and corrects it a frame
later, which is visible as unticked checkboxes flashing on a saved trip. See
`lib/local-store.ts`; snapshots are raw strings because the hook compares them
by identity.

**Deterministic facts are not generated.** Currency, timezone, plug type, and
emergency numbers are lookups. Spending LLM tokens on them would be both slower
and less reliable.

**Optional enrichment fails soft.** If place lookup, weather, or photos are
unavailable, the itinerary still renders in full. Nothing added in Part II may
make the core generation flow fail.

---

## 8. Known limitations, gotchas, and traps

Read this section before changing anything. Each item was hit for real.

### Groq: the free tier is 8,000 tokens per minute, project-wide

The limit counts the prompt **plus** `max_completion_tokens` together, so
requesting a large output budget is rejected outright — even when the actual
reply would be short. This is why `tokenBudget()` scales with trip length.

Practical effect: roughly **two trip generations per minute across all users**.
The app cannot be published on the free tier as is. Generating two trips back to
back during testing will produce a rate-limit error; wait a minute. This
constraint is also what dictates the design of the trip assistant in §9.

### Groq: "strict" structured output validates after generation, not during

It is not constrained decoding. The model can emit `"day": "5"` as a string, and
Groq then rejects the **entire** reply with HTTP 400 and
`code: "json_validate_failed"`. This is why numeric fields accept both types. Do
not "clean up" those unions.

### Groq: the per-minute limit is reported as 413, not only 429

`lib/ai.ts` checks both status codes. A handler that only catches 429 will
misreport the error as a network failure.

### Groq: strict output cannot combine with tool calling or streaming

Any multi-step AI work has to run as separate sequential calls on this model.

### Tailwind v4: use `@theme`, never `@theme inline`, for themed tokens

`@theme inline` substitutes each token's value at build time. That bakes the
light palette into every utility class and makes the `.dark` overrides silently
do nothing — the CSS variables update but the utilities never read them.

### Turbopack serves stale CSS after `globals.css` structure changes

Editing `@theme` or `@custom-variant` blocks often requires restarting the dev
server. If the change still does not appear, delete `.next` and restart.

### Never use PowerShell to rewrite source files

PowerShell 5.1's `Set-Content` writes ANSI, which destroys UTF-8. A batch
replacement across seven files corrupted every Arabic string and em dash in the
project. Use the Edit/Write tools, or Bash with a UTF-8-aware method.

### CSS transitions appear frozen in the headless preview browser

The Browser pane does not composite frames when it is not displayed, so
`getComputedStyle` returns pre-transition values and lazily-loaded images never
load. **This looks exactly like a broken theme toggle.** To verify colours,
inject `* { transition: none !important }` first, or set `img.loading = "eager"`.
Several apparent bugs turned out to be this.

### Wikipedia throttles bursts, and a throttled lookup looks like "no photo"

Hitting the API hard during testing returns a plain-text "You are making too
many requests" body, which is not JSON. `articlesNear` logs the status and
returns empty, so the visible effect is every photograph quietly becoming a
placeholder. If photos vanish across the board, check the server log for
`Wikipedia geosearch returned 429` before assuming the matching broke. The
user-agent string in `lib/wikimedia.ts` carries a placeholder URL that should
be pointed at the real site on deployment — generic agents get throttled first.

### Many real places have no usable photograph, and that is correct

Verified on AlUla: the "Hegra" and "Maraya" articles are standard pages with no
lead image, and "Dadan" is a disambiguation page. All three correctly fall back
to the gradient placeholder. Do not loosen the matching rules to "fix" this —
the looser rule is exactly what produced a Dubai hotel under an AlUla label.

### Enrichment is recomputed on every view, not stored

Nothing from Geoapify or Wikimedia is written to the database. That keeps the
project clear of providers' caching and storage terms and avoids a migration,
at the cost of re-resolving on each view — which the in-memory cache in
`lib/places.ts` absorbs. The cache is per server process, so it is cold after
every restart and on each serverless instance.

### Never use a day number as a React key

The model repeats day numbers on long trips. A real 20-day generation returned
19 days on the first attempt and had to be retried; duplicate numbering has also
been seen. `lib/ai.ts` now rejects a wrong day count, duplicates, or numbers not
running 1..N, retries once, and renumbers on the last attempt rather than
failing — and `TripResult` keys days by position so a duplicate can never
collapse two days into one again. Both halves matter; do not remove either.

### REST Countries is dead for free use

Its v1–v4 endpoints answer HTTP 200 with `{"success": false}` and a deprecation
notice — so a naive integration silently gets nothing rather than erroring — and
v5 requires an API key. Country facts are curated in
`lib/data/country-facts.ts` instead. Do not re-add the dependency.

### Groq's translation budget is the same 8,000 tokens a minute

Translation shares the minute with generation. A 20-day itinerary is over a
hundred strings and cannot go in one request, so the browser sends chunks of 20
sequentially and stops on the first rate-limited chunk rather than spending the
rest of the minute on requests that cannot succeed. What was translated is kept
and the page says part of the trip is untranslated. Generating a trip and
immediately switching language is the case most likely to hit this.

### Supabase email is rate-limited to about two messages per hour

Only relevant if email confirmation is switched back on — it is currently off,
so sign-up sends no mail at all. That is the built-in service on the free plan,
and it sends from a Supabase-owned address. The message body has been
customised (`supabase/email-templates/confirm-signup.html`) but the sender
cannot be changed without custom SMTP.

### Confirmation links point at `NEXT_PUBLIC_SITE_URL`

In development this is set to the machine's LAN IP so links open on a phone. The
IP changes when the network changes, which silently breaks the links. That URL
must also be listed under Supabase, Authentication, URL Configuration, Redirect
URLs.

---

## 9. Outstanding work

### 9a. Feature roadmap — phases, in order

Full specifications are in `PRD.md` §§13–19. Implement **one phase at a time**;
after each, run the type check, build where appropriate, report exactly what
changed, and say what needs manual testing in the browser. Do not roll into the
next phase without reporting.

| Phase | Feature | Status |
|---|---|---|
| 2 | Place grounding, Maps links, verified photos | **Done** 2026-08-29. See §3 and §5. |
| 4 | Useful apps by destination | **Done** 2026-08-29. `lib/data/useful-apps.ts`, 6 countries. |
| 6 | Local essentials | **Done** 2026-08-29. Curated, not fetched — REST Countries is deprecated. |
| 7 | Trip checklist | **Done** 2026-08-29. `localStorage` per trip. |
| — | Stabilization pass | **Done** 2026-08-29: duplicate-day fix, photo coverage, language switching, honest metrics, locale-aware formatting. |
| **3** | **Trip map** | **Next.** A marker per resolved place, selectable for basic info, as a section or tab beside the itinerary. Needs MapLibre + MapTiler. |
| 5 | Weather | Real forecast API for the trip dates. Beyond the provider's horizon, say so rather than invent one. |
| 8 | AI trip assistant | Trip-scoped, edits or advises on the existing plan. Needs a quota because of the Groq limit. **Build last.** |

### Chosen provider stack (decided 2026-08-29)

**Google Places was evaluated and rejected**, because Google Maps Platform
requires a Cloud billing account with a valid credit card before any Maps or
Places API can be called — the March 2025 change replaced the $200 monthly
credit with per-SKU free caps, and claiming them still requires billing
enabled, with automatic overage charges unless a cap is set manually. For a
personal portfolio project the user chose to avoid billing entirely.

| Need | Provider | Key? | Card? |
|---|---|---|---|
| Place resolution: id, official name, address, lat/lng | **Geoapify** — 3,000 requests/day free | Yes | No |
| Place photographs | **Wikipedia / Wikimedia REST** — the image from the article about that exact place | No | No |
| "View on Google Maps" | Plain `google.com/maps` URLs — no API, no key | No | No |
| Map rendering | **MapLibre GL JS** + **MapTiler** free tiles | Yes (tiles) | No |
| Weather | **Open-Meteo** — 16-day forecast, ~10k calls/day, non-commercial | No | No |
| Country facts | **REST Countries** + curated JSON for plug type and emergency numbers | No | No |
| Useful apps | Curated JSON in the repository | — | — |

Two consequences worth understanding before writing Phase 2:

1. **Geoapify returns no photographs.** That is why photos come from Wikimedia
   instead — and that path is actually the safer one for the correctness rule
   in §7, because the image is taken from the encyclopedia article *about the
   resolved place* rather than from a keyword search whose top hit merely looks
   plausible. A place with no article shows the gradient placeholder.
2. **There is no Google Place ID on this stack**, so Maps links use the
   coordinate-plus-name form rather than `query_place_id`. That is the
   documented fallback, not a shortcut.

Keep the resolver behind a small interface in `lib/places.ts`. If the user ever
enables Google billing, swapping the provider should be one file, not a
refactor.

**Constraints that apply to every phase:**

- The core generation flow must keep working when any optional service is down.
- No provider key reaches the browser unless the provider designed it for
  client-side use, and then only origin-restricted.
- **Before adding any API that requires billing or a credit card, stop and ask
  the user**: what it is, why it is needed, whether it has a free tier, whether
  billing setup is required, and whether a free alternative exists. Wait for
  approval.
- Result-page information gets organised into sections or tabs. Do not build one
  giant scrolling wall, and do not redesign the visual identity to fit new
  content.
- Every new user-visible string goes into `lib/i18n.ts` in both languages. The
  Arabic object is typed against the English one, so a missing translation is a
  compile error.

**How the Phase 2 schema change landed.** `Day.activities` was `string[]`. It
is now an array of `{ text, place }`, where `place` is the bare searchable name
or null. Backward compatibility is handled in `lib/schema.ts` by a union that
accepts a bare string and normalises it to `{ text, place: null }`, so trips
saved before this change still parse and still render — they simply go
unenriched. That union also appears in the JSON Schema sent to Groq, which is
intentional and matches the existing `numberish` pattern: a model that emitted
a plain string degrades to an unenriched activity instead of failing the whole
request with a 400. Verified against the live API — Groq accepts the schema and
the model returns the object form, using null for travel and check-in.

### 9b. Loose ends outside the roadmap

| Item | Notes |
|---|---|
| **Two-account RLS test** | The last open item in the definition of done: confirm account B gets "not found" when opening account A's trip URL. Now easy to run — email confirmation is off, so a second account can be created directly. |
| **Destination photography** | `public/images/` is currently empty and the home page destination cards are gradient placeholders. Phase 2 may supply verified photos; otherwise the placeholders stay. **Do not substitute unverified stock photos.** |
| **`middleware.ts` deprecation** | Next 16.2 warns the `middleware` convention is deprecated in favour of `proxy`. Cosmetic; worth doing before deployment. |
| **Deployment** | Vercel, plus custom SMTP (for example Resend) to fix both the sender identity and the email rate limit. Deferred to the end by the user's decision. |

### 9c. Explicitly cancelled — do not build

Removed from scope on 2026-08-29. These may still appear in older notes and in
the git history; ignore them there.

- The graduation / academic layer in its entirety: research question, multi-agent
  orchestrator, critic-and-revise loop, systems A/B/C comparison, 30-request
  evaluation test set, statistical significance testing, thesis material
- Flight and hotel booking APIs
- Payment, checkout, card handling, or a payment button — including the
  previously planned "full quota system with payment button disabled". The
  assistant in Phase 8 gets a quota; it does not get a payment path.
- Real booking or reservation of anything

---

## 10. Environment variables

`.env.local` in the project root, git-ignored via the `.env*` rule.

```
GROQ_API_KEY=                    secret — server only, never prefixed NEXT_PUBLIC_
GEOAPIFY_API_KEY=                secret — server only, spends the places quota
NEXT_PUBLIC_SUPABASE_URL=        the Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   publishable key; public by design, guarded by RLS
NEXT_PUBLIC_SITE_URL=            base URL for confirmation links (LAN IP in dev)
```

Next.js only exposes variables prefixed `NEXT_PUBLIC_` to the browser, and
`lib/places.ts` is additionally imported by client components as `import type`
only, so it is erased at compile time and never enters the client bundle.
Confirmed after the Phase 2 build: the key's value appears nowhere under
`.next/static`.

**Two of these are not secrets and one is.** The Supabase publishable key is
designed to ship to browsers; what protects the data is RLS, not concealment. The
Groq key is a real secret — it spends the user's quota. It must never gain a
`NEXT_PUBLIC_` prefix, appear in client code, or be pasted into a chat. Each
service added in Part II follows the same rule.

**Never write an API key into a file on the user's behalf.** Provide the command
or the file shape and let the user paste the value themselves.

One-time setup: run `supabase/schema.sql` in the Supabase SQL editor. It is
idempotent and safe to re-run.

---

## 11. Running and verifying

```
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type check — keep this clean
npm run build        # production build — keep this clean
```

There is no test suite. Verification so far has been manual, through the browser
automation tools, plus `tsc` and `next build`. When adding features, prefer
verifying real behaviour in the browser over asserting that the code looks right.

The dev server frequently stops between sessions. Start it with the preview
tooling rather than a background shell command.

---

## 12. Working notes for the next session

- **The user communicates in Arabic.** Reply in Arabic unless they write in
  English. Code, comments, and documentation stay in English.
- **Portfolio quality means interview-explainable.** The user has to be able to
  walk through this code in an interview. Prefer small, clearly named modules
  over abstraction. No agent frameworks. No library added without a concrete
  problem it solves — the project has seven runtime dependencies and that number
  is itself worth defending.
- **Do not hide failures.** If place enrichment fails, the itinerary still
  renders. If a photo is unavailable, show a placeholder. If weather is
  unavailable, show an unavailable state. If curated data is missing, do not
  invent it. Surface the state honestly rather than papering over it.
- **Verify the property that actually matters.** The image mix-up in §7 is what
  happens otherwise: it was confirmed that the URLs loaded, but never that they
  showed the right place.
- **Do not over-engineer.** `PRD.md` §25 asks explicitly for beginner-readable
  code, no unnecessary abstractions, and no speculative structure.
- **Ask before deleting anything the user owns**, including anything under
  `public/`.
- **Ask before using any service that requires billing or a credit card.**
