# Design Decisions — 712 Optimal Route

**Date:** 2026-02-20
**Source:** Cross-functional design sprint (product, UX/UI, frontend, backend)

---

## Final Stack

| Category | Choice | Cost | Rationale |
|----------|--------|------|-----------|
| **Framework** | Next.js 16 (React) | Free | Best ecosystem for MapLibre, shadcn/ui, Recharts. SSG for stats page. Vercel zero-config deploy. |
| **Map** | MapLibre GL JS | Free forever | Vector tiles, built-in heatmap layer, no usage caps. Free tile providers (MapTiler 100K/mo or OpenFreeMap). |
| **Components** | shadcn/ui + Tailwind CSS | Free | Copy-paste model, tree-shakeable, professional look, built-in chart components. |
| **Database + Auth** | Supabase Free Tier | Free | Postgres (500MB), Google OAuth (50K MAU), auto-generated REST API, Row Level Security. |
| **Geocoding** | Nominatim (OSM) | Free | No API key needed, good Israeli address coverage, client-side calls. |
| **Clustering** | skmeans (client-side) | Free | K-means on 1000 2D points runs in <5ms in browser. Zero server compute. |
| **Charts** | Recharts (via shadcn) | Free | Declarative React API, animated, responsive. Included in shadcn chart components. |
| **Animation** | number-flow + CSS transitions | Free | 3KB counter animation for stats. CSS for fades, lifts, pulses. No heavy libs. |
| **Icons** | Lucide (lucide-react) | Free | 1,688 icons, tree-shakeable, transit icons (Bus, MapPin, Route). Already in shadcn. |
| **Fonts** | Inter (primary) + Heebo (Hebrew fallback) | Free | Inter has tabular figures for stats. Heebo for Hebrew address rendering. |
| **Hosting** | Vercel Hobby | Free | 100GB bandwidth, 1M serverless invocations. Native Next.js support. |
| **Bottom Sheet** | Vaul | Free | Spring animations, drag-to-dismiss, snap points. Mobile-native feel. |

**Estimated JS bundle:** ~350-400KB gzipped (with code splitting, well under 3s on mobile)
**Monthly cost:** $0

---

## Conflicts Resolved

### Map Library: MapLibre vs Leaflet vs Google Maps

- **Frontend-eng** recommended MapLibre GL JS (vector tiles, built-in heatmap, free forever)
- **Backend-eng** recommended Leaflet + OSM (simpler, smaller bundle)
- **UX-designer** referenced Google Maps API (familiar, best geocoding)

