# SUPABASE SETUP GUIDE
Complete step-by-step guide to set up your database

---

## STEP 1: CREATE PROJECT

1. Go to https://supabase.com
2. Click **"Sign In"** (or create account)
3. Click **"New Project"**
4. Fill in:
   - **Name:** `vaulted-grails`
   - **Database Password:** (create strong password - SAVE THIS!)
   - **Region:** `East US` (closest to Ontario)
   - **Pricing Plan:** FREE
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup

---

## STEP 2: RUN DATABASE SCHEMA

1. Click **"SQL Editor"** in left sidebar
2. Click **"New query"**
3. Open the file `database/schema.sql`
4. Copy ALL the content
5. Paste into Supabase SQL Editor
6. Click **"Run"** (or press F5)
7. You should see: "Database setup complete! ✅"

---

## STEP 3: GET YOUR API KEYS

1. Click **"Project Settings"** (gear icon, bottom left)
2. Click **"API"** in left menu
3. You'll see:

   **Project URL:**
   ```
   https://xxxxx.supabase.co
   ```

   **API Keys:**
   - `anon public` - Safe for frontend
   - `service_role` - SECRET! Backend only

4. **COPY THESE!** You'll need them for `.env` file

---

## STEP 4: GET DATABASE URL

1. Still in **Project Settings**
2. Click **"Database"** in left menu
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string
6. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual database password

---

## STEP 5: VERIFY SETUP

1. Click **"Table Editor"** (in left sidebar)
2. You should see 6 tables:
   - users
   - raffles
   - raffle_entries
   - ticket_transactions
   - subscriptions
   - ad_views

3. Click **"raffles"** table
4. You should see 3 sample raffles (Jordan, Charizard, Luffy)

✅ **If you see this, Supabase is ready!**

---

## WHAT YOU NEED FOR `.env` FILE:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx... (keep secret!)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

---

## TROUBLESHOOTING

**Error: "permission denied"**
- Make sure you're in SQL Editor
- Make sure you pasted the entire schema

**Can't find SQL Editor**
- It's in the left sidebar, looks like `</>`

**Tables not showing**
- Click refresh button in Table Editor
- Check SQL Editor for error messages

---

✅ **NEXT:** Set up Railway backend
