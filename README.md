# Vault Grails Backend - Complete

## Features
- ✅ User authentication (signup/login)
- ✅ Raffle browsing & entry
- ✅ Ad watching for free tickets
- ✅ User profile & transaction history
- ✅ Supabase integration
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ CORS configured

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Raffles
- `GET /api/raffles?status=live` - Get all live raffles
- `GET /api/raffles/:id` - Get single raffle
- `POST /api/raffles/:id/enter` - Enter raffle (auth required)

### User
- `GET /api/user/profile` - Get user profile (auth required)
- `GET /api/user/entries` - Get raffle entries (auth required)
- `GET /api/user/transactions` - Get ticket transactions (auth required)

### Ads
- `POST /api/ads/watch` - Watch ad, earn ticket (auth required, 5/day limit)

## Environment Variables

Required in Railway:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
JWT_SECRET=your-secret-here
FRONTEND_URL=https://vaultgrails.com
NODE_ENV=production
```

## Deploy to Railway

1. Push this code to GitHub
2. Railway auto-deploys from main branch
3. Set environment variables in Railway dashboard
4. Done!

## Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

## Database Schema

See Supabase schema with tables:
- users
- raffles
- raffle_entries
- ad_views
- ticket_transactions
- subscriptions
