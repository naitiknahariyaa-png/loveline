# 💖 LoveLink 24/7 Deployment Guide (100% Free Forever)

Run LoveLink 24/7 on the cloud without needing your personal laptop or PC turned on!

---

## 🌟 Method 1: Render.com (Recommended — 100% Free)

Render gives you free hosting for web services with automated HTTPS:

### Step 1: Upload to GitHub
1. Go to [https://github.com/new](https://github.com/new) and create a new repository called `lovelink`.
2. In your terminal inside `e:\jk automation\fileshare-app`, run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/lovelink.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Open [https://dashboard.render.com](https://dashboard.render.com) (Log in with GitHub for 1-click access).
2. Click **New +** ➔ **Web Service**.
3. Select your `lovelink` GitHub repository.
4. Set the following settings:
   - **Name:** `lovelink-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan Type:** `Free` ($0/month)
5. Click **Create Web Service**!

Render will build and launch your permanent 24/7 URL (e.g. `https://lovelink-app.onrender.com`).

---

## 🌟 Method 2: Koyeb (100% Free — No Sleep Docker Hosting)

Koyeb provides free micro instances with high speed and WebSocket support:

1. Sign up at [https://app.koyeb.com](https://app.koyeb.com) (free).
2. Click **Create App** ➔ Choose **GitHub**.
3. Select `lovelink`.
4. It will automatically detect the [Dockerfile](file:///e:/jk%20automation/fileshare-app/Dockerfile).
5. Click **Deploy**!
6. You get a permanent 24/7 global link like `https://lovelink-yourname.koyeb.app`.

---

## 🌟 Method 3: Keep Free Servers Awake 24/7 (Prevent Sleeping)

Free tiers on Render go to sleep after 15 minutes of inactivity. To keep your couple space **awake 24/7 with zero downtime**:

1. Go to [https://cron-job.org](https://cron-job.org) or [https://uptimerobot.com](https://uptimerobot.com) (both 100% free).
2. Create an HTTP ping monitor for your Render/Koyeb link:
   - **URL:** `https://your-lovelink.onrender.com/api/media/search`
   - **Interval:** Every 10 minutes.
3. Your server will stay active 24 hours a day, 365 days a year without ever falling asleep!
