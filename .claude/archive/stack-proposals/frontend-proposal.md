# Frontend Stack Proposal

**Author:** frontend-eng
**Date:** 2026-02-20

## Summary

For a 2-page mobile-first website with Google Maps and a form, the stack should be as thin as possible. The recommendation is **Next.js (App Router)** as a full-stack framework with **Tailwind CSS** for styling, deployed on **Vercel free tier**.

---

## 1. Frontend Framework

**Chosen: Next.js 14+ (App Router)**

**Why:**
- Full-stack in one framework — API routes handle the backend (form submissions, route computation, Google OAuth callbacks) without a separate server. This eliminates CORS, separate deployments, and repo complexity.
- File-based routing gives us `/` and `/stats` with zero config.
- Server components render the stats page server-side for fast loads and SEO (mayor can just open the link).
- Built-in API routes (`/api/*`) serve as the backend — no need for Flask, FastAPI, or Express.
- Vercel deploys Next.js with zero config, including serverless functions for API routes.
- Google OAuth via NextAuth.js is a 20-line setup.

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **SvelteKit** | Excellent DX but smaller ecosystem. Google Maps integration requires more manual wiring. NextAuth has no Svelte equivalent as mature. |
| **Astro** | Great for static sites but the map page is interactive/dynamic. Would need a React island anyway, losing Astro's main benefit. |
| **Plain React (Vite + React Router)** | No SSR, no API routes — would need a separate backend. More moving parts for no benefit on a 2-page app. |
| **Nuxt (Vue)** | Comparable to Next.js but Vue ecosystem for Google Maps is less mature. Vue devtools are nice but unnecessary here. |
| **Remix** | Solid framework but Vercel support is less seamless than Next.js. Extra complexity for no gain. |

**Full-stack approach:** Yes, use Next.js for both frontend and backend. The backend needs are minimal (store submissions, run clustering, return route). API routes in Next.js handle this. A separate backend (e.g., Python/FastAPI) is only warranted if the route optimization algorithm is too heavy for JS — but k-means on 1000 points runs in <100ms in JavaScript. If Python is needed later for scipy/sklearn, it can be added as a single serverless function.

---

## 2. UI / Styling

**Chosen: Tailwind CSS**

**Why:**
- Utility-first means fast iteration without writing custom CSS files.
- Mobile-first responsive design is Tailwind's core strength (`sm:`, `md:` prefixes).
- The stats page needs to look presentation-ready. Tailwind makes clean layouts easy.
- No component library needed — this app has one form and one stats dashboard. Custom components are trivial.
- Ships zero unused CSS in production (tree-shaking via PurgeCSS built in).

**Component library: None (or shadcn/ui if needed)**
- For 2 pages with a form and some stat cards, raw HTML + Tailwind is sufficient.
- If polished UI components are needed (modals, dropdowns), pull in individual shadcn/ui components. They're copy-pasted into your project, not a dependency.

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **Plain CSS / CSS Modules** | Fine but slower to iterate. No responsive utility classes out of the box. |
| **Chakra UI / MUI** | Heavy runtime, large bundle, opinionated styling. Overkill for 2 pages. |
| **DaisyUI** | Nice Tailwind plugin but adds abstraction we don't need. |

---

## 3. Maps Integration

**Chosen: Google Maps JavaScript API via `@vis.gl/react-google-maps`**

**Why:**
- The PRD explicitly requires Google Maps.
- `@vis.gl/react-google-maps` is Google's official React wrapper (maintained by the Google Maps team via vis.gl). It provides `<Map>`, `<Marker>`, `<Polyline>` components that integrate cleanly with React state.
- Google Maps JS API free tier: $200/month credit = ~28,000 dynamic map loads. For a small community tool, this is more than enough.
- Geocoding API (for address-to-lat/lng) also falls under the $200 credit.
- Heatmap layer is built into Google Maps JS API (`google.maps.visualization.HeatmapLayer`) — no extra library needed.

**For the heatmap (stats page):**
- Use Google Maps' native `HeatmapLayer`. No need for a separate heatmap library.

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **Leaflet + OpenStreetMap** | Truly free (no API key needed) but PRD specifies Google Maps. Heatmap requires a plugin. Tiles are less polished. |
| **Mapbox GL JS** | Beautiful maps but free tier is 50,000 loads/month then paid. Also, not Google Maps per PRD. |
| **deck.gl** | Powerful for data viz overlays but way overkill for stop markers and a polyline. |

---

## 4. State Management

**Chosen: React built-in state (useState/useContext) + SWR for data fetching**

