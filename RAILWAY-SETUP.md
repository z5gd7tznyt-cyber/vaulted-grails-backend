# RAILWAY SETUP GUIDE
Complete step-by-step guide to deploy your backend

---

## STEP 1: PUSH CODE TO GITHUB

First, you need to get this backend code on GitHub:

### Option A: GitHub Website (Easiest)

1. Go to https://github.com
2. Click **"New repository"**
3. Name: `vaulted-grails-backend`
4. Privacy: **Private** (recommended)
5. **Don't** check "Add README"
6. Click **"Create repository"**

7. On your computer:
   - Extract the backend ZIP file
   - Drag ALL files into the GitHub repository page
   - Add commit message: "Initial backend setup"
   - Click **"Commit changes"**

### Option B: Git Command Line

```bash
cd vaulted-grails-backend
git init
git add .
git commit -m "Initial backend setup"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/vaulted-grails-backend.git
git push -u origin main
```

---

## STEP 2: CREATE RAILWAY PROJECT

1. Go to https://railway.app
2. Click **"Sign In"** (or create account with GitHub)
3. Click **"New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select **"vaulted-grails-backend"** repo
6. Railway will automatically detect Node.js!

---

## STEP 3: ADD ENVIRONMENT VARIABLES

1. In Railway project, click **"Variables"**
2. Click **"New Variable"**
3. Add these ONE BY ONE:

```
PORT=5000
NODE_ENV=production
JWT_SECRET=[create-long-random-string]
SUPABASE_URL=[from Supabase]
SUPABASE_ANON_KEY=[from Supabase]
SUPABASE_SERVICE_KEY=[from Supabase]
DATABASE_URL=[from Supabase]
FRONTEND_URL=https://vaultedgrails.com
ADMIN_EMAIL=your-email@example.com
STRIPE_SECRET_KEY=[from Stripe - use test key first]
STRIPE_PUBLISHABLE_KEY=[from Stripe - use test key first]
STRIPE_WEBHOOK_SECRET=[leave empty for now]
```

**To create JWT_SECRET:**
- Go to https://randomkeygen.com/
- Copy a "Fort Knox Password"
- Paste as JWT_SECRET

---

## STEP 4: DEPLOY

1. Railway automatically deploys!
2. Wait 2-3 minutes
3. You'll see build logs
4. When complete, you'll get a URL like:
   ```
   https://vaulted-grails-backend-production.up.railway.app
   ```

---

## STEP 5: TEST YOUR BACKEND

1. Open a new browser tab
2. Go to: `[YOUR-RAILWAY-URL]/api/health`
3. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "environment": "production"
   }
   ```

✅ **If you see this, backend is working!**

---

## STEP 6: UPDATE FRONTEND

1. Open `shared.js` in your frontend code
2. Find this line:
   ```javascript
   API_URL: 'https://vaulted-grails-backend.up.railway.app/api'
   ```
3. Replace with YOUR Railway URL

---

## MONTHLY COST

- Railway: **$5/month**
- Supabase: **FREE** (up to 500MB database)
- **Total: $5/month**

---

## UPDATING YOUR BACKEND

To make changes:

1. Edit code locally
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update description"
   git push
   ```
3. Railway auto-deploys! (takes 1-2 min)

---

## TROUBLESHOOTING

**Build failed?**
- Check Railway logs for errors
- Make sure all files uploaded correctly

**"Module not found" error?**
- Make sure `package.json` is in root folder
- Railway runs `npm install` automatically

**Can't access health endpoint?**
- Wait a few minutes for deployment
- Check Railway logs for startup errors

---

✅ **BACKEND IS LIVE!**
