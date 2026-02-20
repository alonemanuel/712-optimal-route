# Main Page Spec — `/`

**Parent:** `overview.md`
**PRD Refs:** F1–F6, F10–F13, NF2, NF4

The main page is the app's single primary interface: an interactive map showing the proposed 712 route through Tel Aviv, and a form for riders to submit their address. Everything is Hebrew, RTL.

---

## Page Sections

The page has three logical sections stacked vertically:

1. **Header** — Logo, title, sign-in button
2. **Map** — Full-width interactive Google Map
3. **Action Panel** — Submission form or submission confirmation (overlays bottom of map on mobile, side panel on desktop)

---

## States

| State | Condition | What the user sees |
|-------|-----------|-------------------|
| **Anonymous** | No Google session | Map + route + "Sign in to submit" CTA |
| **Signed in, not submitted** | Authenticated, no submission on record | Map + route + address submission form |
| **Signed in, already submitted** | Authenticated, has prior submission | Map + route + their pin + walk distance + "already submitted" message |
| **Just submitted** | Immediately after form submit | Map + route + animated pin drop + walk distance reveal |
| **Loading (map)** | Map JS loading | Skeleton placeholder with spinner |
| **Loading (route)** | Route data fetching | Map visible, route area shows shimmer/skeleton polyline |
| **Loading (submit)** | Form submitted, awaiting response | Form disabled, button shows spinner |
| **Error: auth failed** | Google sign-in rejected or failed | Toast/banner with error, map still visible |
| **Error: geocoding failed** | Address couldn't be geocoded | Inline form error under address field |
| **Error: network** | API unreachable | Full-width banner at top, retry button |
| **Error: not in service area** | N/A — we accept all addresses | (Not applicable per overview.md) |

---

## Header

Sticky top bar. Minimal.

### Desktop (>768px)

```
┌─────────────────────────────────────────────────────────────┐
│                              712 אופטימלי   [התחברות עם Google] │
│                              ───────────────                    │
│         ?מאיפה אתם עולים לאוטובוס 712                          │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────────┐
│  712 אופטימלי   [התחברות]    │
│  ?מאיפה אתם עולים ל-712      │
└──────────────────────────────┘
```

**Elements:**
- **Logo/title:** "712 אופטימלי" — right-aligned (RTL), bold, app name
- **Subtitle:** "?מאיפה אתם עולים לאוטובוס 712" (Where do you board bus 712?)
- **Sign-in button:** Left side (RTL). Shows "התחברות עם Google" (Sign in with Google) when anonymous. Shows user avatar + first name when signed in. Tap when signed in opens small dropdown with "התנתקות" (Sign out).
- **Stats link:** Small text link "סטטיסטיקה" at the far left, navigates to `/stats`

### Signed-in Header Variant

```
┌──────────────────────────────────────────────────────┐
│  סטטיסטיקה   712 אופטימלי   [🟢 אלון ▾]            │
│              ?מאיפה אתם עולים ל-712                   │
└──────────────────────────────────────────────────────┘
```

The avatar dropdown on tap:
```
        ┌──────────────┐
        │  אלון מנואל  │
        │  ──────────── │
        │  התנתקות     │
        └──────────────┘
```

---

## Map Section

### Layout

- **Mobile:** Full viewport width, height = `100vh - header - action panel` (map fills remaining space above the bottom panel)
- **Desktop:** Map takes ~65% width on the left. Action panel is ~35% on the right as a sidebar.

### Map Configuration

- **Center:** Greater Tel Aviv (~32.08, 34.78)
- **Zoom:** Auto-fit to show entire route with padding
- **Map type:** Roadmap (default Google Maps style)
- **Controls visible:** Zoom (+/-), my-location button. Hide street view, map type toggle, fullscreen on mobile.
- **Gesture handling:** `greedy` on mobile (no two-finger requirement), `cooperative` on desktop

### Route Display

The computed route is always visible (even for anonymous users).

