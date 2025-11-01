-- Get COMA questions from Ephesians profile
SELECT 
  gospel_data->'gospelData'->0->'subsections'->0->'questions' as week1_questions
FROM profiles
WHERE slug = 'c4dfab29';
