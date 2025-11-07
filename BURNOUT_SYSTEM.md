# Burnout Alert & Volunteer System

## Overview
This feature allows team members to see colleagues who are experiencing burnout or high stress and volunteer to help them by taking on some of their tasks. When a member volunteers, the supervisor receives a notification.

## How It Works

### 1. **Burnout Detection**
Team members are flagged as "burnt out" if they have:
- Wellbeing score < 60
- Stress level = "high"
- Exhaustion flag = true

### 2. **Eligible Helpers (Who Gets Notified)**
Burnout alerts are ONLY sent to team members who:
- **Are NOT burnt out themselves** (wellbeing ≥ 60, stress ≠ high, not exhausted)
- **Have high task completion rate** (> 75%)

This ensures only capable, available members are asked to help.

### 3. **Member View (Burnout Alerts)**
- **Only eligible members** receive notifications (not burnt out + task completion > 75%)
- Members see a "Team Members Need Support" notification in their inbox
- Shows colleagues from their team who are experiencing burnout
- Displays their:
  - Name and email
  - Wellbeing score
  - Stress level
  - "High Stress" badge

### 4. **Volunteering Process**
1. **Eligible member** clicks "Volunteer to Help" button in notification
2. System creates TWO notifications:
   - **To Supervisor**: "{VolunteerName} has volunteered to help {BurnoutMemberName} who is experiencing high stress/burnout."
   - **To Burnout Member**: "{VolunteerName} has offered to help you with some tasks. Your supervisor has been notified."
3. Original burnout alert is deleted
4. Success confirmation shown

### 5. **Supervisor Notification**
- Supervisor sees notification in bell icon (header)
- Badge shows unread count
- Notification includes:
  - Volunteer's name and email
  - Burnout member's name and email
  - Timestamp
  - Can be deleted or cleared

## Data Structure

### Firestore Collections

#### `notifications`
```javascript
{
  userId: string,              // Who receives the notification
  message: string,             // Notification text
  severity: 'info' | 'warning' | 'error' | 'success',
  timestamp: string,           // ISO format
  read: boolean,
  volunteerId: string,         // ID of volunteer (optional)
  volunteerName: string,       // Name of volunteer (optional)
  volunteerEmail: string,      // Email of volunteer (optional)
  burnoutMemberId: string,     // ID of burnout member (optional)
  burnoutMemberName: string,   // Name of burnout member (optional)
  burnoutMemberEmail: string,  // Email of burnout member (optional)
  type: 'volunteer_offer' | 'help_offered'
}
```

## Security Rules
The `firestore.rules` file includes:
- Users can only read their own notifications
- Any authenticated user can create notifications
- Users can only delete their own notifications

## Components

### `BurnoutAlerts.tsx`
- Displays burnout members in the team
- Handles volunteering logic
- Creates notifications for supervisor and burnout member

### `NotificationBar.tsx`
- Bell icon in header with badge count
- Dropdown menu showing all notifications
- Auto-fetches from Firestore every 30 seconds
- Marks as read when opened
- Delete individual or clear all

## Future Enhancements
- Task reassignment workflow (supervisor assigns specific tasks)
- Analytics on volunteer response rates
- Burnout prevention recommendations
- Email notifications for critical alerts
- Task history tracking