**Polyline:**
- Color: `#2563EB` (blue-600, see `ux-patterns.md` color-primary), weight 4px, opacity 0.8
- Follows the ordered stop sequence as straight-line segments between stops (not road-snapped — keeps it simple and free)
- Dashed style for the final segment from last stop to the highway endpoint, to indicate "continues to Modi'in"

**Stop Markers (5-15):**
- Custom marker: Numbered circle (1, 2, 3...) in route order
- Size: 32x32px
- Color: White circle with blue border, blue number inside
- On tap: Opens info window (see below)

**Highway Endpoint Marker:**
- Different style: Gray marker with highway icon
- Label: "כניסה לכביש מהיר" (Highway entrance)
- Not interactive (no info window)

**Start Point Marker:**
- Green circle marker
- Label: "תחנה ראשונה" (First stop)
- This IS stop #1, so it's both the numbered marker and has the green treatment

### Stop Info Window (on tap)

When user taps a stop marker, a Google Maps info window opens:

```
┌──────────────────────────┐
│  #תחנה 3                 │
│  רחוב דיזנגוף 99         │
│  ◯ 47 נוסעים בקרבת מקום  │
│  ◯ רדיוס 400 מטר         │
└──────────────────────────┘
```

**Fields:**
- Stop number in route order
- Nearest street address (reverse-geocoded label, precomputed)
- Number of submissions within 400m of this stop
- Coverage radius note

Only one info window open at a time. Tapping another stop closes the current one. Tapping the map background closes it.

### User's Pin (signed in + submitted)

When a signed-in user who has already submitted views the map:

- **Pin:** Red standard Google Maps marker at their submitted address
- **Walking line:** Thin dashed line (`#34a853` green, 2px) from their pin to the nearest stop
- **Walk distance label:** Small floating label at the midpoint of the walking line showing distance in meters, e.g., "280 מטר"
- **Auto-zoom:** Map adjusts bounds to include both the route and the user's pin

### User's Pin — Just Submitted Animation

Immediately after a successful submission:

1. Map smoothly pans/zooms to include the user's address
2. Pin drops with a bounce animation (standard Google Maps drop animation)
3. After pin lands (300ms), the walking distance line draws from the pin to the nearest stop (animated over 500ms)
4. Walk distance label fades in at the midpoint
5. A bottom toast appears: "הכתובת נוספה! המרחק שלך לתחנה הקרובה: 280 מטר" (Address added! Your distance to the nearest stop: 280m)

### Empty State (no route data)

If somehow the route hasn't been computed yet (0 submissions, system just deployed):

- Map shows centered on Tel Aviv
- No route polyline or stop markers
- A centered overlay message on the map: "אין מספיק נתונים עדיין — היו הראשונים להירשם!" (Not enough data yet - be the first to sign up!)

This state is unlikely in production (seed data will exist) but must be handled.

---

## Action Panel

### Layout

- **Mobile:** Fixed bottom sheet, initial height ~180px (enough for the CTA or compact form). Can be dragged up to reveal full form. Rounded top corners, subtle shadow.
- **Desktop:** Right sidebar, ~35% width, full height below header. Light gray background (`#f8f9fa`), scroll if content overflows.

### State: Anonymous

**Mobile bottom sheet:**
```
┌──────────────────────────────┐
│           ─── (drag handle)  │
│                              │
│    ?רוצים שהאוטובוס יעבור   │
│         ?קרוב אליכם          │
│                              │
│  ┌──────────────────────────┐│
│  │  התחברות עם Google  [G]  ││
│  └──────────────────────────┘│
│                              │
│   כדי להוסיף את הכתובת שלכם │
│   ולשפר את המסלול            │
└──────────────────────────────┘
```

**Desktop sidebar:**
```
┌────────────────────────────────┐
│                                │
│    ?רוצים שהאוטובוס יעבור     │
│         ?קרוב אליכם           │
│                                │
│    .התחברו כדי להוסיף         │
│    את הכתובת שלכם ולעזור      │
│    לנו לבנות מסלול טוב יותר   │
│                                │
│  ┌────────────────────────────┐│
│  │  התחברות עם Google   [G]  ││
│  └────────────────────────────┘│
│                                │
│    נתונים של XX נוסעים כבר    │
│    במערכת                      │
│                                │
└────────────────────────────────┘
```

