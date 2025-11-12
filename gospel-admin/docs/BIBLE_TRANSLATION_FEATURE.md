# Bible Translation Feature Setup

This feature adds support for multiple Bible translations (ESV and NASB) with user preferences saved to the database for logged-in users or sessionStorage for anonymous users.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# ESV API (existing)
ESV_API_TOKEN=your_esv_api_token_here

# Digital Bible Library API (new - required for NASB and other translations)
DBL_API_KEY=your_dbl_api_key_here
DBL_API_SECRET=your_dbl_api_secret_here
```

### Getting Digital Bible Library (DBL) API Credentials

**Important**: The DBL API requires an organizational account and proper licensing for copyrighted Bible translations.

1. Create an organizational account at [Digital Bible Library](https://thedigitalbiblelibrary.org/)
   - Individual accounts cannot access the API
   - Follow the organization signup process
2. Apply for licenses for the Bible translations you want to use (e.g., NASB)
   - Review the [licensing documentation](https://thedigitalbiblelibrary.org/get-involved/apply-ipc/)
   - NASB and other copyrighted translations require proper licenses
3. Once approved, obtain your API credentials:
   - `DBL_API_KEY` - Your organization's API key
   - `DBL_API_SECRET` - Your organization's API secret
4. Add both credentials to your `.env.local` file

**Note**: The DBL API uses Basic Authentication with both key and secret.

## Database Migration

Run the following SQL migrations in your Supabase SQL editor:

### 1. Add preferred_translation column

```sql
-- File: sql/add_preferred_translation.sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_translation VARCHAR(10) DEFAULT 'esv';

ALTER TABLE user_profiles 
ADD CONSTRAINT valid_translation CHECK (preferred_translation IN ('esv', 'nasb'));

COMMENT ON COLUMN user_profiles.preferred_translation IS 'User''s preferred Bible translation for scripture references';
```

### 2. Create update function (optional, for future use)

```sql
-- File: sql/update_user_translation_function.sql
CREATE OR REPLACE FUNCTION update_user_translation(user_id UUID, new_translation VARCHAR(10))
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles 
  SET preferred_translation = new_translation 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_translation TO authenticated;
```

## Features

### For Logged-In Users
- Translation preference is saved to the `user_profiles.preferred_translation` column
- Preference persists across sessions and devices
- Automatically loads on login

### For Anonymous Users
- Translation preference is saved to `sessionStorage` with key `gospel-preferred-translation`
- Preference persists only for the current browser session
- Defaults to ESV

### User Interface
- Dropdown selector appears below the Print button in the Table of Contents
- Options: ESV (English Standard Version) and NASB (New American Standard Bible)
- Selection immediately updates all scripture hover modals

## Implementation Details

### New Files
- `src/lib/bible-api.ts` - Service layer for fetching scripture from both ESV and NASB APIs
- `src/contexts/TranslationContext.tsx` - React context for sharing translation preference
- `src/app/api/user/translation/route.ts` - API endpoint for updating user preferences
- `sql/add_preferred_translation.sql` - Database migration
- `sql/update_user_translation_function.sql` - SQL function for updates

### Modified Files
- `src/app/api/scripture/route.ts` - Updated to accept `translation` query parameter
- `src/components/ScriptureHoverModal.tsx` - Uses translation context to fetch correct version
- `src/components/TableOfContents.tsx` - Added translation dropdown selector
- `src/app/layout.tsx` - Wrapped app in TranslationProvider
- `src/lib/supabase/database.types.ts` - Added `preferred_translation` to type definitions

## Testing

### Manual Testing Checklist

1. **Anonymous User**
   - [ ] Visit site without logging in
   - [ ] Change translation to NASB
   - [ ] Hover over scripture reference to verify NASB text appears
   - [ ] Refresh page - should default back to ESV
   - [ ] Change to NASB again
   - [ ] Hover over scripture - should show NASB
   
2. **Logged-In User**
   - [ ] Log in to the application
   - [ ] Change translation to NASB
   - [ ] Hover over scripture reference to verify NASB text appears
   - [ ] Refresh page - should remain NASB
   - [ ] Log out and log back in - should remain NASB
   - [ ] Change back to ESV and verify it persists

3. **Error Handling**
   - [ ] Test with invalid scripture reference
   - [ ] Test with network error (disable API temporarily)
   - [ ] Verify graceful error messages

## API Details

### ESV API
- Endpoint: `https://api.esv.org/v3/passage/text/`
- Authentication: Token-based (ESV_API_TOKEN)
- Includes verse numbers, excludes headings and footnotes

### Digital Bible Library (DBL) API
- Endpoint: `https://api.library.bible/api/bibles/{bibleId}/passages`
- Authentication: Basic Auth with API key and secret
- Bible ID for NASB2020: `de4e12af7f28f599-02`
- Requires organizational account and translation licenses
- Supports multiple licensed translations beyond NASB

## Troubleshooting

### Types Error After Migration
If you see TypeScript errors about `preferred_translation`, you may need to regenerate Supabase types:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/database.types.ts
```

Or manually update the types in `src/lib/supabase/database.types.ts` to include `preferred_translation: string | null` in the `user_profiles` Row, Insert, and Update types.

### NASB Not Loading
- Verify both `DBL_API_KEY` and `DBL_API_SECRET` are set in `.env.local`
- Check browser console for API errors
- Verify you have an active DBL organizational account
- Confirm you have a valid license for NASB distribution
- Check that the Bible ID `de4e12af7f28f599-02` is correct for your DBL account
- Review DBL API response format - may need to adjust parsing in `bible-api.ts`

### Preference Not Saving
- For logged-in users: Check Supabase database to verify column exists
- For anonymous users: Check browser's sessionStorage in DevTools
- Verify `/api/user/translation` endpoint is accessible (check Network tab)

## Future Enhancements

### Adding More Bible Translations

To add additional translations from the Digital Bible Library:

1. **Obtain License**: Apply for and receive a license for the translation through your DBL organizational account

2. **Get Bible ID**: Find the Bible ID for the translation in your DBL account (e.g., `abc123def456-01`)

3. **Update Type Definition**: Add the new translation to the type in `src/lib/bible-api.ts`:
   ```typescript
   export type BibleTranslation = 'esv' | 'nasb' | 'niv' | 'nkjv'  // Add your translation
   ```

4. **Add Bible ID Mapping**: Add the Bible ID to the `DBL_BIBLE_IDS` mapping:
   ```typescript
   const DBL_BIBLE_IDS: Record<string, string> = {
     'nasb': 'de4e12af7f28f599-02',
     'niv': 'your-niv-bible-id',     // Add your translation
     'nkjv': 'your-nkjv-bible-id',   // Add your translation
   }
   ```

5. **Add to Dropdown**: Add the option to the dropdown in `src/components/TableOfContents.tsx`:
   ```tsx
   <option value="niv">NIV (New International Version)</option>
   <option value="nkjv">NKJV (New King James Version)</option>
   ```

6. **Update Database Constraint**: Update the SQL constraint in `sql/add_preferred_translation.sql`:
   ```sql
   ALTER TABLE user_profiles 
   ADD CONSTRAINT valid_translation CHECK (preferred_translation IN ('esv', 'nasb', 'niv', 'nkjv'));
   ```

7. **Test**: Test the new translation to ensure scripture fetches correctly

### Other Potential Additions
- Add translation abbreviation to scripture hover modal
- Remember last-used translation in URL parameter for sharing
- Add translation switcher directly in scripture modal
- Support for parallel translation view
