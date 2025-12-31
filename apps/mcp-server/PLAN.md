# Singularity Health MCP Server - Implementation Plan

## Overview

Build an MCP (Model Context Protocol) server that allows Claude (Desktop, Code, or Web with Connectors) and other AI assistants to interact with the Singularity Health API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Database                        │
│         (biomarkers, supplements, routines, goals, KB)       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Singularity API                           │
│                  (existing Express app)                      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP + Auth Token
                              │
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (NEW)                          │
│                                                              │
│  Tools:                        Resources:                    │
│  ├─ get_health_summary         ├─ health://biomarkers        │
│  ├─ get_biomarkers             ├─ health://supplements       │
│  ├─ get_supplements            ├─ health://routines          │
│  ├─ get_routines               ├─ health://goals             │
│  ├─ get_goals                  └─ health://knowledge         │
│  ├─ search_knowledge                                         │
│  ├─ save_knowledge             Prompts:                      │
│  └─ add_biomarker              ├─ health-review              │
│                                └─ supplement-check           │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ MCP Protocol (stdio/SSE)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐          ┌─────────┐
    │ Claude  │         │ Claude  │          │ ChatGPT │
    │ Desktop │         │  Code   │          │  (API)  │
    └─────────┘         └─────────┘          └─────────┘
```

## User Impact

**Existing users:** Zero impact - web/mobile apps work exactly the same.

**New capability:** Users can optionally:
1. Generate an API token from the app
2. Configure their AI assistant (Claude/ChatGPT) with the token
3. Chat with their health data from their preferred AI

## Implementation

### Phase 1: Core MCP Server

**Files to create:**
```
apps/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── config.ts             # Configuration
│   ├── api-client.ts         # HTTP client for Singularity API
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   ├── biomarkers.ts     # Biomarker tools
│   │   ├── supplements.ts    # Supplement tools
│   │   ├── routines.ts       # Routine tools
│   │   ├── goals.ts          # Goal tools
│   │   └── knowledge.ts      # Knowledge/KB tools
│   ├── resources/
│   │   └── index.ts          # Resource handlers
│   └── prompts/
│       └── index.ts          # Prompt templates
└── README.md                 # Setup documentation
```

### Phase 2: Tools Implementation

| Tool | Description | API Endpoint |
|------|-------------|--------------|
| `get_health_summary` | Overview of all health data | Multiple endpoints |
| `get_biomarkers` | Fetch biomarker data with filters | GET /biomarkers |
| `get_supplements` | List supplements (active/all) | GET /supplements |
| `get_routines` | Daily routines with items | GET /routines |
| `get_goals` | Health goals and progress | GET /goals |
| `search_knowledge` | Search protocol docs/KB | GET /protocol-docs/search |
| `save_knowledge` | Save new knowledge entry | POST /protocol-docs |
| `add_biomarker` | Record new biomarker | POST /biomarkers |

### Phase 3: Authentication

Two modes:
1. **Direct Supabase** - For personal use with service key
2. **API Token** - For users connecting their own AI

```typescript
// Config options
{
  mode: 'direct' | 'api',
  // Direct mode
  supabaseUrl?: string,
  supabaseKey?: string,
  userId?: string,
  // API mode
  apiBaseUrl?: string,
  apiToken?: string
}
```

### Phase 4: Distribution

**For Claude Desktop/Code:**
- npm package: `@singularity/mcp-server`
- Config in `claude_desktop_config.json`

**For ChatGPT:**
- OpenAPI spec for GPT Actions
- Same API endpoints work

## Configuration Examples

### Claude Desktop
```json
{
  "mcpServers": {
    "singularity-health": {
      "command": "npx",
      "args": ["@singularity/mcp-server"],
      "env": {
        "SINGULARITY_API_URL": "https://api.singularity.health",
        "SINGULARITY_API_TOKEN": "user-token-here"
      }
    }
  }
}
```

### Claude Code
```bash
claude mcp add singularity-health npx @singularity/mcp-server
```

## Security Considerations

1. API tokens scoped to user's data only
2. Read-only mode option for cautious users
3. Rate limiting inherited from API
4. No credential storage in MCP server (env vars only)
