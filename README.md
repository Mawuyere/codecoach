# CodeCoach Academy 🐍

> AI-powered tech learning platform. Interactive courses with a live AI coach — free to use, zero setup for learners.

**Live demo:** `https://your-site.netlify.app`

---

## What's inside

```
codecoach/
├── index.html                  ← Landing page (course selector + auth)
├── courses/
│   └── python/
│       └── app.html            ← Python tutor (15 modules + AI coach)
├── js/
│   ├── auth.js                 ← Shared Supabase auth + progress module
│   └── env.js                  ← Auto-generated at build (never commit)
├── supabase/
│   └── schema.sql              ← Run once in Supabase SQL editor
├── inject-env.js               ← Build script: bakes env vars into env.js
├── netlify.toml                ← Netlify hosting + redirect config
├── .github/workflows/
│   └── deploy.yml              ← GitHub Actions → auto-deploy on push
├── .gitignore
└── README.md
```

---

## Tech stack — all free tiers

| Service | Purpose | Free tier |
|---------|---------|-----------|
| **Netlify** | Hosting + CDN | Unlimited personal projects |
| **Supabase** | Auth + Postgres DB | 50k users, 500MB |
| **GitHub** | Version control + CI/CD | Unlimited public repos |
| **Anthropic Claude** | AI Coach (Coach Py) | $5 credit to start |

---

## Setup guide

### 1 — Fork & clone

```bash
# Fork this repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/codecoach
cd codecoach
```

### 2 — Create a Supabase project

1. Go to **[app.supabase.com](https://app.supabase.com)** → New project (free)
2. Choose a region, set a database password
3. Once created → **SQL Editor** → New Query → paste `supabase/schema.sql` → Run
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long JWT string)
5. *(Optional)* Enable Google OAuth:
   - Supabase → Authentication → Providers → Google → enable
   - Add your Google OAuth client ID + secret
   - Add `https://your-site.netlify.app` to Google OAuth redirect URIs

### 3 — Deploy to Netlify

#### Option A: UI drag-and-drop (quickest)
1. Go to **[netlify.com](https://netlify.com)** → Add new site → Deploy manually
2. Drag your project folder to the dropzone
3. Site Settings → **Environment Variables** → add:
   ```
   SUPABASE_URL        = https://xxxx.supabase.co
   SUPABASE_ANON_KEY   = eyJ...
   ```
4. Trigger a redeploy

#### Option B: Connect GitHub (recommended — auto-deploys on push)
1. Netlify → Add new site → **Import from Git** → choose your fork
2. Build settings:
   - **Build command:** `node inject-env.js`
   - **Publish directory:** `.`
3. Add environment variables (same as above)
4. Deploy → done. Every push to `main` auto-deploys.

### 4 — Wire up GitHub Actions (optional)

If you want PRs to get preview deploy links:

1. Netlify → Site Settings → **General → Site ID** (copy it)
2. Netlify → User Settings → **Applications → Personal access tokens** → New token
3. GitHub → Your repo → Settings → **Secrets and variables → Actions** → add:
   ```
   SUPABASE_URL        = https://xxxx.supabase.co
   SUPABASE_ANON_KEY   = eyJ...
   NETLIFY_AUTH_TOKEN  = (from step 2)
   NETLIFY_SITE_ID     = (from step 1)
   ```
4. Push any change to `main` → GitHub Actions deploys to Netlify automatically

### 5 — Add your Anthropic API key (AI coach)

The AI coach makes direct calls to the Claude API. Two options:

**Option A: Per-user key (quick)**
- Each learner adds their own key in the app settings
- No backend needed

**Option B: Server-side proxy (production)**
- Create a Netlify Function: `netlify/functions/coach.js`
- Store `ANTHROPIC_API_KEY` as a Netlify env var
- Proxy requests through the function (prevents key exposure)

```js
// netlify/functions/coach.js (starter)
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

exports.handler = async (event) => {
  const { messages, system } = JSON.parse(event.body);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system,
    messages
  });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  };
};
```

---

## Local development

No build step needed — it's plain HTML. Just serve the folder:

```bash
# Python (built-in)
python3 -m http.server 8080

# Node
npx serve .

# Then open http://localhost:8080
```

For the env vars locally, create `js/env.js` manually:
```js
window.__ENV__ = {
  SUPABASE_URL:      'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...'
};
```
*(This file is gitignored — never commit real keys)*

---

## Adding a new course

1. Create `courses/YOUR_COURSE/app.html` (copy Python app as template)
2. Update `index.html` — change the card from `class="course-card soon"` to `class="course-card live"` and add the `href`
3. Add a `loadProgress('YOUR_COURSE')` call in the landing page init
4. Commit and push — Netlify auto-deploys

---

## Project roadmap

- [x] Python course (15 modules, AI coach, XP system)
- [x] Supabase auth + cloud progress sync
- [x] Netlify hosting + GitHub Actions CI/CD
- [ ] Cloud Computing course
- [ ] AI & Machine Learning course  
- [ ] Docker & Containers course
- [ ] Linux course
- [ ] Anthropic proxy Netlify Function
- [ ] User dashboard (all-course progress overview)
- [ ] Leaderboard (opt-in)

---

## Contributing

PRs welcome. Each course is a self-contained HTML file — no framework knowledge required. Open an issue to discuss new courses before building.

---

## License

MIT — free to use, fork, and build on.