**Elements:**
- Headline: "?רוצים שהאוטובוס יעבור קרוב אליכם" (Want the bus to pass near you?)
- Description: Brief text explaining the value proposition
- Google sign-in button: Standard Google branding, full width
- Social proof line: "נתונים של XX נוסעים כבר במערכת" (Data from XX riders already in the system) — XX is the current submission count from the route data. Omit this line if count is 0.

**Behavior on sign-in tap:**
1. Google OAuth popup opens
2. If successful: panel transitions to the submission form (State: Signed in, not submitted)
3. If failed: toast error "ההתחברות נכשלה, נסו שוב" (Sign-in failed, try again). Panel stays in anonymous state.

### State: Signed In, Not Submitted

**Mobile bottom sheet (expanded on sign-in):**
```
┌──────────────────────────────┐
│           ─── (drag handle)  │
│                              │
│        !שלום, אלון           │
│  :הוסיפו את הכתובת שלכם     │
│                              │
│  ┌──────────────────────────┐│
│  │  🔍 הקלידו כתובת...      ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │       שליחה              ││
│  └──────────────────────────┘│
│                              │
│  הכתובת לא תוצג לאף אחד.    │
│  רק המיקום משמש לחישוב       │
│  .המסלול                     │
└──────────────────────────────┘
```

**Desktop sidebar:**
```
┌────────────────────────────────┐
│                                │
│          !שלום, אלון          │
│                                │
│   הוסיפו את הכתובת שממנה      │
│   אתם עולים (או הייתם רוצים   │
│   :לעלות) לאוטובוס 712        │
│                                │
│  ┌────────────────────────────┐│
│  │  🔍 הקלידו כתובת...       ││
│  └────────────────────────────┘│
│                                │
│   📍 רחוב דיזנגוף 99, תל אביב│ ← selected address preview
│                                │
│  ┌────────────────────────────┐│
│  │          שליחה             ││
│  └────────────────────────────┘│
│                                │
│   הכתובת לא תוצג לאף אחד.    │
│   .רק המיקום משמש לחישוב      │
│   .המסלול                      │
│                                │
└────────────────────────────────┘
```

