"""
Jira OAuth2 and API integration for workforce wellbeing analysis
Supports Jira Cloud with OAuth 2.0 (3LO)
"""

import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)


class JiraOAuth:
    """Handle Jira OAuth 2.0 (3LO) authentication"""
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        scopes: List[str]
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.scopes = scopes
        self.auth_url = "https://auth.atlassian.com/authorize"
        self.token_url = "https://auth.atlassian.com/oauth/token"
        self.resource_url = "https://api.atlassian.com/oauth/token/accessible-resources"
    
    def get_authorization_url(self, state: str) -> str:
        """Generate OAuth2 authorization URL"""
        params = {
            "audience": "api.atlassian.com",
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "redirect_uri": self.redirect_uri,
            "state": state,
            "response_type": "code",
            "prompt": "consent"
        }
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                json={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise Exception(f"Failed to exchange code for token: {response.text}")
            
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh the access token using refresh token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                json={
                    "grant_type": "refresh_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.text}")
                raise Exception(f"Failed to refresh token: {response.text}")
            
            return response.json()
    
    async def get_accessible_resources(self, access_token: str) -> List[Dict]:
        """Get list of Jira sites the user has access to"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.resource_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get resources: {response.text}")
                raise Exception(f"Failed to get accessible resources: {response.text}")
            
            return response.json()


class JiraAPI:
    """Handle Jira API calls for data extraction"""
    
    def __init__(self, access_token: str, cloud_id: str):
        self.access_token = access_token
        self.cloud_id = cloud_id
        self.base_url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
    
    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make authenticated request to Jira API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/{endpoint}"
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"Jira API request failed: {response.status_code} - {response.text}")
                raise Exception(f"Jira API error: {response.status_code}")
            
            return response.json()
    
    async def get_current_user(self) -> Dict:
        """Get current authenticated user information"""
        try:
            data = await self._make_request("myself")
            return {
                "account_id": data.get("accountId"),
                "email": data.get("emailAddress"),
                "display_name": data.get("displayName"),
                "timezone": data.get("timeZone")
            }
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            raise
    
    async def get_user_issues(
        self,
        account_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_results: int = 100
    ) -> List[Dict]:
        """
        Get issues assigned to or created by the user
        Returns issues with key fields for workload analysis
        """
        try:
            # Build JQL query
            jql_parts = [f"(assignee = '{account_id}' OR creator = '{account_id}')"]
            
            if start_date:
                jql_parts.append(f"updated >= '{start_date.strftime('%Y-%m-%d')}'")
            if end_date:
                jql_parts.append(f"updated <= '{end_date.strftime('%Y-%m-%d')}'")
            
            jql = " AND ".join(jql_parts)
            
            params = {
                "jql": jql,
                "maxResults": max_results,
                "fields": "summary,status,priority,created,updated,assignee,creator,resolutiondate,issuetype,timetracking,worklog,project"
            }
            
            data = await self._make_request("search", params)
            
            issues = []
            for issue in data.get("issues", []):
                fields = issue.get("fields", {})
                issues.append({
                    "key": issue.get("key"),
                    "id": issue.get("id"),
                    "summary": fields.get("summary"),
                    "status": fields.get("status", {}).get("name"),
                    "priority": fields.get("priority", {}).get("name"),
                    "issue_type": fields.get("issuetype", {}).get("name"),
                    "created": fields.get("created"),
                    "updated": fields.get("updated"),
                    "resolved": fields.get("resolutiondate"),
                    "assignee": fields.get("assignee", {}).get("accountId") if fields.get("assignee") else None,
                    "creator": fields.get("creator", {}).get("accountId") if fields.get("creator") else None,
                    "project": fields.get("project", {}).get("key"),
                    "time_estimate": fields.get("timetracking", {}).get("originalEstimateSeconds"),
                    "time_spent": fields.get("timetracking", {}).get("timeSpentSeconds")
                })
            
            return issues
        
        except Exception as e:
            logger.error(f"Error getting user issues: {e}")
            raise
    
    async def get_user_worklogs(
        self,
        account_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Get worklogs for a user within a date range
        Returns time tracking data for workload analysis
        """
        try:
            # Get issues first, then fetch worklogs
            issues = await self.get_user_issues(
                account_id,
                start_date,
                end_date,
                max_results=200
            )
            
            all_worklogs = []
            
            for issue in issues:
                issue_key = issue["key"]
                
                try:
                    # Get worklogs for this issue
                    worklog_data = await self._make_request(f"issue/{issue_key}/worklog")
                    worklogs = worklog_data.get("worklogs", [])
                    
                    # Filter worklogs by user and date range
                    for worklog in worklogs:
                        author_id = worklog.get("author", {}).get("accountId")
                        started = datetime.fromisoformat(worklog.get("started").replace("Z", "+00:00"))
                        
                        if author_id == account_id and start_date <= started <= end_date:
                            all_worklogs.append({
                                "issue_key": issue_key,
                                "worklog_id": worklog.get("id"),
                                "time_spent_seconds": worklog.get("timeSpentSeconds"),
                                "started": worklog.get("started"),
                                "author": author_id,
                                "comment": worklog.get("comment", {}).get("content", [])
                            })
                
                except Exception as e:
                    logger.warning(f"Error fetching worklogs for {issue_key}: {e}")
                    continue
            
            return all_worklogs
        
        except Exception as e:
            logger.error(f"Error getting user worklogs: {e}")
            raise
    
    async def get_user_stats(
        self,
        account_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Calculate comprehensive workload statistics for a user
        """
        try:
            issues = await self.get_user_issues(account_id, start_date, end_date, max_results=500)
            worklogs = await self.get_user_worklogs(account_id, start_date, end_date)
            
            # Calculate statistics
            assigned_issues = [i for i in issues if i["assignee"] == account_id]
            created_issues = [i for i in issues if i["creator"] == account_id]
            resolved_issues = [i for i in assigned_issues if i["resolved"]]
            
            # Issue counts by status
            status_counts = {}
            for issue in assigned_issues:
                status = issue["status"]
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Issue counts by priority
            priority_counts = {}
            for issue in assigned_issues:
                priority = issue["priority"] or "None"
                priority_counts[priority] = priority_counts.get(priority, 0) + 1
            
            # Time tracking
            total_time_spent = sum(w["time_spent_seconds"] for w in worklogs if w["time_spent_seconds"])
            total_time_estimated = sum(i["time_estimate"] for i in assigned_issues if i["time_estimate"])
            
            # Worklog distribution by day of week
            worklog_by_day = {i: 0 for i in range(7)}  # 0=Monday, 6=Sunday
            for worklog in worklogs:
                started = datetime.fromisoformat(worklog["started"].replace("Z", "+00:00"))
                worklog_by_day[started.weekday()] += worklog["time_spent_seconds"]
            
            # Calculate days worked
            days_range = (end_date - start_date).days + 1
            
            return {
                "total_assigned_issues": len(assigned_issues),
                "total_created_issues": len(created_issues),
                "total_resolved_issues": len(resolved_issues),
                "resolution_rate": len(resolved_issues) / len(assigned_issues) if assigned_issues else 0,
                "status_distribution": status_counts,
                "priority_distribution": priority_counts,
                "total_time_logged_seconds": total_time_spent,
                "total_time_logged_hours": total_time_spent / 3600 if total_time_spent else 0,
                "total_estimated_seconds": total_time_estimated,
                "total_estimated_hours": total_time_estimated / 3600 if total_time_estimated else 0,
                "avg_time_per_day_seconds": total_time_spent / days_range if days_range > 0 else 0,
                "avg_time_per_day_hours": (total_time_spent / 3600) / days_range if days_range > 0 else 0,
                "worklog_by_weekday": {
                    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]: seconds / 3600
                    for day, seconds in worklog_by_day.items()
                },
                "unique_projects": len(set(i["project"] for i in assigned_issues if i["project"])),
                "context_switching_score": len(set(i["project"] for i in assigned_issues if i["project"])),  # Higher = more context switching
                "worklog_count": len(worklogs)
            }
        
        except Exception as e:
            logger.error(f"Error calculating user stats: {e}")
            raise
