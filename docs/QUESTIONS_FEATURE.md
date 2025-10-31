# Questions & Answers Feature

## Overview
This feature allows editors to add reflection questions to each subsection of their gospel presentation profiles, and allows users (authenticated or unauthenticated) to answer those questions and save their responses locally.

## Feature Components

### 1. Data Model
- **Location**: `gospel-admin/src/lib/types.ts`
- **Interface**: `QuestionAnswer`
  ```typescript
  interface QuestionAnswer {
    id: string              // Unique identifier
    question: string        // The question text (max 500 chars)
    answer?: string         // Optional answer (for reference only)
    maxLength?: number      // Custom max length for answer (default 2000)
    createdAt?: Date        // When question was created
    answeredAt?: Date       // When last answered
  }
  ```
- Added `questions?: QuestionAnswer[]` to both `Subsection` and `NestedSubsection` interfaces
- Validation constants:
  - `QUESTION_MAX_LENGTH`: 500 characters
  - `ANSWER_MAX_LENGTH`: 2000 characters

### 2. Content Editor UI
- **Location**: `gospel-admin/src/app/admin/profiles/[slug]/content/page.tsx`
- **Features**:
  - "Add Question" button for each subsection and nested subsection
  - Question input with character counter (500 max)
  - Edit and delete buttons for each question
  - Questions appear after scripture references section
  - Consistent slate-themed design matching other UI elements
  - Helper text showing max answer length for users

### 3. Profile Display
- **Location**: `gospel-admin/src/components/GospelSection.tsx`
- **Features**:
  - Questions displayed after scripture cards in each subsection
  - "Reflection Questions" heading
  - Each question numbered and displayed with clear formatting
  - Answer textarea for user responses
  - Character counter showing current/max characters
  - "Save Answer" button that stores to localStorage
  - Green "✓ Saved" confirmation (3-second display)
  - Works for both authenticated and unauthenticated users

### 4. Answer Storage
- **Storage**: Browser localStorage (client-side only)
- **Key Format**: `gospel-answer-{profileSlug}-{questionId}`
- **Rationale**: 
  - Allows unauthenticated users to save answers
  - User-specific data doesn't need server storage
  - Answers persist across page loads
  - Answers are profile-specific
  - No database bloat from user answers

### 5. API Validation
- **Location**: `gospel-admin/src/app/api/profiles/[slug]/answer/route.ts`
- **Purpose**: Validate answer length before saving
- **Method**: POST
- **Validates**: Answer length against configured max length
- **Note**: Currently validation happens client-side; API endpoint prepared for future enhancements

## User Flows

### Editor Flow
1. Navigate to content editor for a profile
2. Scroll to any subsection or nested subsection
3. Click "Add Question" button
4. Type question text (max 500 characters)
5. Click "Add Question" to save
6. Question appears in list with edit/delete options
7. Edit: Click ✏️, modify text, save or cancel
8. Delete: Click × to remove question
9. Save profile to persist questions

### User Flow
1. View a profile page
2. See "Reflection Questions" section under scripture cards
3. Read each question
4. Type answer in textarea (character counter shows progress)
5. Click "Save Answer" when done
6. See green "✓ Saved" confirmation
7. Answers persist in browser localStorage
8. Return anytime to review/edit saved answers

## Integration with Existing Features

### Backup & Restore
- ✅ Questions automatically included in profile backups
- ✅ Questions restored when profile is restored
- ✅ Works with existing backup/restore system
- **Note**: User answers (localStorage) are NOT included in backups (by design - they're user-specific, not profile content)

### Data Structure
- Questions are part of `gospelData` JSON structure
- Stored in database as part of profile
- No additional database tables needed
- Backward compatible (questions are optional)

## Technical Details

### Character Limits
- Questions: 500 characters (suitable for question text)
- Answers: 2000 characters (allows detailed responses without DB bloat)
- Both limits configurable via `PROFILE_VALIDATION` constant

### Performance
- No impact on page load (questions part of existing data fetch)
- localStorage writes are asynchronous
- No server calls needed for saving answers
- Minimal bundle size increase

### Browser Compatibility
- Uses standard localStorage API
- Supported in all modern browsers
- Graceful degradation if localStorage unavailable

## Future Enhancements

Potential improvements (not currently implemented):
1. Export user answers to PDF/JSON
2. Share answers (optional server storage)
3. Answer statistics/analytics for editors
4. Multiple choice question types
5. Required vs optional questions
6. Answer templates or prompts
7. Print-friendly answer format

## Testing Checklist

- [ ] Add question in content editor
- [ ] Edit existing question
- [ ] Delete question
- [ ] Questions appear on profile page
- [ ] Answer textarea works
- [ ] Character counter updates
- [ ] Save button stores to localStorage
- [ ] Saved confirmation appears
- [ ] Answers persist after page reload
- [ ] Questions included in profile backup
- [ ] Questions restored from backup
- [ ] Works in nested subsections
- [ ] Character limit validation works
- [ ] Unauthenticated users can save answers

## Files Modified

1. `gospel-admin/src/lib/types.ts` - Type definitions
2. `gospel-admin/src/app/api/profiles/[slug]/answer/route.ts` - API endpoint (new)
3. `gospel-admin/src/app/admin/profiles/[slug]/content/page.tsx` - Editor UI
4. `gospel-admin/src/components/GospelSection.tsx` - Display component
5. `gospel-admin/src/app/[slug]/ProfileContent.tsx` - Pass profileSlug prop

## Git Commits

1. Initial foundation (types, API, state management)
2. Content editor UI
3. Profile display and answer functionality

## Support

For issues or questions about this feature, refer to:
- Type definitions in `types.ts` for data structure
- `QUESTIONS_FEATURE.md` for feature documentation
- Backup system docs in `BACKUP_SYSTEM.md`
