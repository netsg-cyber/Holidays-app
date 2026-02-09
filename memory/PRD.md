# Holiday Request Management System - PRD

## Original Problem Statement
Webapp integrated in WordPress (iframe) to manage holiday requests. Employees are WP users. HR department approves/rejects requests. HR assigns holiday credits per employee by category. Public holidays managed by HR. Credits from year N-1 deleted on July 31 of year N. Shared calendar shows approved holidays and public holidays.

## Holiday Categories
1. **Paid Holidays** - Default 35 days/year - Regular paid time off
2. **Unpaid Leave** - Default 0 days - Leave without pay
3. **Sick Leave (No Justification)** - Default 5 days - Sick leave without medical certificate
4. **Parental Leave** - Default 10 days - Leave for parental duties
5. **Maternity Leave** - Default 90 days - Leave for maternity/paternity

## User Personas
1. **Employee**: Can view credits by category, submit requests with category selection, track request status, view team calendar
2. **HR Manager**: All employee features + approve/reject requests, manage credits per category, manage public holidays, configure settings, manage user roles

## Core Requirements
- Google authentication (Emergent Auth)
- Holiday request submission with category selection and date picker
- Request approval/rejection workflow
- Holiday credits management per category (5 categories)
- Public holidays management
- Shared calendar view with category color coding
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
- [x] 5 Holiday categories with distinct icons and colors
- [x] Employee dashboard with credits overview per category
- [x] Holiday request creation with category selection
- [x] Request status tracking (pending/approved/rejected)
- [x] HR dashboard for managing all requests with category filter
- [x] HR credits management per category per employee
- [x] HR public holidays management
- [x] HR settings page (notifications, calendar sync, user roles)
- [x] Google OAuth integration for Gmail/Calendar
- [x] Shared team calendar with category-colored events
- [x] Responsive sidebar navigation
- [x] Professional UI with Manrope/Inter fonts

## P0/P1/P2 Features
### P0 (Done)
- Authentication, Dashboard, Request workflow with categories, Credits per category, Calendar

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
