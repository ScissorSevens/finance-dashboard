# Auth + Supabase Cross-device Persistence Specification

## Purpose

Cloud authentication via Clerk and persistent storage via Supabase PostgreSQL, replacing localStorage-only mode while preserving fallback capability.

## Requirements

### Requirement: Clerk Authentication

The system MUST integrate Clerk for user authentication supporting email and Google social login.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Unauthenticated user | No active session | App loads | Login screen presented |
| Email login | User enters valid email + password | Submits form | Session created, app loads |
| Google login | User clicks Google button | OAuth flow completes | Session created with Clerk user ID |
| Session expired | Token expired | User navigates | Redirect to login with message |
| Logout | User authenticated | Clicks logout | Session destroyed, login screen shown |

### Requirement: Supabase Data Persistence

The system MUST persist all transactions and categories to Supabase PostgreSQL, replacing localStorage as primary storage when authenticated.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Create transaction | User authenticated | Transaction submitted | Row inserted into `transactions` table with `user_id` from Clerk |
| Read transactions | User authenticated, has data | Dashboard loads | All user's transactions fetched from Supabase |
| Update transaction | Transaction exists | User edits | Row updated in Supabase |
| Delete transaction | Transaction exists | User confirms delete | Row removed from Supabase |
| Network failure | User authenticated, no internet | CRUD attempted | Operation fails gracefully, user notified |

### Requirement: Row-Level Security (RLS)

The system MUST enforce RLS policies on Supabase tables ensuring users can only access their own data.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| User A queries transactions | User A authenticated | Fetches transactions | Only User A's rows returned |
| User A queries User B's data | User A authenticated | Direct query for User B's user_id | Zero rows returned |
| Unauthenticated query | No valid JWT | API call attempted | Supabase rejects with 401 |

### Requirement: localStorage Migration

The system MUST detect existing localStorage data on first login and offer atomic migration to Supabase.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Data exists in localStorage | User has transactions locally | First login after integration | Migration dialog shown: "Found X transactions. Sync to cloud?" |
| User accepts migration | Migration dialog shown | User clicks Confirm | All transactions bulk-inserted to Supabase, localStorage cleared, flag set |
| User declines migration | Migration dialog shown | User clicks Decline | Dual-mode enabled, localStorage remains primary |
| No localStorage data | Clean install | First login | No migration dialog, Supabase is primary |
| Migration partial failure | 5 of 100 inserts fail | Bulk insert runs | Entire migration rolled back, error message shown, localStorage preserved |

### Requirement: Dual-Mode Fallback

The system MUST support a dual-mode where localStorage remains functional if user declines migration or Supabase is unavailable.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| User declined migration | `migrationComplete` flag false | CRUD operations | localStorage used as storage |
| Supabase unavailable | Network error or outage | CRUD operations | localStorage used as fallback with offline indicator |
| User reconnects | Was offline, now online | App detects connectivity | Sync prompt shown to push local changes |

### Requirement: Clerk-Supabase User ID Sync

The system SHALL use Clerk's `user.id` as the `user_id` foreign key in Supabase tables.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Clerk session active | User authenticated via Clerk | Data written to Supabase | `user_id` column equals Clerk `user.id` |
| Different Clerk accounts | User logs in with account B | Reads data | Only sees account B's data, not account A's |
