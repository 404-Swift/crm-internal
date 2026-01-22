# Supabase Database Schema

This document describes the database schema for the Custom CRM application.

## Tables

### contacts

Stores contact and lead information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| email | TEXT | NOT NULL, UNIQUE | Contact email address |
| first_name | TEXT | NOT NULL | First name |
| last_name | TEXT | NOT NULL | Last name |
| company | TEXT | NULL | Company name |
| phone | TEXT | NULL | Phone number |
| source | TEXT | NULL | Lead source (website, referral, etc.) |
| status | TEXT | NULL | Contact status (lead, qualified, customer, inactive) |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| user_id | UUID | NOT NULL, FK to auth.users | Owner user ID |

**Indexes:**
- `idx_contacts_user_id` on `user_id`
- `idx_contacts_email` on `email`

### deals

Stores sales deals and pipeline information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| title | TEXT | NOT NULL | Deal title |
| contact_id | UUID | NOT NULL, FK to contacts | Associated contact |
| amount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Deal value |
| stage | TEXT | NOT NULL | Pipeline stage |
| probability | INTEGER | NOT NULL, 0-100 | Win probability percentage |
| expected_close_date | DATE | NULL | Expected close date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| user_id | UUID | NOT NULL, FK to auth.users | Owner user ID |

**Valid Stages:**
- prospecting
- qualification
- proposal
- negotiation
- closed-won
- closed-lost

**Indexes:**
- `idx_deals_user_id` on `user_id`
- `idx_deals_contact_id` on `contact_id`
- `idx_deals_stage` on `stage`

### activities

Stores activity logs and notes related to contacts and deals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| type | TEXT | NOT NULL | Activity type (call, email, meeting, note) |
| contact_id | UUID | NULL, FK to contacts | Associated contact (optional) |
| deal_id | UUID | NULL, FK to deals | Associated deal (optional) |
| description | TEXT | NOT NULL | Activity description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| user_id | UUID | NOT NULL, FK to auth.users | Owner user ID |

**Valid Types:**
- call
- email
- meeting
- note

**Indexes:**
- `idx_activities_user_id` on `user_id`
- `idx_activities_contact_id` on `contact_id`
- `idx_activities_deal_id` on `deal_id`

## Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- SELECT their own records (WHERE user_id = auth.uid())
- INSERT records with their own user_id
- UPDATE their own records
- DELETE their own records

## Automatic Timestamps

The `updated_at` column is automatically updated via triggers when a row is modified.

## Setup Instructions

1. Run the migration file in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
   ```

2. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('contacts', 'deals', 'activities');
   ```

3. Test RLS policies by creating a test user and verifying they can only see their own data.
