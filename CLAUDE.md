# Claude Code Instructions for Singularity

## Test Account for Playwright

When running Playwright tests that require authentication, use the primary user account:

```
Email: rjoberlander@gmail.com
Password: Cookie123!
User ID: b201a860-05a3-4ddc-bb89-4c4271177271
```

This account has:
- Anthropic API key configured
- OpenAI API key configured
- Perplexity API key configured

Do NOT use the test@singularity.app account for AI-related tests as it doesn't have API keys configured.

## API Servers

- **Singularity API**: Port 3001 - Make sure this is running, NOT SlackKB
- **Web App**: Port 3000

To verify correct API:
```bash
curl http://localhost:3001/api/v1
# Should return: {"app":"Singularity",...}
```

## Common Issues

1. **Wrong API running**: Kill SlackKB if it's on port 3001 and start Singularity API
2. **401 errors**: Check if using correct Supabase credentials
3. **No API key errors**: Make sure to use rjoberlander@gmail.com account