**Elements:**
- Greeting: "!שלום, [first name]" (Hello, [name]!)
- Instruction: "הוסיפו את הכתובת שממנה אתם עולים (או הייתם רוצים לעלות) לאוטובוס 712:" (Add the address where you board (or would like to board) bus 712:)
- Address input field: Google Places Autocomplete. Placeholder: "...הקלידו כתובת" (Type an address...). Search icon on the right (RTL).
- Selected address preview: After selecting from autocomplete dropdown, show the full formatted address below the input with a pin icon. This confirms what was selected.
- Submit button: "שליחה" (Submit). Full width. Disabled (grayed) until an address is selected from autocomplete. Primary blue color when active.
- Privacy note: "הכתובת לא תוצג לאף אחד. רק המיקום משמש לחישוב המסלול." (Your address won't be shown to anyone. Only the location is used for route calculation.)

### Address Input — Detailed Behavior

**Autocomplete dropdown:**
- Appears after 2+ characters typed
- Uses Google Places Autocomplete API
- Biased to Greater Tel Aviv area (location bias, not restriction)
- Shows formatted address suggestions in Hebrew
- On mobile: dropdown appears above the keyboard. Input scrolls into view if needed.

**On autocomplete selection:**
1. Input field shows the selected address text
2. Below the input, a confirmation line appears: "📍 [full formatted address]"
3. A temporary preview pin appears on the map at the selected location (light blue, semi-transparent — NOT the final red pin)
4. Map smoothly pans to include the preview pin
5. Submit button becomes enabled (blue)

**Clearing / changing selection:**
- User can clear the input field (X button inside the input on the right)
- Clearing removes the preview pin from the map and disables submit button
- User can type a new address and select again

**Direct typing without selection:**
- If the user types text but does NOT select from the autocomplete dropdown, the submit button stays disabled
- A subtle hint appears below the input: "בחרו כתובת מהרשימה" (Select an address from the list)

### State: Loading (Submitting)

After tapping submit:

```
┌──────────────────────────────┐
│           ─── (drag handle)  │
│                              │
│  ┌──────────────────────────┐│
│  │  רחוב דיזנגוף 99, ת"א   ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │     ◌  שולחים...         ││
│  └──────────────────────────┘│
│                              │
└──────────────────────────────┘
```

- Input field: disabled, shows selected address, gray background
- Submit button: disabled, shows spinner + "...שולחים" (Submitting...)
- No other interactions available
- Duration: typically <2 seconds

### State: Just Submitted (Success)

Immediately after successful submission:

**Mobile:**
```
┌──────────────────────────────┐
│           ─── (drag handle)  │
│                              │
│           ✓                  │
│    !הכתובת נוספה בהצלחה      │
│                              │
│    המרחק שלכם לתחנה          │
│         :הקרובה ביותר        │
│                              │
│       ┌──────────┐           │
│       │ 280 מטר  │           │
│       └──────────┘           │
│        ~3 דקות הליכה         │
│                              │
│   .תודה! הנתונים שלכם עוזרים │
│   לנו לבנות מסלול טוב יותר   │
│                              │
└──────────────────────────────┘
```

**Desktop:**
```
┌────────────────────────────────┐
│                                │
│             ✓                  │
│     !הכתובת נוספה בהצלחה      │
│                                │
│     המרחק שלכם לתחנה          │
│          :הקרובה ביותר        │
│                                │
│         ┌──────────┐           │
│         │ 280 מטר  │           │
│         └──────────┘           │
│          ~3 דקות הליכה         │
│                                │
│    .תודה! הנתונים שלכם עוזרים │
│    לנו לבנות מסלול טוב יותר   │
│                                │
│   ────────────────────────     │
│                                │
│    📊 צפו בסטטיסטיקה          │
│       המלאה →                  │
│                                │
└────────────────────────────────┘
```

**Elements:**
- Success checkmark: Large green checkmark icon, centered
- Success message: "!הכתובת נוספה בהצלחה" (Address added successfully!)
- Walk distance: Prominent number in a pill/badge. "280 מטר" (280 meters). Below it: "~3 דקות הליכה" (~3 minutes walking). Walking time estimate: distance / 80m per minute, rounded to nearest minute.
- Thank you note: "תודה! הנתונים שלכם עוזרים לנו לבנות מסלול טוב יותר." (Thanks! Your data helps us build a better route.)
- Stats link (desktop): "צפו בסטטיסטיקה המלאה" (View full statistics) — links to `/stats`

**Map simultaneously:** Pin drop animation + walking line (see "User's Pin - Just Submitted Animation" above).

This state persists for the rest of the session. On page reload, the user sees the "already submitted" state.

### State: Signed In, Already Submitted (Return Visit)

When a user who previously submitted returns to the page:

**Mobile:**
```
┌──────────────────────────────┐
│           ─── (drag handle)  │
│                              │
│     ✓ כבר הוספתם כתובת      │
│                              │
│    המרחק שלכם לתחנה          │
│         :הקרובה ביותר        │
│                              │
│       ┌──────────┐           │
│       │ 280 מטר  │           │
│       └──────────┘           │
│        ~3 דקות הליכה         │
│                              │
│    המסלול מתעדכן עם כל       │
│    .נוסע חדש שנרשם          │
│                              │
└──────────────────────────────┘
```

**Elements:**
- Confirmation: "✓ כבר הוספתם כתובת" (You've already submitted an address)
- Walk distance: Same prominent display as just-submitted state, but recalculated against the CURRENT route (which may have changed since they submitted)
- Note: "המסלול מתעדכן עם כל נוסע חדש שנרשם." (The route updates with each new rider who signs up.)
- No form, no submit button

**Map:** Shows their red pin + walking line to nearest stop (no animation, just static display).

**Walk distance change notice:** If the walk distance has changed since submission (because the route recalculated), no special callout — just show the current distance. The route is always the latest version.

---

## Error States

### Auth Failed

**Trigger:** Google OAuth returns an error or user closes the popup.

**Display:** Toast notification at the top of the screen (below header).

```
┌──────────────────────────────────────────┐
│  ⚠ ההתחברות נכשלה. נסו שוב.   [✕]       │
└──────────────────────────────────────────┘
```

- Toast auto-dismisses after 5 seconds, or user taps X
- Action panel stays in anonymous state
- Map remains fully functional

### Geocoding Failed

**Trigger:** Selected address can't be geocoded (extremely rare with Places Autocomplete, but possible).

**Display:** Inline error below the address input field.

```
  ┌──────────────────────────┐
  │  רחוב לא קיים 999       │
  └──────────────────────────┘
  ⚠ לא הצלחנו לזהות את הכתובת.
     .נסו כתובת אחרת
```

- "לא הצלחנו לזהות את הכתובת. נסו כתובת אחרת." (We couldn't identify the address. Try a different one.)
- Submit button stays disabled
- User can clear and try again
- No toast — error is contextual to the field

### Network Error (API Unreachable)

**Trigger:** Fetch to the backend fails (timeout, no connection).

**Submission failure:**
```
┌──────────────────────────────────────────────────┐
│  ⚠ שגיאת רשת — הנתונים לא נשלחו. נסו שוב.  [↻] │
└──────────────────────────────────────────────────┘
```

- Persistent banner (does not auto-dismiss)
- Retry button [↻] attempts the submission again
- Form returns to filled state (address still selected, button re-enabled)

**Route loading failure:**
```
┌──────────────────────────────────────────────────┐
│  ⚠ לא הצלחנו לטעון את המסלול.              [↻]  │
└──────────────────────────────────────────────────┘
```

- Map shows but with no route data
- Retry button attempts to refetch route data
- Action panel still functions (user can still sign in and submit)

### Duplicate Submission Attempt

**Trigger:** User tries to submit but the backend returns a 409 (already submitted for this Google account).

This should not happen in normal flow (the UI checks submission status on sign-in and shows the "already submitted" state). But if it does (race condition, stale client state):

- Show the "already submitted" state
- Toast: "כבר הוספתם כתובת בעבר" (You've already submitted an address previously)
- Fetch and display their existing submission's walk distance

---

## Submission Flow — Step by Step

Complete flow from anonymous user to submitted:

1. **User lands on `/`** — sees map with current route, anonymous action panel
2. **User taps "התחברות עם Google"** — OAuth popup opens
3. **OAuth succeeds** — popup closes, header updates with user name/avatar
4. **Backend check: has this user submitted?**
   - **Yes:** Skip to "already submitted" state. Show their pin + walk distance.
   - **No:** Show submission form.
5. **User types in address field** — autocomplete dropdown appears after 2+ chars
6. **User selects an address from dropdown** — confirmation line appears below input, preview pin on map, submit button enables
7. **User taps "שליחה"** — form enters loading state
8. **Backend processes:**
   - Validates address has lat/lng (from Places API data)
   - Checks no prior submission for this google_user_id
   - Stores submission
   - Triggers route recalculation (debounced)
   - Returns: submission record + current walk distance to nearest stop
9. **Success response** — action panel transitions to "just submitted" state, map plays pin-drop + walking-line animation
10. **Route eventually recalculates** — when the debounced recalculation completes (30s-1min later), the route on the map updates. Walk distance may change. No notification to the user about the recalculation — the map silently updates.

---

## Route Recalculation — UX Behavior

When the route recalculates (new submissions trigger debounced recalc):

- **No loading indicator** — the route updates silently
- **Polyline and markers update in place** — old route fades out, new route fades in (300ms crossfade)
- **If the user has a pin:** walking line and distance label update to reflect new nearest stop
- **No toast or notification** about the recalculation
- **Polling:** The client polls the route endpoint every 60 seconds to check for updates. When `computed_at` changes, fetch and render the new route.

---

## Mobile Bottom Sheet Behavior

The mobile action panel is a draggable bottom sheet.

**Three snap positions:**
1. **Collapsed (~80px):** Shows only the drag handle and a peek of the top content (headline or status). Map is fully visible.
2. **Half (~180px):** Default position. Shows the CTA or compact form. Map is partially visible above.
3. **Expanded (~60vh):** Full form with all text. Map is mostly hidden. Keyboard may be visible.

**Behavior:**
- On page load: starts at **half** position
- When address input is tapped: expands to **expanded** and keyboard opens
- When keyboard dismisses (address selected): returns to **half**
- After submission: returns to **half** (success state is compact enough)
- User can manually drag between positions at any time

**Map interaction passthrough:**
- When the sheet is at collapsed or half, map gestures (pan, zoom, tap markers) work normally for the visible map area
- When the sheet is at expanded, the map is non-interactive (grayed slightly)

---

## Desktop Layout — Full Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  סטטיסטיקה            712 אופטימלי              [🟢 אלון ▾]       │
│                    ?מאיפה אתם עולים ל-712                           │
├───────────────────────────────────────────┬─────────────────────────┤
│                                           │                         │
│                                           │      !שלום, אלון       │
│           ┌─[1]─┐                         │                         │
│           │     │                         │  הוסיפו את הכתובת       │
│           └──┬──┘                         │  :שממנה אתם עולים      │
│              │                            │                         │
│         ┌─[2]─┐                           │  ┌─────────────────┐   │
│         │     │     📍 (user pin)         │  │  🔍 כתובת...     │   │
│         └──┬──┘    ╌╌╌╌╌╌╌╌╌╌            │  └─────────────────┘   │
│            │     ╌╌  280m  ╌╌             │                         │
│       ┌─[3]─┐  ╌╌╌╌╌╌╌╌╌╌               │  📍 דיזנגוף 99, ת"א   │
│       │     │                             │                         │
│       └──┬──┘                             │  ┌─────────────────┐   │
│          │                                │  │     שליחה        │   │
│     ┌─[4]─┐                               │  └─────────────────┘   │
│     │     │                               │                         │
│     └──┬──┘                               │  הכתובת לא תוצג       │
│        ╎ (dashed to highway)              │  .לאף אחד              │
│     [🛣 כביש מהיר]                         │                         │
│                                           │                         │
├───────────────────────────────────────────┴─────────────────────────┤
│  footer: קוד פתוח · נבנה ע"י נוסעי 712                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Layout — Full Wireframe (Anonymous)

```
┌──────────────────────────────┐
│  712 אופטימלי   [התחברות]    │
│  ?מאיפה אתם עולים ל-712      │
├──────────────────────────────┤
│                              │
│      ┌─[1]─┐                 │
│      │     │                 │
│      └──┬──┘                 │
│         │                    │
│    ┌─[2]─┐                   │
│    │     │                   │
│    └──┬──┘                   │
│       │                      │
│  ┌─[3]─┐                    │
│  │     │                     │
│  └──┬──┘                     │
│     ╎                        │
│  [🛣]                        │
│                              │
├──────────────────────────────┤  ← bottom sheet (half position)
│         ─── (drag handle)    │
│                              │
│   ?רוצים שהאוטובוס יעבור    │
│        ?קרוב אליכם           │
│                              │
│  ┌──────────────────────────┐│
│  │  התחברות עם Google   [G] ││
│  └──────────────────────────┘│
│                              │
└──────────────────────────────┘
```

---

## Mobile Layout — Full Wireframe (Just Submitted)

```
┌──────────────────────────────┐
│  712 אופטימלי   [🟢 אלון]   │
│  ?מאיפה אתם עולים ל-712      │
├──────────────────────────────┤
│                              │
│      ┌─[1]─┐                 │
│      │     │                 │
│      └──┬──┘                 │
│         │                    │
│    ┌─[2]─┐    📍             │
│    │     │  ╌╌280m╌╌         │
│    └──┬──┘                   │
│       │                      │
│  ┌─[3]─┐                    │
│  └──┬──┘                     │
│     ╎                        │
│  [🛣]                        │
│                              │
├──────────────────────────────┤
│         ─── (drag handle)    │
│           ✓                  │
│    !הכתובת נוספה בהצלחה      │
│       ┌──────────┐           │
│       │ 280 מטר  │           │
│       └──────────┘           │
│        ~3 דקות הליכה         │
└──────────────────────────────┘
```

---

## Footer

Minimal. Only on desktop (hidden on mobile to save space).

```
┌─────────────────────────────────────────────────────────────────┐
│  קוד פתוח · נבנה ע"י נוסעי 712 · הצעה לעיריית מודיעין          │
└─────────────────────────────────────────────────────────────────┘
```

"Open source -- Built by 712 riders -- A proposal for Modi'in municipality"

---

## Accessibility & RTL Notes

- All text is RTL (direction: rtl; on `<html>` or `<body>`)
- Input fields: text aligns right, cursor starts right
- Autocomplete dropdown: right-aligned
- Buttons: text centered, icons on the right side
- Map controls: moved to LEFT side of the map (since right side has content in RTL)
- Info windows: text right-aligned
- Screen reader: alt text on markers ("תחנה 3, רחוב דיזנגוף" etc.), form labels, aria-live on toast notifications
- Color contrast: all text meets WCAG AA minimum (4.5:1 for normal text)
- Focus management: after sign-in, focus moves to address input. After submission, focus moves to success message.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| User signs in with Google account that was used for seed data | Seed data uses `seed_<N>` IDs — so the Google account won't match. User can submit normally. Their submission is separate from the seed. |
| User clears browser data and returns | Treated as anonymous. On sign-in, backend recognizes existing submission, shows "already submitted" state. |
| Very long address text | Truncate with ellipsis in the confirmation line. Full address visible in input field (scrollable). Max display ~60 chars. |
| Address outside Israel | Accepted (per overview.md: no rejection). Will be far from clusters and won't pull the route. User sees a large walk distance. |
| Two tabs open, submit in one | Second tab will show "already submitted" on next poll/interaction (60s route poll will trigger a re-check). |
| Slow connection / large map tiles | Map skeleton shows immediately. Route data loads independently of map tiles. Both show progressive loading. |
| User zooms map during pin-drop animation | Animation continues at the new zoom level. No interruption. |
| 1000+ submissions visible as pins | Only the current user's pin is shown. Other submissions are NOT visible as individual pins (privacy, performance). Only the aggregate route/stops are shown. |
| Route has fewer than 5 stops | Possible with very few submissions. Display whatever the algorithm produces. No minimum enforced in the UI. |
| JavaScript disabled | Show a `<noscript>` message: "האתר דורש JavaScript" (This site requires JavaScript). |

---

## Data the Page Needs

On page load:
1. **Route data** — `GET /api/route` — stops, polyline, metrics, computed_at
2. **User session** — Check if authenticated (cookie/token)
3. **User submission** (if authenticated) — `GET /api/submissions/me` — returns submission or null

On submit:
4. **Create submission** — `POST /api/submissions` — body: `{ address_text, lat, lng }`

Ongoing:
5. **Route polling** — `GET /api/route` every 60s, compare `computed_at`

---

## Transitions Summary

| From | To | Trigger | Transition |
|------|----|---------|------------|
| Anonymous | Signed in, not submitted | Successful OAuth + no prior submission | Panel crossfade (300ms) |
| Anonymous | Signed in, already submitted | Successful OAuth + prior submission exists | Panel crossfade + pin appears on map |
| Signed in, not submitted | Loading (submit) | Tap submit | Button spinner, fields disable |
| Loading (submit) | Just submitted | 200 response | Panel crossfade + map animation |
| Loading (submit) | Signed in, not submitted (error) | Non-200 response | Error toast, form re-enabled |
| Just submitted | Already submitted | Page reload | Same content, no animation |
| Any | Error: network | Fetch failure | Banner slides in from top |

All panel transitions: 300ms ease-in-out crossfade. No jarring layout shifts.
