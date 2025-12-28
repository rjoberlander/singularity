# Codebase Structure Analysis

## Executive Summary

**Project**: SlackKB - AI-Powered Call Analytics & Knowledge Platform
**Architecture**: Modular Monolith with Microservice-Ready Components
**Language**: TypeScript (Node.js/Express backend, React frontend)
**Database**: PostgreSQL (Supabase)
**Deployment**: Docker (DigitalOcean App Platform - Unified Single Container)

---

## Overall Folder Structure (Top 3 Levels)

```
/home/user/slackkb/
├── .taskmaster/                    # Task management system
│   ├── docs/
│   ├── reports/
│   ├── tasks/
│   └── templates/
│
├── backend/                        # Backend API Server
│   ├── migrations/                 # 50+ SQL migration files
│   ├── scripts/                    # Utility scripts
│   └── src/
│       ├── config/                 # Configuration
│       ├── controllers/            # Route controllers
│       ├── middleware/             # Express middleware
│       ├── modules/                # 37+ Service Modules
│       │   ├── agent/              # 12 AI Sub-agents
│       │   ├── csku/               # Channel SKU Management
│       │   ├── kb/                 # Knowledge Base
│       │   ├── shopify-order-ship/ # Shopify Integration
│       │   ├── ticketing/          # Ticketing System
│       │   ├── time-tracking/      # Time Tracking
│       │   └── [30+ more modules]
│       ├── routes/                 # API routes
│       ├── services/               # Business logic
│       ├── types/                  # TypeScript types
│       └── utils/                  # Utilities
│
├── frontend/                       # React Application
│   └── src/
│       ├── components/             # 47+ Component directories
│       │   ├── auth/
│       │   ├── chat/
│       │   ├── common/
│       │   ├── knowledge-base/
│       │   ├── ui/
│       │   └── [40+ more]
│       ├── contexts/               # React Contexts
│       ├── hooks/                  # Custom Hooks
│       ├── pages/                  # Page Components
│       ├── services/               # API services
│       ├── stores/                 # State management
│       ├── theme/                  # Theme configuration
│       ├── types/                  # TypeScript types
│       └── utils/                  # Helper functions
│
├── docs/                           # 175+ Documentation files
│   ├── archive/
│   ├── backend/
│   ├── database/
│   └── policies/
│
└── Root Files
    ├── CLAUDE.md                   # Claude Code Instructions
    ├── README.md
    ├── Dockerfile
    ├── docker-compose.yml
    ├── docker-compose.unified.yml
    ├── playwright.config.js
    ├── start-dev.sh
    └── stop-dev.sh
```

---

## Package.json Locations

| Location | Purpose |
|----------|---------|
| `/package.json` | Root workspace config |
| `/backend/package.json` | Backend dependencies (v1.3.2) |
| `/frontend/package.json` | Frontend dependencies (v1.3.6) |

---

## Configuration Files

### TypeScript
- `/backend/tsconfig.json` - ES2020, CommonJS
- `/frontend/tsconfig.json` - Root config
- `/frontend/tsconfig.app.json` - App config
- `/frontend/tsconfig.node.json` - Node config

### Build & Development
- `/frontend/vite.config.ts` - Vite bundler + proxy
- `/frontend/tailwind.config.js` - TailwindCSS
- `/frontend/postcss.config.js` - PostCSS
- `/frontend/eslint.config.js` - ESLint

### Testing
- `/backend/jest.config.js` - Backend tests
- `/playwright.config.js` - E2E tests
- `/playwright.quick.config.js` - Quick tests

### Docker
- `/Dockerfile` - Unified production image
- `/docker-compose.yml` - Development
- `/docker-compose.unified.yml` - Production

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Backend modules | 37+ |
| Frontend component dirs | 47+ |
| Database migrations | 50+ |
| Documentation files | 175+ |
| Root utility scripts | 300+ |
| External integrations | 20+ |

---

## Technology Stack

### Frontend
- React 19 + TypeScript
- Vite (bundler)
- TailwindCSS
- Zustand (state)
- React Router
- Supabase client
- React Query

### Backend
- Node.js >=20 + TypeScript
- Express.js
- PostgreSQL (Supabase)
- OpenAI API
- Anthropic API (Claude)
- Winston (logging)
- Jest (testing)

### Deployment
- Docker unified container
- DigitalOcean App Platform
- Single container policy ($5/month)
