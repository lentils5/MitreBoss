# Setting up Stripe card payments — Mitre BOSS

Your site now has card checkout built in, but two one-time steps are needed to
turn it on. Claude can walk you through both live in your browser. Nothing here
requires the command line.

## What's in this folder
- `index.html` — the site (all images built in)
- `netlify.toml` — tells Netlify about the function
- `netlify/functions/create-checkout.js` — the secure payment function
- `SETUP-STRIPE.md`, `CHANGELOG.md` — notes (not shown on the live site)

## Why the deploy method changes
The payment function is server code, so it can't live inside `index.html`, and
Netlify's drag-and-drop deploys can't run functions reliably. So this version
deploys from **GitHub** instead. Bonus: that finally gives you proper version
history and one-click rollback.

## Step 1 — Add your Stripe SECRET key to Netlify (never to the code)
1. In Stripe: Developers → API keys → reveal your **Secret key** (starts `sk_live_`).
2. In Netlify: your site → Site configuration → Environment variables → Add a
   variable:
   - Key:  `STRIPE_SECRET_KEY`
   - Value: your `sk_live_…` key
3. Save. This is the only place the secret key ever goes. Do not paste it into any
   file or into chat. (If it's ever exposed, roll it in Stripe immediately.)

The publishable key (`pk_live_…`) is not needed for this setup.

## Step 2 — Deploy from GitHub
1. Create a free GitHub account (if you don't have one) and a new repository.
2. Upload the contents of this folder to the repo (GitHub lets you drag files in
   through the website — no git software needed). Keep the `netlify/functions`
   folder structure intact.
3. In Netlify: your site → Site configuration → Build & deploy → link the GitHub
   repository. Leave build command blank; publish directory = the repo root.
4. Netlify deploys. Every future change you push to GitHub redeploys automatically.

## Step 3 — Test before trusting it
- Add something to the cart and click "Pay Securely with Card." You should land on
  a Stripe checkout page showing your items + $30 postage.
- Because you're using a LIVE key, a real card will be really charged. Either do
  one small real purchase and refund it in Stripe, or switch to Stripe TEST keys
  first (use the `sk_test_…` key in the env var) and pay with Stripe's test card
  4242 4242 4242 4242.

## Rolling back
Any deploy can be reverted from Netlify → Deploys → pick an earlier one → Publish.
Once on GitHub, you also have full file history.
