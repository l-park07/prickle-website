# Prickle website — "coming soon" home page build plan

Static HTML/CSS/JS on Firebase Hosting. One teaser screen. Email capture writes to
a `waitlist` collection in Firestore. Domain `getprickle.app` is already connected.

Drop this file in `scratch/` and point Claude Code at it. Run Claude Code in **plan
mode (Shift+Tab)**, approve each plan, review the diff, one prompt at a time.

---

## 0. The one risk to design around

The page lets **anonymous visitors write to Firestore**. That is inherently
abusable. Three layers of defence, all built into the prompts below:

1. **Create-only, validated security rules** — nobody can read, list, edit, or
   delete the waitlist; a `create` only succeeds if the doc has exactly the
   expected shape. This protects the email list (it's PII — never make it readable)
   and blocks malformed writes.
2. **Firebase App Check (reCAPTCHA v3)**, enforced on Firestore — this is the real
   bot defence. Without it, the create-only rules still let a script write junk
   docs all day. With it, requests without a valid App Check token are rejected.
3. **Honeypot field** — a hidden input real users never fill; if it's filled, drop
   the submission client-side. Cheap, catches dumb bots.

Do the Firebase console steps (App Check registration, reCAPTCHA site key, custom
domain) yourself, as usual.

---

## 1. Voice check (applies to every word on the page)

Same rules as the app. Warm, plain, non-clinical. A flare is not a failure.
No hype, no "revolutionary", no "cure/clear up", no streak language. Honest about
what signing up means (you'll email them **once**, at launch). The local-first
privacy story is a genuine differentiator — feature it, don't bury it.

---

## 2. Page copy (use verbatim, tweak to taste)

**Eyebrow:** Coming soon

**Headline:** A gentler way to track eczema.

**Subhead:** Prickle helps you log your skin in seconds and notice how it changes
over time — quietly, on your own device. Because showing up to track is the win,
not the score.

**Three-item value strip** (small, under the hero):
- Quick daily logs — a few taps, not a chore
- Your data stays on your device, not our servers
- No streaks, no shame — a flare isn't a failure

**Email prompt:** Want to know when it's ready?

**Input placeholder:** you@example.com

**Button:** Keep me posted

**Microcopy under the form:** One email, when Prickle launches. That's it — no
spam, and your address stays with us.

**Success state (inline, replaces the form):** You're on the list. We'll be in
touch when Prickle is ready. Take care of yourself in the meantime. 🌵

**Error — looks invalid:** That doesn't look quite like an email — mind checking it?

**Error — write failed:** Something went wrong on our end. Mind trying again in a
moment?

**Footer line (human touch):** Prickle is being built by one person who's had
eczema since childhood.

**Footer privacy line:** Your skin data will always live on your device.

**Footer legal:** © 2026 Prickle

---

## 3. Firestore data model + security rules (copy-paste)

**Collection:** `waitlist`, auto-generated doc IDs. Client normalizes the email to
lowercase + trimmed before writing. Dedupe at export time — don't try to dedupe in
rules.

Doc shape:
```
{
  email:     "you@example.com",   // lowercased, trimmed
  createdAt: <serverTimestamp>,
  source:    "getprickle.app",
  userAgent: "<navigator.userAgent>"   // optional
}
```

Merge this block into your existing `firestore.rules` (keep your current app/auth
rules — this only adds the waitlist collection):

```
match /waitlist/{docId} {
  // Nobody can read, list, edit, or delete signups. Email addresses are PII.
  allow read, update, delete: if false;

  // Anonymous create only, and only in the exact expected shape.
  allow create: if isValidSignup();
}

function isValidSignup() {
  return request.resource.data.keys().hasOnly(['email', 'createdAt', 'source', 'userAgent'])
    && request.resource.data.email is string
    && request.resource.data.email.size() > 3
    && request.resource.data.email.size() < 254
    && request.resource.data.email.matches('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
    && request.resource.data.source is string
    && request.resource.data.createdAt == request.time;   // forces serverTimestamp()
}
```

The `createdAt == request.time` check means the client **must** use
`serverTimestamp()` — a client can't forge or backdate the timestamp.

---

## 4. The Firebase web config

Same "apiKey is not a secret" situation as the app — the web config is meant to be
public; security comes from Auth + Rules + App Check, not from hiding it. For a
static site there's no `EXPO_PUBLIC` mechanism; put the config object in a small
`firebase-config.js` module and import it. You can reuse your existing Firebase
project — just add a **Web app** in the console if you haven't, and grab its config.

---

## 5. Claude Code prompt sequence

Paste these one at a time. Each assumes plan mode and a diff review before you
accept. This is a brand-new tiny repo, so there aren't existing conventions to
match — but do have it place your **existing app stylesheet** in the project and
treat it as the source of truth for colours, spacing, and the Open Sans type.

### Prompt 1 — Scaffold

```
We're building a static "coming soon" landing page for Prickle at getprickle.app,
to be hosted on Firebase Hosting. Plain HTML/CSS/JS, no framework, no build step.

Set up the project structure:
- /public/index.html
- /public/styles.css
- /public/main.js       (ES module)
- /public/firebase-config.js  (placeholder export I'll fill in)
- /firebase.json + /.firebaserc for Firebase Hosting, public dir = "public"
- a .gitignore

I have Prickle's mobile-app stylesheet with the theme tokens (desert/cactus palette,
Open Sans). I'll place it in the project — set styles.css up to build on those
tokens rather than inventing new colours. Don't write page content yet; just
scaffold the files and hosting config. Show me the plan first.
```

### Prompt 2 — Markup + styles (no JS behaviour yet)

```
Build the coming-soon page markup and styles from the copy in
scratch/prickle-website-homepage-prompts.md (section 2). Requirements:

- Single centered screen: cactus/logo, eyebrow, headline, subhead, the three-item
  value strip, then the email form (email input + "Keep me posted" button +
  microcopy), then the footer lines.
- Include the success and both error message elements in the markup, hidden by
  default (JS will toggle them next step).
- Include a visually-hidden honeypot text input (e.g. name="company") for bot
  defence — off-screen, aria-hidden, tabindex -1, autocomplete off.
- Warm desert/cactus theming from the stylesheet. Open Sans throughout.
- Fully responsive (mobile-first) and accessible: real <label> for the input,
  proper input type=email, focus-visible states, sufficient contrast.
- Any decorative animation must be wrapped in @media (prefers-reduced-motion: no-preference).
- No Firebase yet. Show the plan first.
```

### Prompt 3 — Firestore wiring

```
Wire up main.js to submit the email to Firestore. Use the Firebase v12 modular SDK
via the gstatic CDN ES-module URLs — check the current version and pin it in the
import URLs. Import initializeApp, getFirestore, collection, addDoc, serverTimestamp.
Read config from firebase-config.js.

On submit:
1. If the honeypot field is non-empty, silently pretend success and do nothing.
2. Trim + lowercase the email; validate shape client-side. If invalid, show the
   "looks invalid" error and stop.
3. Disable the button and show a pending state.
4. addDoc to the "waitlist" collection: { email, createdAt: serverTimestamp(),
   source: "getprickle.app", userAgent: navigator.userAgent }.
5. On success: hide the form, show the success message.
6. On failure: re-enable the button, show the "write failed" error.

No page reloads; don't use a form submit that navigates. Keep it a plain ES module.
Show the plan first.
```

### Prompt 4 — Security rules

```
Merge the waitlist security rules from scratch/prickle-website-homepage-prompts.md
(section 3) into firestore.rules, keeping all existing rules intact. Then show me
the exact `firebase deploy --only firestore:rules` command to run. Don't deploy
yourself — I'll run it and confirm.
```

### Prompt 5 — App Check (reCAPTCHA v3)

```
Add Firebase App Check with the reCAPTCHA v3 provider, enforced so unverified
requests to Firestore are rejected. In main.js, import initializeAppCheck and
ReCaptchaV3Provider from the matching v12 gstatic URL, and initialize App Check
right after initializeApp with isTokenAutoRefreshEnabled: true, using a site key I
provide (leave a clearly-marked placeholder).

Tell me exactly which console steps I need to do myself: registering the site in
App Check, getting the reCAPTCHA v3 site key, and enforcing App Check on Firestore.
Note that enforcement should be turned on only after the deployed page is confirmed
sending valid tokens, so I don't lock myself out. Show the plan first.
```

### Prompt 6 — Meta, favicon, polish

```
Add the finishing layer:
- <title> and meta description (warm, matches the page voice).
- Open Graph + Twitter card tags so shared links preview nicely (title, description,
  and an og:image — use/generate a simple cactus share image; leave a TODO if you
  can't produce the asset).
- Favicon from the cactus mark, with the standard icon link tags.
- Set lang, viewport, and theme-color meta.
- A minimal 404.html fallback for Firebase Hosting.
Then run through it for accessibility and performance issues and list anything you'd
fix. Show the plan first.
```

### Prompt 7 — Deploy + end-to-end test

```
Walk me through deploying: firebase deploy (hosting + rules), confirming
getprickle.app serves the page, and testing a real signup end-to-end — submit an
email, confirm a doc lands in the waitlist collection with a server timestamp, and
confirm that reading the waitlist from the client is denied. Give me the exact
commands; I'll run them and report back.
```

---

## 6. After launch — small follow-ups (not now)

- **Export signups:** a tiny admin script (or console export) that reads waitlist
  server-side (via the Admin SDK, which bypasses rules) and dedupes by lowercased
  email. Never expose read access to the client.
- **The launch email itself:** you promised exactly one. Keep that promise.
- When the apps ship, this page becomes the real marketing home — the "coming soon"
  teaser is a throwaway shell you can expand into the full site later (that was the
  "Full marketing site" option; easy to grow into).
