# Level Up — The Manager Arena

Leadership training game for Level Agency people managers. Built on **Next.js 14**, **Prisma + PostgreSQL**, **NextAuth.js (Google SSO)**, and **Recharts**.

## Architecture

```
src/
├── app/
│   ├── api/                    # 12 API routes (REST)
│   │   ├── auth/[...nextauth]  # Google SSO
│   │   ├── scenarios/          # CRUD + progress + feedback + nodes + choices
│   │   ├── leaderboard/        # Ranked player list
│   │   ├── events/             # Event logging
│   │   ├── bugs/               # Bug reports
│   │   ├── users/              # User profile + stats
│   │   ├── reflections/        # Free-text responses
│   │   ├── reference/          # Q12, Core Values, Key Behaviors
│   │   └── admin/              # Analytics + scenario management
│   ├── login/                  # Google SSO login page
│   └── page.tsx                # Main app (authenticated)
├── components/
│   ├── GameShell.tsx           # Full game UI (3000+ lines)
│   └── Providers.tsx           # NextAuth session wrapper
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── session.ts              # Server-side auth helpers
│   ├── prisma.ts               # DB client singleton
│   └── api-client.ts           # Typed frontend fetch wrappers
├── middleware.ts                # Route protection
prisma/
├── schema.prisma               # 15 database models
└── seed.ts                     # Q12 + Core Values + 26 Behaviors + 4 Scenarios
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Google Cloud OAuth credentials

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL URL and Google OAuth credentials
```

### 3. Set up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
4. Copy Client ID and Client Secret to `.env`

### 4. Initialize database
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push        # Create tables
npx tsx prisma/seed.ts    # Seed all reference data + 4 scenarios
```

### 5. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables:
   - `DATABASE_URL` — your hosted PostgreSQL connection string (Neon, Supabase, Railway, etc.)
   - `NEXTAUTH_URL` — your production URL (e.g. `https://levelup.levelagency.com`)
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` — from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
   - `ALLOWED_DOMAIN` — `levelagency.com`
4. Add production redirect URI in Google Cloud: `https://your-domain.com/api/auth/callback/google`
5. Run seed: `npx prisma db push && npx tsx prisma/seed.ts`

## Game Content

### 4 Scenarios (seeded)
| Scenario | Core Value | Primary Q12 | Difficulty |
|----------|-----------|-------------|------------|
| The Acquisition Storm | No Ego, All In | #1 Expectations | Medium |
| The Burnout Blind Spot | Better Every Day | #5 Cares About Me | Hard |
| The Recognition Vacuum | Relentless for Results | #4 Recognition | Medium |
| The Difficult Conversation | Driven by Truth | #11 Progress | Hard |

### Scoring System
- **Reflection nodes**: +10 points (minimum 20 characters)
- **Decision nodes**: `points_base + q12_impact + sum(core_value_alignment)`
- **Behaviors**: Positive/negative Key Behaviors tracked per choice

### Admin Capabilities
- Usage metrics (active users, completion rates, drop-off)
- Q12 analytics (per-dimension averages, most-struggled)
- Culture analytics (Core Value alignment scores)
- Scenario health (completion rates, avg scores, feedback ratings)
- Event log viewer
- Scenario CRUD (create, activate/deactivate, add nodes and choices via API)

### Adding New Scenarios
Use the admin API:
```bash
# 1. Create scenario
POST /api/scenarios
{ "title": "...", "description": "...", "primaryQ12Id": 3, "coreValueId": "better", ... }

# 2. Add nodes
POST /api/scenarios/{id}/nodes
{ "nodeType": "REFLECTION", "contentText": "...", "orderIndex": 0 }

# 3. Add choices to decision nodes
POST /api/scenarios/{id}/nodes/{nodeId}/choices
{ "choiceText": "...", "explanationText": "...", "q12Impact": 2, "pointsBase": 30,
  "coreValueAlignment": {"no-ego": 1, "better": 2}, "keyBehaviorsPositive": [1,12], "keyBehaviorsNegative": [] }

# 4. Activate
PUT /api/scenarios/{id}
{ "isActive": true }
```

## Database Models
15 Prisma models covering: Users, Sessions (NextAuth), Scenarios, ScenarioNodes, Choices, ChoiceKeyBehaviors, Q12Dimensions, CoreValues, KeyBehaviors, UserScenarioProgress, ReflectionResponses, EventLogs, FeedbackSubmissions, BugReports, VerificationTokens.

## Making a User an Admin
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@levelagency.com';
```
Or via Prisma Studio: `npx prisma studio`
