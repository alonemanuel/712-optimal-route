# Deployment & CI/CD Proposal

**Author:** devops-eng
**Date:** 2026-02-20

## Summary

Render (backend) + Vercel (frontend) + Neon (database) + GitHub Actions (CI). Zero cost, push-to-deploy on both services, minimal config.

---

## 1. Deployment Platform

### Recommendation: Render (backend) + Vercel (frontend)

Split the deployment across two platforms, each best-in-class for its role:

**Backend API on Render (Free tier)**
- 512 MB RAM, 0.1 CPU -- plenty for a FastAPI app serving <100 users
- Native Python/Docker support, zero config for FastAPI
- Auto-deploy from GitHub on push to `main`
- 750 free instance hours/month (enough for always-on single service)
- Free TLS

**Caveat -- cold starts:** Free tier spins down after 15 min of inactivity, with ~30-60s cold start. For this project (intermittent use by riders, not a production SaaS), this is acceptable. The map page can show a loading state while the first API call wakes the backend.

**Frontend on Vercel (Hobby tier)**
- Instant deploys, global CDN, zero cold starts for static/SSR pages
- Native support for Next.js, React, Vue, etc.
- 100 GB bandwidth/month, 1M edge requests/month
- Auto-deploy from GitHub on push to `main`
- Preview deployments on every PR (nice for checking map layout changes)

**Why not one platform for both?**
- Vercel CAN host Python serverless functions (FastAPI supported), but the serverless model is awkward for a stateful backend that does route computation. Cold starts on every function invocation, 250 MB bundle limit, and no persistent connections to the DB.
- Render CAN serve static files, but its CDN and frontend DX are inferior to Vercel.
- Splitting lets each tool do what it does best.

**Alternatives considered:**

| Platform | Verdict |
|----------|---------|
| Fly.io | No free tier for new users (discontinued). Requires credit card. |
| Railway | Free trial expires in 30 days, then $5/month minimum. Not truly free. |
| Cloudflare Workers | Great for edge, but Python support is limited (via Pyodide). NumPy/scipy for clustering would be painful. |
| Vercel-only (Python functions) | Serverless cold starts on every request, 250 MB bundle limit is tight with numpy/scipy, no persistent DB connections. |
| Render-only | Can serve frontend too but no CDN, no preview deploys, worse frontend DX. |

---

## 2. Database

### Recommendation: Neon (Free tier serverless Postgres)