**Decision: MapLibre GL JS**
- Vector tiles look significantly better than Leaflet's raster tiles (smooth zoom, custom styling)
- Built-in heatmap layer eliminates the need for deck.gl (which UX-designer suggested for Google Maps since their heatmap is deprecated)
- Completely free with no usage caps — critical since this could go viral from the mayor pitch
- Google Maps requires a billing account even for the "free" tier, and the $200/month credit was discontinued in March 2025
- Nominatim handles geocoding separately (no need for Google's geocoding)
- react-map-gl provides excellent React bindings for MapLibre

### Font: Inter vs Heebo + Rubik

- **Frontend-eng** recommended Heebo (primary) + Rubik (headings) for Hebrew support
- **UX-designer** recommended Inter (tabular figures for stats, screen-optimized)

**Decision: Inter (primary) with Heebo as Hebrew input fallback**
- Inter's tabular figures (`tnum`) are critical for aligned stat numbers on the presentation page
- The UI is English v0, so Inter covers 95% of use
- Heebo loads only for the address input field (`dir="auto"`) where Hebrew text may appear
- This avoids loading 3 font families when 1.5 will do (Design Principle P7: Free Means Lean)

### Animation: Motion.dev vs number-flow + CSS

- **Frontend-eng** recommended Motion (motion.dev) + AutoAnimate (~19KB)
- **UX-designer** recommended number-flow + CSS only (~3KB)

**Decision: number-flow + CSS transitions + native Map API**
- The animations needed are simple: counter, fade, slide, pulse, polyline draw
- CSS transitions handle fades, lifts, and pulses at 0KB cost
- number-flow handles the hero stat counters at 3KB
- MapLibre handles route drawing animation natively
- Vaul handles bottom sheet spring animation
- Adding Motion (17KB) for what CSS already does violates P7 (Lean)

### Heatmap: deck.gl vs MapLibre built-in

- **UX-designer** recommended deck.gl HeatmapLayer (since Google Maps native heatmap is deprecated)
- **Frontend-eng** noted MapLibre has built-in heatmap layers

**Decision: MapLibre built-in heatmap layer**
- Since we chose MapLibre over Google Maps, the heatmap is built in — no extra dependency
- deck.gl adds ~200KB+ to the bundle for one feature we get for free

---

## Design Principles

1. **Data Speaks First** — Numbers and maps front and center
2. **Civic Credibility** — Institutional, trustworthy, transit-blue, no gimmicks
3. **Map Is the Product** — Both pages built around the map
4. **Mobile-First, One-Thumb Reachable** — Bottom-anchored CTAs, 44px touch targets
5. **Zero Friction Submission** — 5 taps max from landing to submitted
6. **Glanceable Stats** — Hero metrics readable across a conference table in 5 seconds
7. **Free Means Lean** — Every dependency must justify its existence

---

## Visual Design

### Color Palette
| Role | Hex | Tailwind |
|------|-----|----------|
| Primary (Transit Blue) | `#2563EB` | `blue-600` |
| Primary Hover | `#1D4ED8` | `blue-700` |
| Primary Surface | `#EFF6FF` | `blue-50` |
| Text Primary | `#1E293B` | `slate-800` |
| Text Secondary | `#64748B` | `slate-500` |
| Background | `#FFFFFF` | `white` |
| Surface | `#F8FAFC` | `slate-50` |
| Border | `#E2E8F0` | `slate-200` |
| Success | `#16A34A` | `green-600` |
| Warning | `#F59E0B` | `amber-500` |
| Error | `#EF4444` | `red-500` |

### Typography
- **Font:** Inter (variable, Google Fonts)
- **Hero stats:** 48px bold, tabular-nums — readable from 3 meters on projector
- **Min font size:** 14px everywhere, 16px on inputs (prevents iOS zoom)

### Icons
- **Library:** Lucide (`lucide-react`)
- **Key icons:** Bus, MapPin, Route, BarChart3, Users, Footprints, CircleCheck

---

## Page Layouts

### Main Page (`/`)
- **Mobile:** Full-viewport map + 48px header + 64px sticky bottom CTA bar. Tapping CTA opens bottom sheet (Vaul) with Google sign-in + address autocomplete + submit. After submission: personal result ("Your nearest stop: 280m away") + green pin + dashed walking line on map.
- **Desktop:** 360px left sidebar (always visible) replaces bottom sheet. Map fills remaining width.

### Stats Page (`/stats`)
- **Mobile:** Title → 3 hero stat cards → heatmap (300px) → before/after comparison → bar chart → metadata footer. Vertical scroll.
- **Desktop:** "Presentation slide" — everything fits in 1280x800. Hero stats span top. Below: 2-column (60% heatmap, 40% comparison + chart). White background. Zero scrolling for core story.

---

## Architecture

```
Browser (Next.js SSG/SSR)
  ├── MapLibre GL JS (map rendering, heatmap, route polyline)
  ├── skmeans (client-side k-means clustering)
  ├── Nominatim API (geocoding, client-side fetch)
  └── @supabase/supabase-js (auth + data)
        │
        ▼
Supabase (Free Tier)
  ├── Postgres DB (submissions table, cached_routes table)
  ├── Auth (Google OAuth)
  ├── PostgREST (auto-generated REST API)
  └── Row Level Security (one submission per user enforced at DB level)
        │
        ▼
Vercel (Hobby, Free)
  └── Hosts Next.js app (static + serverless)
```

**Data flow:** User submits → geocode via Nominatim (client) → store in Supabase → client fetches all submissions → runs skmeans in browser → caches result → renders route on MapLibre.

**Key insight:** Zero custom backend code needed. Supabase provides auth, DB, and API. Clustering runs client-side. Geocoding is a client-side API call.

---

## Components (~18 total)

**Layout:** AppHeader, SidePanel, BottomSheet (Vaul), PageContainer
**Map:** RouteMap, StopMarker (custom SVG), UserPin, WalkingLine, StopInfoBubble, HeatmapOverlay
**Form:** GoogleSignInButton, AddressInput, SubmitButton, InlineError
**Stats:** HeroStatCard, ComparisonCard, DistributionChart (Recharts), MetadataFooter
**Feedback:** SubmissionResult, Toast (Sonner)

---

## Animations

| Animation | Library | Size |
|-----------|---------|------|
| Hero stat counters (count from 0) | number-flow | 3KB |
| Bottom sheet slide + spring | Vaul | included |
| Route polyline progressive draw | MapLibre native | 0KB |
| Walking line draw | MapLibre native | 0KB |
| Section fade-in on scroll | CSS + IntersectionObserver | 0KB |
| Card hover lift | CSS transitions | 0KB |
| User pin pulse | CSS keyframes | 0KB |
| Stop marker sequential drop | MapLibre native | 0KB |
