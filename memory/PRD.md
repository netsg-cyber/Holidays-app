# Holiday Request Management System - PRD

## Original Problem Statement
Webapp integrated in WordPress (iframe) to manage holiday requests. Employees are WP users. HR department approves/rejects requests. HR assigns holiday credits per employee. Public holidays managed by HR. Credits from year N-1 deleted on July 31 of year N. Shared calendar shows approved holidays and public holidays.

## User Personas
1. **Employee**: Can view credits, submit holiday requests, track request status, view team calendar
2. **HR Manager**: All employee features + approve/reject requests, manage credits, manage public holidays, configure settings, manage user roles

## Core Requirements
- Google authentication (Emergent Auth)
- Holiday request submission with date picker
- Request approval/rejection workflow
- Holiday credits management (default 35 days/year)
- Public holidays management
- Shared calendar view
- Email notifications via Gmail API
- Google Calendar sync for approved holidays
- Settings management (notifications, calendar sync)
- User role management (employee/hr)

## Architecture
- **Frontend**: React with Shadcn UI, Tailwind CSS
- **Backend**: FastAPI with MongoDB
- **Auth**: Emergent Google OAuth
- **Integrations**: Gmail API, Google Calendar API

## What's Been Implemented (Jan 2026)
- [x] Google authentication with Emergent Auth
- [x] Employee dashboard with credits overview
- [x] Holiday request creation with date picker
- [x] Request status tracking (pending/approved/rejected)
- [x] HR dashboard for managing all requests
- [x] HR credits management (assign/edit per employee)
- [x] HR public holidays management
- [x] HR settings page (notifications, calendar sync, user roles)
- [x] Google OAuth integration for Gmail/Calendar
- [x] Shared team calendar with events
- [x] Responsive sidebar navigation
- [x] Professional UI following design guidelines

## P0/P1/P2 Features
### P0 (Done)
- Authentication, Dashboard, Request workflow, Credits, Calendar

### P1 (Next)
- Credit expiration automation (cron job for July 31)
- Email notification sending (requires Google OAuth connection)
- Reminder emails 1 month before credit expiration

### P2 (Backlog)
- Department/team grouping
- Request delegation
- Holiday balance reports
- Multi-language support

## Next Tasks
1. Test Google OAuth flow for Gmail/Calendar
2. Add cron job for credit expiration
3. Add reminder notification system
4. Add department management
