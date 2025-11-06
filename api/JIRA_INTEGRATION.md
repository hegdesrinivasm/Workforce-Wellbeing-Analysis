# Jira Integration Guide

## Overview

The Jira integration provides OAuth 2.0 (3LO) authentication and comprehensive workload analytics for Jira Cloud.

## Features

### Authentication
- **OAuth 2.0 (3LO)**: Secure user authorization
- **Token Refresh**: Automatic token renewal
- **Multi-Site Support**: Detects accessible Jira Cloud sites
- **Encrypted Storage**: Fernet encryption for tokens

### Data Collection
- **Issues**: Assigned/created issues with metadata
- **Worklogs**: Time tracking entries
- **Statistics**: Comprehensive workload metrics

## Setup

### 1. Create Jira OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new app
3. Configure OAuth 2.0 (3LO):
   - **App name**: Workforce Wellbeing Analytics
   - **Callback URL**: `http://localhost:8000/auth/jira/callback`
   - **Scopes**:
     - `read:jira-user` - User profile access
     - `read:jira-work` - Issues and worklogs
     - `offline_access` - Refresh tokens

4. Copy credentials to `.env`:
```bash
JIRA_CLIENT_ID=your-oauth-client-id
JIRA_CLIENT_SECRET=your-oauth-client-secret
JIRA_REDIRECT_URI=http://localhost:8000/auth/jira/callback
```

### 2. Test OAuth Flow

```bash
# 1. Start server
uvicorn main:app --reload

# 2. Initiate OAuth (in browser)
http://localhost:8000/auth/jira/login?user_id=YOUR_USER_ID

# 3. Authorize on Jira
# 4. Check connection status
curl http://localhost:8000/auth/status/YOUR_USER_ID
```

## API Endpoints

### Authentication

#### Initiate OAuth
```http
GET /auth/jira/login?user_id={user_id}
```

Redirects to Jira authorization page.

#### OAuth Callback
```http
GET /auth/jira/callback?code={code}&state={state}
```

Automatically called by Jira after user authorization.

#### Refresh Token
```http
POST /auth/refresh
{
  "user_id": "123",
  "provider": "jira"
}
```

### Data Fetching

#### Fetch Issues
```http
POST /data/jira/fetch
{
  "user_id": "123",
  "data_types": ["issues"],
  "days_back": 14
}
```

**Response:**
```json
{
  "results": {
    "issues": {
      "count": 23,
      "issues": [
        {
          "key": "PROJ-123",
          "summary": "Fix login bug",
          "status": "In Progress",
          "priority": "High",
          "issue_type": "Bug",
          "created": "2025-10-25T10:00:00Z",
          "updated": "2025-11-05T14:30:00Z",
          "resolved": null,
          "assignee": "account-id",
          "time_estimate": 14400,
          "time_spent": 7200
        }
      ]
    }
  }
}
```

#### Fetch Worklogs
```http
POST /data/jira/fetch
{
  "user_id": "123",
  "data_types": ["worklogs"],
  "days_back": 14
}
```

**Response:**
```json
{
  "results": {
    "worklogs": {
      "count": 45,
      "worklogs": [
        {
          "issue_key": "PROJ-123",
          "worklog_id": "10001",
          "time_spent_seconds": 7200,
          "started": "2025-11-05T09:00:00Z",
          "author": "account-id"
        }
      ]
    }
  }
}
```

#### Fetch Statistics
```http
POST /data/jira/fetch
{
  "user_id": "123",
  "data_types": ["stats"],
  "days_back": 14
}
```

**Response:**
```json
{
  "results": {
    "stats": {
      "total_assigned_issues": 23,
      "total_created_issues": 5,
      "total_resolved_issues": 18,
      "resolution_rate": 0.78,
      "status_distribution": {
        "In Progress": 3,
        "Done": 18,
        "To Do": 2
      },
      "priority_distribution": {
        "High": 8,
        "Medium": 12,
        "Low": 3
      },
      "total_time_logged_hours": 72.5,
      "avg_time_per_day_hours": 5.18,
      "worklog_by_weekday": {
        "Monday": 15.2,
        "Tuesday": 14.8,
        "Wednesday": 16.0,
        "Thursday": 13.5,
        "Friday": 13.0,
        "Saturday": 0,
        "Sunday": 0
      },
      "unique_projects": 4,
      "context_switching_score": 4
    }
  }
}
```

## Workload Metrics

### Issue Metrics
- **Total Assigned Issues**: Issues currently assigned to user
- **Total Created Issues**: Issues user created
- **Total Resolved Issues**: Issues user resolved
- **Resolution Rate**: Percentage of assigned issues resolved

### Time Tracking
- **Total Time Logged**: Sum of all worklog entries (hours)
- **Avg Time Per Day**: Daily average time logged
- **Worklog by Weekday**: Time distribution across days

### Workload Indicators
- **Context Switching Score**: Number of unique projects (higher = more switching)
- **Priority Distribution**: Issue breakdown by priority
- **Status Distribution**: Issue breakdown by status

## ML Features

The Jira integration enables extraction of:

1. **Workload Volume**
   - Issues per week
   - Time logged per day
   - Estimation vs actual time

2. **Context Switching**
   - Unique projects count
   - Issue type diversity
   - Project switching frequency

3. **Work Patterns**
   - Worklog time distribution
   - Weekend/after-hours work
   - Average issue completion time

4. **Performance Indicators**
   - Resolution rate
   - Time estimation accuracy
   - Priority handling patterns

## Architecture

### Classes

#### `JiraOAuth`
Handles OAuth 2.0 authentication flow:
- `get_authorization_url(state)` - Generate OAuth URL
- `exchange_code_for_token(code)` - Get access token
- `refresh_access_token(refresh_token)` - Renew token
- `get_accessible_resources(access_token)` - List Jira sites

#### `JiraAPI`
Manages API calls and data retrieval:
- `get_current_user()` - User account info
- `get_user_issues(account_id, start_date, end_date)` - Fetch issues
- `get_user_worklogs(account_id, start_date, end_date)` - Fetch worklogs
- `get_user_stats(account_id, start_date, end_date)` - Calculate statistics

### Database Schema

**OAuthToken** table stores:
```python
{
  "user_id": "123",
  "provider": "jira",
  "access_token": "encrypted_token",
  "refresh_token": "encrypted_refresh_token",
  "expires_at": "2025-11-07T10:00:00Z",
  "metadata": {
    "cloud_id": "site-cloud-id",
    "cloud_url": "https://yoursite.atlassian.net",
    "site_name": "Your Jira Site"
  }
}
```

## Security

- **Encrypted Tokens**: Fernet symmetric encryption
- **HTTPS Only**: Production requires SSL
- **State Parameter**: CSRF protection
- **Token Expiration**: Automatic refresh handling
- **Scope Limitation**: Read-only access

## Troubleshooting

### "No Jira sites accessible"
- User must have access to at least one Jira Cloud site
- Check user permissions in Jira admin

### "Token expired"
Use refresh endpoint:
```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123","provider":"jira"}'
```

### "cloud_id not found"
Re-authenticate:
```bash
# Visit in browser
http://localhost:8000/auth/jira/login?user_id=123
```

## Next Steps

- Integrate with feature extraction pipeline
- Add worklog pattern analysis
- Correlate with Microsoft Graph calendar
- Build burnout prediction model using Jira metrics
