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

## Ports

**EXCLUSIVELY use port 3000 for Singularity frontend. Do NOT use port 3001 - that is for SlackKB.**

- Singularity frontend: http://localhost:3000

## DigitalOcean Deployment

Singularity is deployed on a DigitalOcean Droplet:

```
Project ID: fcd6038c-4c6b-4a55-84a8-8a782d8d362c
Droplet ID: 540599477
Droplet Name: singularity-web-2
Public IP: 64.227.53.254
Region: sfo2
```

To check status:
```bash
doctl compute droplet get 540599477 --format Name,PublicIPv4,Status
```

## Common Issues
2. **401 errors**: Check if using correct Supabase credentials
3. **No API key errors**: Make sure to use rjoberlander@gmail.com account
