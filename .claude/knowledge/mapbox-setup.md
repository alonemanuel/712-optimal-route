# Mapbox Setup Guide

## Why Mapbox?

Switched from Google Maps to Mapbox on 2026-02-20 because:
- **Much prettier default styling** — modern, minimal vector tiles
- **More customizable** — full control over colors, layers, typography
- **Better for data viz** — vector tiles scale better than raster
- **Generous free tier** — 600k monthly map loads included
- **Same API complexity** — relatively easy to switch between them

## Getting a Mapbox API Key

1. Go to https://www.mapbox.com
2. Click "Sign up" (or log in if you have an account)
3. In the dashboard, find "Access tokens"
4. Create a new token with:
   - **Name:** "712 Optimal Route"
   - **Scopes:** `maps:read`, `geocoding:read` (at minimum)
   - Copy the token

## Setting up `.env.local`

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Paste your Mapbox token:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk_test_your_token_here
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

## Map Customization

The map currently uses `mapbox://styles/mapbox/light-v11` (light theme).

**Other built-in styles:**
- `mapbox://styles/mapbox/dark-v11` — Dark theme
- `mapbox://styles/mapbox/streets-v12` — Streets (detailed)
- `mapbox://styles/mapbox/satellite-v9` — Satellite
- `mapbox://styles/mapbox/outdoors-v12` — Outdoor/terrain

**To change:** Edit `src/components/MapboxRouteMap.tsx`, line with `style: "mapbox://styles/mapbox/light-v11"`

## Free Tier Limits

- **Maps:** 600,000 map loads/month (enough for ~20k users/month)
- **Geocoding:** 100,000 requests/month (enough for ~3,300 user submissions/month)
- **Pricing after free tier:** $0.50 per 1,000 map loads, $0.50 per 1,000 geocodes

For 712 Optimal Route, the free tier is more than sufficient.

## Troubleshooting

**Map doesn't load:**
- Check that `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set in `.env.local`
- Restart dev server after changing `.env.local`
- Check browser console for errors

**Geocoding (address search) not working:**
- Verify token has `geocoding:read` scope
- Check network tab in DevTools to see API responses

**Performance issues:**
- Vector tiles are faster than Google's raster tiles
- If slow, check for too many markers/layers on map
