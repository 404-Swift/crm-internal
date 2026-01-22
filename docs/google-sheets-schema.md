# Google Sheets Schema

This document describes the Google Sheets structure that serves as the source of truth for the CRM data.

## Overview

Google Sheets contains three main sheets:
1. **Contacts** - Contact and lead information
2. **Deals** - Sales pipeline deals
3. **Activities** - Activity logs and notes

## Contacts Sheet

### Column Structure

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| ID | UUID/Text | Yes | Unique identifier (UUID format) | `550e8400-e29b-41d4-a716-446655440000` |
| Email | Email | Yes | Contact email address | `john.doe@example.com` |
| First Name | Text | Yes | First name | `John` |
| Last Name | Text | Yes | Last name | `Doe` |
| Company | Text | No | Company name | `Acme Corp` |
| Phone | Text | No | Phone number | `+1-555-123-4567` |
| Source | Text | No | Lead source | `website`, `referral`, `social`, `advertisement`, `other` |
| Status | Text | No | Contact status | `lead`, `qualified`, `customer`, `inactive` |
| Created At | DateTime | Yes | Creation timestamp (ISO 8601) | `2024-01-15T10:30:00Z` |
| Updated At | DateTime | Yes | Last update timestamp (ISO 8601) | `2024-01-20T14:45:00Z` |
| User ID | UUID | Yes | Owner user ID (from Supabase auth) | `user-uuid-here` |

### Sample Data

```
ID | Email | First Name | Last Name | Company | Phone | Source | Status | Created At | Updated At | User ID
550e8400... | john@example.com | John | Doe | Acme Corp | +1-555-1234 | website | customer | 2024-01-15T10:30:00Z | 2024-01-20T14:45:00Z | user-uuid
```

## Deals Sheet

### Column Structure

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| ID | UUID/Text | Yes | Unique identifier (UUID format) | `550e8400-e29b-41d4-a716-446655440000` |
| Title | Text | Yes | Deal title | `Q1 Enterprise License` |
| Contact ID | UUID | Yes | Reference to Contacts sheet ID | `550e8400-e29b-41d4-a716-446655440000` |
| Amount | Number | Yes | Deal value | `50000` |
| Stage | Text | Yes | Pipeline stage | `prospecting`, `qualification`, `proposal`, `negotiation`, `closed-won`, `closed-lost` |
| Probability | Integer | Yes | Win probability (0-100) | `75` |
| Expected Close Date | Date | No | Expected close date (YYYY-MM-DD) | `2024-03-31` |
| Created At | DateTime | Yes | Creation timestamp (ISO 8601) | `2024-01-15T10:30:00Z` |
| Updated At | DateTime | Yes | Last update timestamp (ISO 8601) | `2024-01-20T14:45:00Z` |
| User ID | UUID | Yes | Owner user ID (from Supabase auth) | `user-uuid-here` |

### Valid Stages

- `prospecting` - Initial contact
- `qualification` - Qualifying the lead
- `proposal` - Proposal sent
- `negotiation` - Negotiating terms
- `closed-won` - Deal won
- `closed-lost` - Deal lost

### Sample Data

```
ID | Title | Contact ID | Amount | Stage | Probability | Expected Close Date | Created At | Updated At | User ID
550e8400... | Q1 Enterprise | 550e8400... | 50000 | negotiation | 75 | 2024-03-31 | 2024-01-15T10:30:00Z | 2024-01-20T14:45:00Z | user-uuid
```

## Activities Sheet

### Column Structure

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| ID | UUID/Text | Yes | Unique identifier (UUID format) | `550e8400-e29b-41d4-a716-446655440000` |
| Type | Text | Yes | Activity type | `call`, `email`, `meeting`, `note` |
| Contact ID | UUID | No | Reference to Contacts sheet ID | `550e8400-e29b-41d4-a716-446655440000` |
| Deal ID | UUID | No | Reference to Deals sheet ID | `550e8400-e29b-41d4-a716-446655440000` |
| Description | Text | Yes | Activity description | `Follow-up call about pricing` |
| Created At | DateTime | Yes | Creation timestamp (ISO 8601) | `2024-01-15T10:30:00Z` |
| User ID | UUID | Yes | Owner user ID (from Supabase auth) | `user-uuid-here` |

### Valid Types

- `call` - Phone call
- `email` - Email communication
- `meeting` - In-person or virtual meeting
- `note` - General note

### Sample Data

```
ID | Type | Contact ID | Deal ID | Description | Created At | User ID
550e8400... | call | 550e8400... | 550e8400... | Discussed pricing and timeline | 2024-01-15T10:30:00Z | user-uuid
```

## Setup Instructions

### 1. Create Google Sheets Template

1. Create a new Google Sheet
2. Create three sheets: `Contacts`, `Deals`, `Activities`
3. Add header rows with the column names listed above
4. Format the header row (bold, freeze row)
5. Set up data validation for:
   - **Source** (Contacts): Dropdown with valid sources
   - **Status** (Contacts): Dropdown with valid statuses
   - **Stage** (Deals): Dropdown with valid stages
   - **Probability** (Deals): Number between 0-100
   - **Type** (Activities): Dropdown with valid types

### 2. Configure Permissions

- Share the sheet with users who need access
- Ensure n8n service account has edit access (for sync workflows)

### 3. Link to n8n Workflows

- Configure n8n workflows to read from these sheets
- Set up sync frequency (recommended: every 5-15 minutes)

### 4. Data Entry Guidelines

- Always use UUID format for IDs (generate using UUID generator or formula)
- Use ISO 8601 format for timestamps: `YYYY-MM-DDTHH:mm:ssZ`
- Keep User ID consistent (from Supabase auth.users table)
- Use consistent formatting for phone numbers, emails, etc.

## Data Validation Formulas

### Contacts Sheet

**Source Column (Data Validation):**
```
List of items: website,referral,social,advertisement,other
```

**Status Column (Data Validation):**
```
List of items: lead,qualified,customer,inactive
```

### Deals Sheet

**Stage Column (Data Validation):**
```
List of items: prospecting,qualification,proposal,negotiation,closed-won,closed-lost
```

**Probability Column (Data Validation):**
```
Custom formula: =AND(ISNUMBER(B2), B2>=0, B2<=100)
```

### Activities Sheet

**Type Column (Data Validation):**
```
List of items: call,email,meeting,note
```

## Best Practices

1. **Never delete rows** - Mark as inactive or use a status field instead
2. **Use UUIDs** - Generate proper UUIDs for IDs (not sequential numbers)
3. **Timestamp consistency** - Always use ISO 8601 format
4. **Data validation** - Use dropdown lists to ensure data consistency
5. **Backup regularly** - Export sheets periodically as backup
6. **User ID consistency** - Ensure User ID matches Supabase auth.users.id

## Template Sheet

You can create a template sheet with:
- Pre-formatted headers
- Data validation rules
- Example rows
- Formulas for auto-generating timestamps

Share this template with your team for consistent data entry.
