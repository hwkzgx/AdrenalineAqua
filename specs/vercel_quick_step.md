# Vercel Deployment Quick Step Guide

This quick step-by-step guide explains how to install the Vercel CLI, link your project, configure environment variables, and deploy **Adrenaline Aqua** to Vercel.

---

## 1. Install Vercel CLI

You can install the Vercel CLI globally using `npm`:

```bash
npm install -g vercel
```

_(Alternative: You can use `npx vercel` without a global install)_

---

## 2. Log in to Vercel

Authenticate your Vercel account from your terminal:

```bash
vercel login
```

- Choose your preferred login method (GitHub, GitLab, Bitbucket, or Email).
- Complete the confirmation in your web browser.

---

## 3. Link Your Project to Vercel

In the project root directory (`/comms-adrenaline-aqua`), run:

```bash
vercel link
```

Answer the interactive setup prompts:

1. **Set up and deploy?** → `Y`
2. **Which scope do you want to deploy to?** → Select your personal account or team
3. **Link to existing project?** → `N` _(or `Y` if you already created it on vercel.com)_
4. **What’s your project’s name?** → `adrenaline-aqua` _(or press Enter for default)_
5. **In which directory is your code located?** → `./` _(press Enter)_

---

## 4. Set Environment Variables

Your Vite app requires client-side environment variables prefixed with `VITE_`.

### Option A: Via Vercel Web Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) and select your project.
2. Navigate to **Settings** → **Environment Variables**.
3. Add the following variables (for **Production**, **Preview**, and **Development**):

| Variable Name              | Description                         | Example / Source           |
| -------------------------- | ----------------------------------- | -------------------------- |
| `VITE_SUPABASE_URL`        | Your Supabase project URL           | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`   | Supabase public anon key            | `eyJhbGciOi...`            |
| `VITE_GROQ_API_KEY`        | Groq API key for AI Insights        | `gsk_...`                  |
| `VITE_GOOGLE_MAPS_API_KEY` | _(Optional)_ Google Maps JS API key | `AIzaSy...`                |

### Option B: Via Vercel CLI

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GROQ_API_KEY production
```

_(You can pull remote env variables into your local `.env.local` anytime with `vercel env pull`)_

---

## 5. Deploy to Vercel

### Deploy a Preview Build (Test build / Staging URL):

```bash
vercel
```

### Deploy Directly to Production:

```bash
vercel --prod
```

Once deployment completes, Vercel will output your live deployment URL (e.g., `https://adrenaline-aqua.vercel.app`).

---

## 6. (Alternative) Deploy via GitHub Continuous Deployment

If your repository is pushed to GitHub:

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository `comms-adrenaline-aqua`.
3. Framework preset will automatically detect **Vite**.
4. In **Environment Variables**, paste the keys from your `.env` file.
5. Click **Deploy**.
6. Every `git push` to `main` will now automatically trigger a production deployment!

---

## Notes on Routing (`vercel.json`)

The vercel.json file included in the root handles client-side routing rewrites (`/(.*) -> /index.html`) so refreshing deep links (e.g. `/customer/dashboard`, `/login`, `/staff/orders`) works seamlessly without 404 errors.
