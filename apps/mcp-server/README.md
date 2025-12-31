# Singularity Health MCP Server

Connect Claude (Desktop, Code, Web) or ChatGPT to your Singularity Health data.

## What This Does

This MCP (Model Context Protocol) server allows AI assistants to:

- **Read** your health data (biomarkers, supplements, routines, goals, sleep)
- **Write** new data (save knowledge, add biomarkers, create goals)
- **Search** your health knowledge base

## Quick Start

### For Claude Desktop

1. **Get your API token** from Singularity Health app settings

2. **Edit your Claude config** (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "singularity-health": {
      "command": "npx",
      "args": ["-y", "@singularity/mcp-server"],
      "env": {
        "SINGULARITY_API_URL": "https://api.singularity.health/api/v1",
        "SINGULARITY_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

### For Claude Code

```bash
# Add the MCP server
claude mcp add singularity-health -- npx -y @singularity/mcp-server

# Set your token
export SINGULARITY_API_TOKEN="your-token-here"
```

### For Local Development

```bash
cd apps/mcp-server
npm install
npm run build

# Set environment variables
export SINGULARITY_API_URL="http://localhost:3001/api/v1"
export SINGULARITY_API_TOKEN="your-token"

# Run the server
npm start
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_health_summary` | Overview of all health data |
| `get_biomarkers` | Fetch biomarker/lab results |
| `get_biomarker_history` | Historical values for a biomarker |
| `add_biomarker` | Record a new lab result |
| `get_supplements` | List supplements |
| `add_supplement` | Add a supplement |
| `get_routines` | Daily routines |
| `get_goals` | Health goals |
| `add_goal` | Create a new goal |
| `search_knowledge` | Search protocol docs/KB |
| `get_knowledge` | List all KB entries |
| `save_knowledge` | Save new knowledge |
| `get_sleep_data` | Eight Sleep data |
| `get_sleep_analysis` | Sleep pattern analysis |

## Example Conversations

### With Claude

**You:** "What are my current supplement levels?"

**Claude:** *uses get_supplements* "You're currently taking 12 supplements including Vitamin D 5000 IU (morning), Magnesium Glycinate 400mg (evening)..."

---

**You:** "My latest Vitamin D test came back at 65 ng/mL"

**Claude:** *uses add_biomarker* "I've saved your Vitamin D result: 65 ng/mL. This is in the optimal range (40-80). Your previous reading was 42 ng/mL - nice improvement!"

---

**You:** "Remember that I should avoid taking calcium with thyroid medication"

**Claude:** *uses save_knowledge* "Saved to your knowledge base: 'Calcium-Thyroid Interaction' - avoid calcium supplements within 4 hours of thyroid medication."

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SINGULARITY_API_URL` | API base URL | `http://localhost:3001/api/v1` |
| `SINGULARITY_API_TOKEN` | Your auth token | (required) |
| `SINGULARITY_READ_ONLY` | Disable write operations | `false` |

## For ChatGPT Users

ChatGPT uses GPT Actions instead of MCP. You can use the same Singularity API:

1. Create a Custom GPT
2. Add an Action pointing to `https://api.singularity.health/api/v1`
3. Use Bearer token authentication with your API token

See `docs/chatgpt-action-schema.yaml` for the OpenAPI spec.

## Security

- Your API token is scoped to your data only
- Enable `SINGULARITY_READ_ONLY=true` if you only want to query data
- Tokens can be revoked anytime from the app settings
- No credentials are stored by the MCP server (env vars only)

## Troubleshooting

**"API error: 401"** - Check your SINGULARITY_API_TOKEN is set correctly

**"No biomarkers found"** - Make sure you have data in your Singularity account

**Tools not appearing** - Restart Claude Desktop/Code after config changes
