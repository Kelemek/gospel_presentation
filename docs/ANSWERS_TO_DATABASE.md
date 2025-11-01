# Answers Saved to Database - Implementation Summary

## Overview
Updated the system to save user answers to reflection questions in the database instead of localStorage. This allows answers to be persistent across devices and accessible to profile owners.

## Changes Made

### 1. Database Schema (`sql/add_saved_answers_column.sql`)
- Added `saved_answers` JSONB column to `profiles` table
- Structure: `[{ questionId: string, answer: string, answeredAt: Date }]`
- Added GIN index for efficient querying

### 2. TypeScript Types (`src/lib/types.ts`)
- Added `SavedAnswer` interface:
  ```typescript
  interface SavedAnswer {
    questionId: string
    answer: string
    answeredAt: Date
  }
  ```
- Updated `GospelProfile` to include `savedAnswers?: SavedAnswer[]`

### 3. API Endpoint (`src/app/api/profiles/[slug]/save-answer/route.ts`)
- New POST endpoint: `/api/profiles/{slug}/save-answer`
- Validates answer length (max 2000 characters)
- Updates or adds answer in profile's `savedAnswers` array
- Returns success confirmation with timestamp

### 4. UI Component Updates

#### `src/components/GospelSection.tsx`
- Updated `Questions` component to:
  - Accept `savedAnswers` prop from profile data
  - Load answers from `savedAnswers` instead of localStorage
  - Save answers via API call to `/api/profiles/{slug}/save-answer`
  - Show "✓ Saved" confirmation after successful save

#### `src/app/[slug]/page.tsx`
- Pass `savedAnswers` from profile to `ProfileContent`

#### `src/app/[slug]/ProfileContent.tsx`
- Updated `ProfileInfo` interface to include `savedAnswers`
- Pass `savedAnswers` to all `GospelSection` components

### 5. RLS Policy Updates (`sql/allow_public_all_profiles.sql`)
- Updated to allow anonymous users to:
  - **SELECT**: View all profiles (not just default)
  - **UPDATE**: Save answers and progress tracking
- Required for anonymous users to save answers to the database

## Migration Steps

### Run in Supabase SQL Editor:

1. **Add the column:**
   ```sql
   -- Run sql/add_saved_answers_column.sql
   ```

2. **Update RLS policies:**
   ```sql
   -- Run sql/allow_public_all_profiles.sql
   ```

## How It Works

1. User types an answer in the textarea
2. Clicks "Save Answer" button
3. Answer is sent to `/api/profiles/{slug}/save-answer`
4. API validates and saves to `profiles.saved_answers` JSONB array
5. Button shows "✓ Saved" confirmation
6. On page reload, answers are loaded from database

## Benefits

✅ **Persistent**: Answers saved across devices and sessions
✅ **Accessible**: Profile owners can see what users have answered
✅ **Scalable**: JSONB storage with GIN indexing for performance
✅ **Secure**: Validated on server-side with length limits
✅ **User-friendly**: Immediate save confirmation feedback

## Data Structure Example

```json
{
  "saved_answers": [
    {
      "questionId": "q-1761955220652-zzd8sb05w",
      "answer": "I believe salvation comes through faith in Jesus Christ...",
      "answeredAt": "2025-11-01T15:30:00.000Z"
    },
    {
      "questionId": "q-1761955220653-abc123xyz",
      "answer": "The gospel has changed my life by...",
      "answeredAt": "2025-11-01T15:35:00.000Z"
    }
  ]
}
```

## Notes

- Answers are associated with the **profile**, not individual users
- Anonymous users can save as many answers as they want
- Existing answers are updated when user saves again
- Character limit: 2000 characters per answer (configurable)
