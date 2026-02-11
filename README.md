# VAULTED GRAILS BACKEND

## 🎯 WHAT THIS IS

This is your complete backend API for Vaulted Grails. It handles:
- User accounts (signup/login)
- Raffle management
- Ticket purchases
- Premium subscriptions
- Admin functions

## 🛠️ TECH STACK

- **Database:** Supabase (PostgreSQL)
- **API:** Node.js + Express
- **Hosting:** Railway
- **Payments:** Stripe

## 📁 FILE STRUCTURE

```
vaulted-grails-backend/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env.example              # Environment variables template
├── routes/
│   ├── auth.js              # Login/signup routes
│   ├── raffles.js           # Raffle management
│   ├── tickets.js           # Ticket system
│   ├── user.js              # User profile
│   └── admin.js             # Admin functions
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── admin.js             # Admin-only access
├── utils/
│   ├── supabase.js          # Database connection
│   └── stripe.js            # Payment processing
└── database/
    └── schema.sql           # Database tables
```

## 🚀 QUICK START

1. Set up Supabase (see SUPABASE-SETUP.md)
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your keys
4. Run locally: `npm start`
5. Deploy to Railway (see RAILWAY-SETUP.md)

## ✅ FEATURES

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation
- ✅ Error handling
- ✅ CORS enabled
- ✅ Rate limiting
- ✅ Admin panel ready
- ✅ Stripe integration ready

## 📝 API ENDPOINTS

### Authentication
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login

### Raffles
- GET `/api/raffles/active` - Get all active raffles
- GET `/api/raffles/:id` - Get single raffle
- POST `/api/raffles/:id/enter` - Enter raffle (auth required)

### Tickets
- GET `/api/tickets/balance` - Get user's ticket balance
- POST `/api/tickets/purchase` - Buy tickets
- POST `/api/tickets/watch-ad` - Earn free ticket

### User
- GET `/api/user/me` - Get user profile
- PUT `/api/user/me` - Update profile
- GET `/api/user/entries` - Get user's raffle entries

### Admin (requires admin role)
- POST `/api/admin/raffles` - Create raffle
- PUT `/api/admin/raffles/:id` - Update raffle
- DELETE `/api/admin/raffles/:id` - Delete raffle
- POST `/api/admin/draw/:id` - Conduct draw

## 🔧 EASY TO EDIT

All routes are in separate files. To add a new feature:

1. Create new route file in `routes/`
2. Add route to `server.js`
3. Done!

Example: Adding a referral system
- Create `routes/referrals.js`
- Add to server: `app.use('/api/referrals', require('./routes/referrals'))`

## 💡 COMMON EDITS

### Change Pricing
Edit `routes/tickets.js` - lines 10-20

### Add New Raffle Category
Edit `routes/raffles.js` - line 15 (allowed categories)

### Modify Ticket Packages
Edit `routes/tickets.js` - TICKET_PACKAGES object

## 📞 NEED HELP?

Everything is documented in the code with comments explaining what each part does.
