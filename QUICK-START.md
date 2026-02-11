# VAULTED GRAILS BACKEND - QUICK START

## 🚀 3-STEP SETUP

### STEP 1: SUPABASE (15 minutes)
1. Create Supabase account
2. Create new project
3. Run `database/schema.sql` in SQL Editor
4. Get API keys

📖 **Full guide:** `SUPABASE-SETUP.md`

### STEP 2: RAILWAY (15 minutes)
1. Push code to GitHub
2. Create Railway project
3. Connect GitHub repo
4. Add environment variables
5. Deploy!

📖 **Full guide:** `RAILWAY-SETUP.md`

### STEP 3: CONNECT FRONTEND (5 minutes)
1. Update `shared.js` with Railway URL
2. Push to Vercel
3. Test login/signup

---

## 📁 FILE STRUCTURE

```
vaulted-grails-backend/
├── server.js              # Main server (START HERE)
├── package.json           # Dependencies
├── .env.example           # Copy to .env and fill in
│
├── routes/                # API endpoints
│   ├── auth.js           # Login/signup
│   ├── raffles.js        # Browse/enter raffles
│   ├── tickets.js        # Buy/use tickets
│   ├── user.js           # User profile
│   └── admin.js          # Admin functions
│
├── middleware/            # Request processing
│   ├── auth.js           # JWT authentication
│   └── admin.js          # Admin check
│
├── utils/                 # Helper functions
│   ├── supabase.js       # Database queries
│   └── stripe.js         # Payments
│
└── database/              # Database setup
    └── schema.sql        # Run this in Supabase
```

---

## 🔧 EASY CUSTOMIZATION

### Change Pricing
Edit `utils/stripe.js` lines 10-35

### Add Raffle Category
Edit `routes/raffles.js` - add to allowed categories

### Modify Ticket Limits
Edit `routes/tickets.js` line 120 (ad limit)

---

## 📝 API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Raffles
- `GET /api/raffles/active` - Get all active raffles
- `GET /api/raffles/:id` - Get single raffle
- `POST /api/raffles/:id/enter` - Enter raffle (auth)

### Tickets
- `GET /api/tickets/balance` - Get balance (auth)
- `POST /api/tickets/purchase` - Buy tickets (auth)
- `POST /api/tickets/watch-ad` - Free ticket (auth)

### User
- `GET /api/user/me` - Get profile (auth)
- `PUT /api/user/me` - Update profile (auth)
- `GET /api/user/entries` - Get entries (auth)

### Admin (requires admin role)
- `POST /api/admin/raffles` - Create raffle
- `PUT /api/admin/raffles/:id` - Update raffle
- `DELETE /api/admin/raffles/:id` - Delete raffle
- `POST /api/admin/raffles/:id/draw` - Conduct draw
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get statistics

---

## 💡 TESTING LOCALLY

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Fill in your `.env` values

4. Start server:
   ```bash
   npm start
   ```

5. Test health check:
   ```
   http://localhost:5000/api/health
   ```

---

## ✅ CHECKLIST

- [ ] Supabase project created
- [ ] Database schema run successfully
- [ ] API keys copied to `.env`
- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables added
- [ ] Backend deployed successfully
- [ ] Health check endpoint working
- [ ] Frontend updated with Railway URL
- [ ] Test login/signup working

---

## 💬 NEED HELP?

All files have detailed comments explaining what each part does.

Check the full guides:
- `SUPABASE-SETUP.md` - Database setup
- `RAILWAY-SETUP.md` - Deployment
- `README.md` - Full documentation

---

**Ready to launch!** 🚀
