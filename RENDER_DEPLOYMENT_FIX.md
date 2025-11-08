# Render Deployment Fix Guide

## Issue: "Loading App" Forever on Render

This happens when OAuth redirects are not properly configured for production. Here's how to fix it:

## Step 1: Update Render Environment Variables

Go to your Render dashboard and add these environment variables to your **backend service**:

### Required Base URLs
```
BASE_URL=https://your-backend-service.onrender.com
FRONTEND_URL=https://your-frontend-service.onrender.com
CORS_ORIGINS=https://your-frontend-service.onrender.com,http://localhost:5173
```

### OAuth Redirect URIs

For each OAuth provider you're using, set the redirect URI:

#### Microsoft/Azure AD
```
MICROSOFT_REDIRECT_URI=https://your-backend-service.onrender.com/auth/microsoft/callback
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

**Then update in Azure Portal:**
1. Go to Azure Portal → App Registrations
2. Select your app
3. Go to "Authentication" → "Platform configurations"
4. Add redirect URI: `https://your-backend-service.onrender.com/auth/microsoft/callback`
5. Save changes

#### Slack
```
SLACK_REDIRECT_URI=https://your-backend-service.onrender.com/auth/slack/callback
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
```

**Then update in Slack API Dashboard:**
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to "OAuth & Permissions"
4. Add redirect URL: `https://your-backend-service.onrender.com/auth/slack/callback`
5. Save changes

#### Jira
```
JIRA_REDIRECT_URI=https://your-backend-service.onrender.com/auth/jira/callback
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret
```

**Then update in Atlassian Developer Console:**
1. Go to https://developer.atlassian.com/console/myapps/
2. Select your app
3. Go to "Authorization" → "OAuth 2.0 (3LO)"
4. Add callback URL: `https://your-backend-service.onrender.com/auth/jira/callback`
5. Save changes

#### Google (for Sheets)
```
GOOGLE_REDIRECT_URI=https://your-backend-service.onrender.com/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Then update in Google Cloud Console:**
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://your-backend-service.onrender.com/auth/google/callback`
6. Save changes

## Step 2: Update Frontend Environment Variables

In your **frontend service** on Render, add:

```
VITE_API_URL=https://your-backend-service.onrender.com
```

## Step 3: Check Health Endpoint

After deployment, verify your backend is running:

```bash
curl https://your-backend-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "oauth_providers": {
    "microsoft": true,
    "slack": true,
    "jira": true
  }
}
```

## Step 4: Redeploy

After updating all environment variables:

1. Go to Render dashboard
2. Select your backend service
3. Click "Manual Deploy" → "Clear build cache & deploy"
4. Wait for deployment to complete
5. Repeat for frontend service

## Step 5: Test OAuth Flow

1. Open your frontend: `https://your-frontend-service.onrender.com`
2. Try to login or setup integrations
3. OAuth should now redirect properly

## Common Issues & Solutions

### Issue: Still seeing "Loading App"

**Solution:** 
- Clear browser cache and cookies
- Check browser console for CORS errors
- Verify all redirect URIs match exactly (including https://)

### Issue: CORS errors in browser console

**Solution:**
```bash
# In Render dashboard, update CORS_ORIGINS to include your frontend URL
CORS_ORIGINS=https://your-frontend-service.onrender.com
```

### Issue: OAuth provider says "Redirect URI mismatch"

**Solution:**
- Double-check the redirect URI in the provider's dashboard
- Make sure it matches exactly: `https://your-backend-service.onrender.com/auth/PROVIDER/callback`
- No trailing slashes
- Must use https:// (not http://)

### Issue: Database connection errors

**Solution:**
```bash
# In Render dashboard, set DATABASE_URL to your Render PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@hostname/dbname
```

### Issue: Backend takes long to respond

**Solution:**
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Consider upgrading to paid tier for always-on instances

## Step 6: Optional - Add Custom Domain

If you have a custom domain:

1. In Render dashboard, go to "Settings" → "Custom Domain"
2. Add your domain (e.g., `api.yourdomain.com` for backend)
3. Update all environment variables to use custom domain
4. Update OAuth provider redirect URIs to use custom domain

## Verification Checklist

- [ ] Backend health check responds with 200 OK
- [ ] Frontend loads without errors
- [ ] Browser console shows no CORS errors
- [ ] OAuth redirect URIs match in both Render and provider dashboards
- [ ] Environment variables are set in Render dashboard
- [ ] Services have been redeployed after changes

## Quick Fix Script

Create a file `check-render-config.sh`:

```bash
#!/bin/bash

BACKEND_URL="https://your-backend-service.onrender.com"
FRONTEND_URL="https://your-frontend-service.onrender.com"

echo "🔍 Checking Render Configuration..."
echo ""

echo "✅ Testing Backend Health..."
curl -s "$BACKEND_URL/health" | jq '.'

echo ""
echo "✅ Testing Backend Root..."
curl -s "$BACKEND_URL/" | jq '.'

echo ""
echo "✅ Testing Pipeline Health..."
curl -s "$BACKEND_URL/pipeline/health" | jq '.'

echo ""
echo "✅ Testing Frontend..."
curl -I "$FRONTEND_URL"

echo ""
echo "Configuration URLs to update in OAuth providers:"
echo "Microsoft: $BACKEND_URL/auth/microsoft/callback"
echo "Slack: $BACKEND_URL/auth/slack/callback"
echo "Jira: $BACKEND_URL/auth/jira/callback"
echo "Google: $BACKEND_URL/auth/google/callback"
```

Run it to verify your configuration:
```bash
chmod +x check-render-config.sh
./check-render-config.sh
```

## Need More Help?

1. Check Render logs: Dashboard → Service → Logs tab
2. Check browser console: F12 → Console tab
3. Verify OAuth provider settings match exactly
4. Ensure all environment variables are set (no typos)
5. Try deploying from a clean state (clear build cache)

## Production-Ready Checklist

Before going live:

- [ ] All OAuth redirect URIs updated in provider dashboards
- [ ] Environment variables set in Render (not hardcoded)
- [ ] HTTPS enabled (automatic on Render)
- [ ] Health check endpoint working
- [ ] Database connection configured
- [ ] SECRET_KEY is generated (use Render's auto-generate)
- [ ] CORS_ORIGINS includes production frontend URL
- [ ] Frontend points to production backend URL
- [ ] Test complete OAuth flow from start to finish
- [ ] Clear browser cache and test fresh login
