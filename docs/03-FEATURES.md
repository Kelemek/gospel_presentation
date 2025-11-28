# Features & Functionality

Guide to core features and their implementation.

## Questions & Answers

Users can answer reflection questions added to profiles by editors:
- Questions added per subsection
- Answers stored in database (logged in) or sessionStorage (anonymous)
- Users can track answers across sessions
- Counselors can view aggregated responses

**Storage**: `user_answers` table (RLS protected)

## COMA Method

COMA = **C**ircumstances, **O**bedience, **M**otives, **A**pplication

The COMA template provides a structured framework for reflection:
- Pre-configured in `coma_templates` table
- Available to all users (RLS allows public read)
- Displayed in modal during profile usage
- Customizable by admins

**Status**: RLS policies fixed - now visible to all users including counselees

## Scripture Highlighting & Progress

Users can:
- Mark favorite scriptures
- Clear progress from highlighted verses
- Pin/unpin verses for quick access
- Track last viewed scripture

**Features**:
- Pin-click to clear progress
- Progress persisted per user/profile
- Integrated with profile navigation

## Profile Features

### Templates & Cloning
- Create reusable profile templates
- Clone templates to start new profiles
- Share templates across counselors
- Template access controlled via RLS

### Backup & Restore
- Export profiles to JSON
- Import profiles from backup
- Disaster recovery
- Data portability

### Descriptions & Metadata
- Profile descriptions support user assignments format: "For: username1, username2"
- Counselee access tracked in descriptions
- Helps with quick user identification

## Related Documentation
- Questions: [QUESTIONS_FEATURE.md](QUESTIONS_FEATURE.md)
- Answers: [ANSWERS_TO_DATABASE.md](ANSWERS_TO_DATABASE.md)
- COMA details: [COMA_RLS_FIX.md](COMA_RLS_FIX.md)