- 0.5 GB storage (more than enough for ~1000 submissions + cached routes)
- 100 compute-unit hours/month
- Auto-suspends after 5 min of inactivity (saves compute hours)
- Standard PostgreSQL -- works with SQLAlchemy, asyncpg, etc.
- No expiration (unlike Render's free Postgres which dies after 30 days)

**Why not Render Postgres?** Free tier expires after 30 days. You'd lose your data. Neon has no such limit.

**Why not Supabase?** Also a good option (Postgres + auth + storage), but it pauses after 7 days of inactivity on the free tier, and the auth layer is overkill since we're using Google OAuth directly. Neon is simpler -- just a database.

**Why not SQLite?** Would work for this scale, but Render's free tier filesystem is ephemeral. SQLite data would be lost on redeploy. A managed Postgres avoids this entirely.

---

## 3. CI/CD

### Recommendation: Platform-native auto-deploy + GitHub Actions for checks

**Auto-deploy (zero config):**
- Both Render and Vercel connect to the GitHub repo and auto-deploy on push to `main`
- No CI/CD pipeline needed for deployment itself
- Vercel also creates preview deployments for PRs

**GitHub Actions (free tier) for quality checks:**
- 2,000 minutes/month free for public repos (unlimited for public)
- Run on PR: linting, type checking, tests
- Keep it minimal -- one workflow file, runs in <2 minutes

**Proposed workflow:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
      - run: ruff check .
```

This is optional to start with. The auto-deploy from Render/Vercel is the primary pipeline. Add the GitHub Actions workflow once there are actual tests to run.

---

## 4. Repo Structure

### Recommendation: Monorepo

One repo for everything. This is a solo dev project with two small components.

```
712-optimal-route/
  backend/              # FastAPI app
    main.py
    requirements.txt
    ...
  frontend/             # React/Next.js app (or whatever frontend team picks)
    package.json
    ...
  scripts/              # Data migration, seed scripts
  .github/workflows/    # CI
  render.yaml           # Render blueprint (optional)
  vercel.json           # Vercel config (optional)
```

**Why monorepo?**
- One place to look for everything
- Shared `.env.example`, README, docs
- Single PR can update backend + frontend together
- Both Render and Vercel support monorepo deployments (you specify the root directory)

**Render monorepo config:** Set the "Root Directory" to `backend/` in the Render dashboard.
**Vercel monorepo config:** Set the "Root Directory" to `frontend/` in the Vercel dashboard. Or use `vercel.json` to configure it.

---

## 5. Environment & Secrets Management

### Recommendation: Platform-native env vars

Both Render and Vercel have built-in environment variable management in their dashboards.

**Secrets to manage:**

| Secret | Where Used | Set In |
|--------|-----------|--------|
| `GOOGLE_CLIENT_ID` | Backend (OAuth) + Frontend (sign-in button) | Render + Vercel |
| `GOOGLE_CLIENT_SECRET` | Backend only | Render only |
| `DATABASE_URL` | Backend only (Neon connection string) | Render only |
| `GOOGLE_MAPS_API_KEY` | Frontend only (Maps JS API) | Vercel only (public, browser-restricted) |

**Workflow:**
1. Store secrets in each platform's dashboard (encrypted at rest)
2. Keep a `.env.example` in the repo documenting which vars are needed (no values)
3. For local dev, use a `.env` file (gitignored)

No need for Vault, AWS Secrets Manager, or any external secrets tool. The platform dashboards handle it.

---

## 6. Domain / DNS

### Recommendation: Start with free subdomains, add custom domain later

**Free subdomains (day one):**
- Frontend: `712-optimal-route.vercel.app`
- Backend API: `712-optimal-route.onrender.com`

**Custom domain (when ready for the mayor presentation):**
- Buy a domain (~$10/year, e.g., `712route.co.il` or `bus712.app`)
- Point frontend domain to Vercel (free HTTPS, automatic cert)
- Point `api.712route.co.il` to Render (free HTTPS)
- Both platforms handle DNS + TLS for free on custom domains

**No action needed now.** Free subdomains work fine for development and testing.

---

## 7. Monitoring

### Recommendation: Minimal -- Sentry free tier + platform logs

This is a small project. Don't over-invest in monitoring.

**Sentry (free tier):**
- 5,000 errors/month, 10,000 transactions/month
- Add the Sentry SDK to the FastAPI backend (~5 lines of code)
- Catches unhandled exceptions with stack traces
- Optional: add to frontend too

**Platform logs:**
- Render provides log streams in the dashboard (no setup needed)
- Vercel provides function logs in the dashboard

**Health check:**
- Add a `/health` endpoint to the backend (returns 200)
- Render can ping it to detect if the service is down

**What NOT to set up:**
- No Datadog, no Grafana, no Prometheus
- No uptime monitoring service
- No alerting pipelines

If something breaks, you'll see it in Sentry or in the Render/Vercel logs. That's enough for a solo project.

---

## Decision Summary

| Category | Choice | Cost |
|----------|--------|------|
| Backend hosting | Render (free tier) | $0 |
| Frontend hosting | Vercel (hobby tier) | $0 |
| Database | Neon (free tier Postgres) | $0 |
| CI/CD | Platform auto-deploy + GitHub Actions | $0 |
| Repo structure | Monorepo | -- |
| Secrets | Platform env var dashboards | $0 |
| Domain | Free subdomains (custom later, ~$10/yr) | $0 |
| Monitoring | Sentry free tier + platform logs | $0 |
| **Total** | | **$0/month** |

## Developer Workflow

```
1. Write code locally
2. Push to feature branch
3. Vercel creates preview deployment (frontend)
4. GitHub Actions runs tests (if configured)
5. Merge PR to main
6. Render auto-deploys backend
7. Vercel auto-deploys frontend
```

Push to `main` = everything deploys. No manual steps.
