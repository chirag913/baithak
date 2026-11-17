# Baithak Club — Bonfire Night landing page

A static site (no build step): `index.html`, `styles.css`, `script.js`, `favicon.svg`, `og-image.png`.
Applications go to your Google Sheet **Baithak Club Guestlist → Applications** via a Google Apps Script web app.

## Live connection (already set up)

- **Sheet:** https://docs.google.com/spreadsheets/d/1_2SyCmIJwZidCkFkZu2G_JJP9EidkPbkFmiTXjO9X_Y/edit (owned by the Google account Chrome is signed into)
- **Web app:** `https://script.google.com/macros/s/AKfycbxba5PUJAzlTGkVmnBZxHonIWobdGf2ycbTE_MMOKwRtmx5-VYIBwUDD9jHl1_iA1AM/exec`. It's already set in `script.js`.
- The Apps Script project is bound to that sheet (Extensions → Apps Script).

## 1. Reconnecting from scratch (only if you ever need a new sheet)

1. Open the sheet you want to use.
2. **Extensions → Apps Script**. Delete whatever is in `Code.gs` and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. In the function dropdown pick **`setup`** → **Run**. Google asks you to authorise. Click *Review permissions*, choose your account, then *Advanced → Go to (project) → Allow*. You'll see this "unverified app" screen because the script is your own.
4. **Deploy → New deployment →** ⚙ *Select type* → **Web app**
   - Description: `Guestlist v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   → **Deploy**, then copy the **Web app URL** (ends in `/exec`).
5. In [`script.js`](script.js), line 5, replace the placeholder:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfy…/exec";
   ```
6. Check it: open the `/exec` URL in a browser. You should see
   `{"ok":true,"message":"Baithak Club guestlist endpoint is live."}`.
   Then submit a test application on the site and you should see a new row in **Applications**.

> **If you change `Code.gs` later:** go to *Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy*.
> This keeps the same URL. Choosing *New deployment* instead gives you a new URL that you'd have to paste in again.

### What lands in the sheet
`Timestamp | Full Name | Phone | Email | Age | Gender | City | Instagram | Profession | Why Join | Source | Event | Status | Notes`

- **Status** starts as `Pending`. Age outside 18–35 is recorded as `Rejected` (the site already blocks this, so it should be rare).
- **Notes** flags `Possible duplicate (same phone + event)` automatically.
- Phone is normalised to `+91 98765 43210`.
- The form no longer asks for Instagram, so the **Instagram** column stays blank. Delete it in the sheet only if you also remove it from `HEADERS` and `appendRow` in `Code.gs`.
- Values beginning with `= + - @` are stored as plain text, so a submission can never run as a formula.

## 2. Before going live

- **OG image / WhatsApp preview:** in `index.html`, change `og:image` to an absolute URL, e.g. `https://yourdomain.com/og-image.png`, and add `<meta property="og:url" content="https://yourdomain.com/">`.
- **Photos:** the 6 gallery frames are illustrated placeholders. Swap each `<svg class="shot-art">…</svg>` for
  `<img src="images/01-bonfire.jpg" alt="…" loading="lazy" width="900" height="1200">` (portrait 3:4, warm, documentary). The copper frame and captions stay.
- **Contribution:** ₹999 per guest appears on the event card, in the form intro and in the FAQ. Search `₹999` in `index.html` to change it.

## 3. Hosting

Any static host works: Netlify Drop (drag the folder in), Vercel, GitHub Pages or Cloudflare Pages. Upload everything except `apps-script/`, `README.md` and `.claude/`.

To preview locally:
```bash
python -m http.server 5173
```
then open http://localhost:5173.
