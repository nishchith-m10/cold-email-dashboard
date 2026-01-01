# Project TODOs

## Email Tracking Fixes

- [x] Identify field name mismatch (`step` vs `email_number`)
- [x] Fix Email 2 JSON syntax issues
- [x] Verify API endpoint for Email 2 (`/api/events`)
- [ ] Update Email 1 JSON body (change `step` to `email_number` and use correct endpoint)
- [ ] Update Email 3 JSON body (change `step` to `email_number` and use correct endpoint)
- [ ] Verify sequence breakdown on dashboard

## Database & Supabase

- [x] Establish CLI connection
- [x] Verify `email_events` schema
- [x] Check for `null` or `0` step values in database
- [ ] Clean up any mismatched data in `email_events` table

## General

- [ ] [Add your tasks here...]


## Tracking & Analytics Improvements

- [ ] Audit and harden tracking injection logic for robustness
- [ ] Implement `deposit_note` field for tracking client deposits
- [ ] Add dashboard visualization for deposit balance and spending analysis