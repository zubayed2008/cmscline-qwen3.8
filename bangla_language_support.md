Full i18n confirmed. Here is my complete analysis and implementation plan.

---

# Plan: Bangla (বাংলা) Full Internationalization — Phase 15.5

## Current State Summary

| Area | Status |
|---|---|
| UI i18n infra (cookie, proxy detection, switcher, `/api/i18n`) | ✅ Working, but `'en' \| 'es' \| 'fr'` **hardcoded in 4 files** |
| Translation dictionaries consumed by components | ❌ Not yet — `t()` exists but nothing calls it |
| Content-level translation (Page/Blog title & content per language) | ❌ Doesn't exist — models have single `title`/`slug`/`content` |
| Bangla specifics | Script is LTR (no RTL work); needs a Bengali-capable webfont; `Intl` supports `bn` natively |

---

## Part A — Add `bn` as a Supported UI Locale *(with refactor to make this the last time it's hard)*

**A1. New `src/utils/locale-config.ts` — single source of truth**
```ts
export const LOCALES = ['en', 'es', 'fr', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE ...        // from NEXT_PUBLIC_DEFAULT_LOCALE
export const LOCALE_MAP = { en, 'en-us', es..., fr..., bn: 'bn', 'bn-bd': 'bn', 'bn-in': 'bn' }
export const LOCALE_NAMES = { en: 'English', es: 'Español', fr: 'Français', bn: 'বাংলা' }
```
This kills the duplication in `i18n.ts`, `proxy.ts`, and `LanguageSwitcher.tsx`.

**A2. Create `src/locales/bn/common.json`** — full Bangla translation of all ~60 keys (common/navigation/footer/meta/ui namespaces).

**A3. Update consumers:** `i18n.ts` (import config + bn JSON, delete hardcoded unions), `proxy.ts` (import `LOCALES_MAP`/`SUPPORTED_LOCALES` from config — edge-safe pure constants), `LanguageSwitcher.tsx` (use `LOCALE_NAMES`).

**A4. Font support:** add `Noto_Sans_Bengali` via `next/font/google` in `src/app/layout.tsx`, appended after Geist in the className chain — Latin glyphs render from Geist, Bengali glyphs fall through automatically. No conditional logic. *(Per AGENTS.md I'll verify against the bundled Next.js docs in `node_modules/next/dist/docs/` before writing.)*

---

## Part B — Per-Page/Blog Bangla Content Translation

**B1. Schema (embedded translations — recommended over a separate collection):**

```ts
// page-model.ts & blog-model.ts
translations: {
  type: Map, of: new Schema({ title: String, content: String }, { _id: false }),
  default: {},
}
```
- Map-typed ⇒ adding future locales needs **no schema migration** (that's the "standard" part).
- No localized slugs — with cookie-based routing the URL never changes, so a second slug would be dead weight.
- Text indexes extended: `{ title: 'text', content: 'text', 'translations.bn.title': 'text', 'translations.bn.content': 'text' }` ⚠️ *requires index rebuild — fine in dev with autoIndex.*

**B2. Resolution helper — new `src/utils/localized-content.ts`**
```ts
resolveLocalized(doc, locale) => { title, content }  // translations[locale] → base fields fallback
```
One shared fallback rule everywhere: **missing Bangla ⇒ English original**.

**B3. Services:** optional `locale` param on public getters (`getPageBySlug`, `getDefaultHomepage`, `getBlogBySlug`, `getActiveBlogs`, …). Backward-compatible — admin CRUD untouched.

**B4. Public views:** `[slug]/page.tsx`, `page.tsx` (home), `blog/page.tsx`, `blog/[slug]/page.tsx` read the `NEXT_LOCALE` cookie (Phase 15 convention) → pass to services + localize `generateMetadata`.

**B5. Admin forms (`PageForm`/`BlogForm`):** language tabs (**English | বাংলা**) — Bangla tab has optional Title + RichTextEditor; submits `translations.bn.{title,content}`; reuses the existing prop-sync pattern. Zod schemas in `types/schemas.ts` extended accordingly.

**B6. Versioning integrity (Phase 11.1):** `ContentVersion` gains a `translations` field; auto-snapshots and `restoreVersion` write it back — otherwise a restore would silently wipe/stale the Bangla content.

**B7. Search (Phase 12):** MongoDB `$text` queries hit the extended index automatically; provider adds bn-content excerpt stripping.

---

## Tradeoffs & Honest Caveats

1. **Cookie vs URL routing:** We stay consistent with Phase 15's cookie approach (zero URL churn). Caveat: Google prefers separate URLs per language (`/bn/about-us`) for SEO; same-URL-different-language is a known limitation. Path-prefix routing is the natural Phase 16 evolution and this design won't block it.
2. **Scope guard:** Only Page & Blog get translated now. NavigationMenu labels, ServiceItems, Carousels can adopt the identical `translations` Map pattern later.
3. Partially translated pages gracefully mix (Bangla body, English title) rather than 404ing.

## Execution Order
A1→A4 (UI, independently shippable) → B1/B2 (schema + helper) → B3/B4 (render path) → B5 (editing) → B6/B7 (integrity) → tests (i18n fallback, localized services; update existing suites) → `tsc` + ESLint + Jest + build → update `.clinerules/memory.md`.

No commit/push unless you say so.

---

If this looks right, **toggle to Act mode** and I'll start with Part A. Want anything adjusted first — e.g., skip search-index extension, or also translate admin UI strings into Bangla?