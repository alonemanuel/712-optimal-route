# Mapbox Hover Popups — Implementation Guide

**Session:** 2026-02-20
**Component:** `src/components/MapboxRouteMap.tsx`

## Overview

Implemented beautiful, interactive hover popups for Mapbox map markers (stops and endpoint). Popups appear on hover, display relevant information, and disappear on mouse leave.

## Key Implementation Details

### 1. Popup HTML Templates

Two reusable generators create popup content:

**For stops:**
```typescript
createStopPopupHTML(stopNumber, label, clusterSize)
```
- Shows stop number in a blue badge
- Displays stop address label
- Shows rider count with people icon
- Includes stop number footer

**For endpoint:**
```typescript
createEndpointPopupHTML()
```
- Shows completion checkmark in red badge
- Displays "Highway On-ramp" title
- Shows route to Modi'in and distance info
- Matches design system

### 2. Hover Event Handling

**For stop markers:**
- Listen to `mouseenter` on "stops" layer → Create/update popup at marker
- Listen to `mouseleave` → Remove popup
- Cursor changes to `pointer` on hover

**For endpoint marker:**
- Listen to `mouseenter` on "endpoint" layer → Create/update popup
- Listen to `mouseleave` → Remove popup
- Same cursor feedback

**Important:** Use `popupRef` to track current popup and remove old ones when creating new ones (prevents multiple popups from displaying simultaneously).

### 3. Styling & Animations

**CSS in component:**
```css
.mapbox-popup-custom {
  /* Remove default Mapbox styling */
  background: transparent;
  border: none;
  padding: 0;
}

.mapbox-popup-custom .mapboxgl-popup-tip {
  display: none; /* Hide default arrow */
}

/* Popup animation */
@keyframes popupFadeIn {
  from: opacity 0, scale 0.95
  to: opacity 1, scale 1
}
```

**Tailwind classes in HTML:**
- `bg-white` — Clean white background
- `rounded-lg shadow-lg` — Card styling with elevation
- `animate-in fade-in zoom-in-95 duration-200` — Smooth fade/scale animation

### 4. Positioning

- **Offset:** `[0, -30]` pixels above the marker (prevents overlap)
- **Z-index:** 100 to ensure popups stay above controls
- **Max-width:** 320px for consistent sizing

## Performance Notes

- Popups are created dynamically on hover (lazy creation)
- Old popups are cleaned up before new ones appear
- Uses Mapbox's native `Popup` class (no external libraries)
- No memory leaks — popups are properly removed on mouseleave

## Design System Integration

- **Colors:** Blue (#2563eb) for stops, Red (#dc2626) for endpoint, matching map markers
- **Typography:** Tailwind utility classes for consistent sizing/weight
- **Icons:** Emoji icons (👥 riders, 🛣️ route, 📍 distance) for quick recognition
- **Spacing:** Consistent padding/margins using Tailwind spacing scale

## Customization

To modify popup appearance:

1. **Content:** Edit `createStopPopupHTML()` or `createEndpointPopupHTML()` functions
2. **Styling:** Update Tailwind classes in the HTML template or CSS rules
3. **Animation:** Adjust `@keyframes popupFadeIn` or Tailwind animation utilities
4. **Position:** Change `offset: [0, -30]` or z-index value

## Known Limitations

- Uses HTML templates (not React components) because Mapbox popups expect HTML strings
- Emoji icons work across all browsers but may render slightly differently on different platforms
- Popups are removed on route change (recreated fresh with new route data)

## Future Enhancements

- Could add distance to rider cluster (if calculated)
- Could add walking directions link
- Could make popups dismissible with keyboard (ESC key)
- Could add popup for other layers (if added later)