**Why:**
- This app has almost no client-side state. The map data (stops, polyline) comes from the server. The form has 1 field (address).
- `SWR` (by Vercel) handles data fetching with caching, revalidation, and optimistic updates. When a user submits an address, SWR can refetch the route after the debounce period.
- No Redux, no Zustand, no Jotai. Adding a state management library for 2 pages with one piece of shared state (the current route) is over-engineering.

**What state exists:**
| State | Where it lives |
|-------|---------------|
| Current route (stops, polyline, stats) | Server, fetched via SWR |
| User auth session | NextAuth session (cookie-based) |
| Form input (address) | Local `useState` |
| User's walking distance | Computed client-side from route + user's submission |

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **Zustand** | Clean API but unnecessary. Zero shared client state that isn't server-derived. |
| **TanStack Query** | More powerful than SWR but heavier. SWR is simpler and sufficient. |
| **Redux** | Not in 2026. Not for 2 pages. |

---

## 5. Hosting

**Chosen: Vercel (free tier)**

**Why:**
- Next.js is built by Vercel. Deployment is `git push` and done.
- Free tier includes: serverless functions (for API routes), edge network CDN, automatic HTTPS, preview deployments on PRs.
- Free tier limits: 100GB bandwidth/month, 100 hours serverless function execution. A community bus route tool will use <1% of this.
- Custom domain support on free tier.

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **Netlify** | Good but Next.js support is via adapter, not native. Slightly more friction. |
| **Cloudflare Pages** | Fast but Next.js support requires `@cloudflare/next-on-pages` adapter. More setup. Edge runtime has limitations (no Node.js APIs in some cases). |
| **Railway / Render** | These are server-based. Vercel's serverless model is better for a low-traffic app (no cold starts to worry about with edge functions, scales to zero). |
| **GitHub Pages** | Static only, no serverless functions. Would need a separate backend. |

---

## 6. Authentication

**Chosen: NextAuth.js (Auth.js) with Google provider**

**Why:**
- First-party integration with Next.js.
- Google OAuth provider is ~10 lines of config.
- Handles session management, CSRF, JWT tokens automatically.
- Free. No third-party auth service needed.
- Enforcing "one submission per Google account" is trivial: store `google_user_id` with a unique constraint.

**Alternatives considered:**
| Option | Why not |
|--------|---------|
| **Clerk** | Nice DX but adds a third-party dependency and has usage limits on free tier. |
| **Firebase Auth** | Free and works but pulls in the Firebase SDK. Heavier than needed. |
| **Supabase Auth** | Good but would couple us to Supabase as a backend. |
| **Manual OAuth** | More code, more bugs. NextAuth solves this problem. |

---

## 7. Database (Frontend Perspective)

The frontend doesn't dictate the database, but since we're recommending Next.js full-stack, the API routes need to talk to something.

**Recommendation for backend team:** A simple PostgreSQL database (e.g., Supabase free tier, Neon free tier, or Vercel Postgres) with Prisma ORM in the API routes. The data model has 2 tables (submissions + cached route). This is not a database-heavy app.

If the backend team prefers a separate Python service for the route optimization algorithm, the Next.js API routes can call it as an internal service.

---

## Complete Stack Summary

| Layer | Choice | Free? |
|-------|--------|-------|
| Framework | Next.js 14+ (App Router) | Yes |
| Styling | Tailwind CSS | Yes |
| Components | Raw HTML/Tailwind (+ shadcn/ui if needed) | Yes |
| Maps | Google Maps JS API via `@vis.gl/react-google-maps` | Yes ($200/mo credit) |
| Heatmap | Google Maps HeatmapLayer (built-in) | Yes |
| State | React useState/useContext + SWR | Yes |
| Auth | NextAuth.js with Google provider | Yes |
| Hosting | Vercel free tier | Yes |
| Language | TypeScript | Yes |

**Total monthly cost: $0** (assuming <28,000 map loads and <100GB bandwidth, both very safe for this use case)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Google Maps $200 credit isn't enough | At ~28K free loads/month, a community tool with <500 users won't come close. If it does, consider switching map tiles to Leaflet/OSM for the stats page heatmap. |
| Route optimization is too heavy for JS serverless | Start with JS (k-means is simple). If needed, add a single Python Cloud Function for the optimization and call it from the Next.js API route. |
| Vercel serverless function timeout (10s on free tier) | Route computation on 1000 points with k-means should be <1s. Pre-compute and cache the route; don't compute on every page load. |
| NextAuth.js complexity | For Google-only auth it's straightforward. Avoid adding other providers to keep it simple. |
