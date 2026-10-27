-- Scripture Access Usage Reports
-- Reports on ESV, KJV, and NASB usage tracking
-- Usage: Run these queries in Supabase SQL Editor for annual reporting

-- ========================================
-- REPORT 1: Unique Sessions by Translation per Year
-- Shows how many unique sessions accessed each translation
-- ========================================
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  translation,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_scripture_views
FROM scripture_access_logs
GROUP BY year, translation
ORDER BY year DESC, translation;

-- ========================================
-- REPORT 2: NASB Usage Summary for Lockman Reporting
-- Usage statistics specifically for NASB
-- ========================================
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  COUNT(DISTINCT session_id) as unique_sessions_used_nasb,
  COUNT(*) as total_scripture_views,
  COUNT(DISTINCT scripture_reference) as unique_scriptures_viewed,
  ROUND(COUNT(*) / COUNT(DISTINCT session_id)::numeric, 2) as avg_views_per_session
FROM scripture_access_logs
WHERE translation = 'nasb'
GROUP BY year
ORDER BY year DESC;

-- ========================================
-- REPORT 3: Detailed Breakdown - All Translations
-- Complete statistics for ESV, KJV, and NASB
-- ========================================
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  translation,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_scripture_views,
  COUNT(DISTINCT scripture_reference) as unique_scriptures,
  ROUND(COUNT(*) / COUNT(DISTINCT session_id)::numeric, 2) as avg_views_per_session
FROM scripture_access_logs
GROUP BY year, translation
ORDER BY year DESC, translation;

-- ========================================
-- REPORT 4: Monthly Trend for NASB (Current Year)
-- Shows usage pattern throughout the year
-- ========================================
SELECT 
  EXTRACT(MONTH FROM timestamp) as month,
  TO_CHAR(timestamp, 'Month') as month_name,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(*) as total_requests
FROM scripture_access_logs
WHERE translation = 'nasb'
  AND EXTRACT(YEAR FROM timestamp) = EXTRACT(YEAR FROM NOW())
GROUP BY month, month_name
ORDER BY month;

-- ========================================
-- REPORT 5: Top Scriptures Accessed by Translation
-- Shows which scriptures are most frequently accessed
-- ========================================
SELECT 
  translation,
  scripture_reference,
  EXTRACT(YEAR FROM timestamp) as year,
  COUNT(*) as access_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM scripture_access_logs
WHERE translation IN ('esv', 'kjv', 'nasb')
GROUP BY translation, scripture_reference, year
HAVING COUNT(*) >= 5
ORDER BY year DESC, translation, access_count DESC
LIMIT 50;

-- ========================================
-- REPORT 6: Year-over-Year Comparison
-- Compare NASB usage growth year-to-year
-- ========================================
WITH nasb_yearly AS (
  SELECT 
    EXTRACT(YEAR FROM timestamp)::int as year,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) as total_requests
  FROM scripture_access_logs
  WHERE translation = 'nasb'
  GROUP BY year
)
SELECT 
  year,
  unique_sessions,
  total_requests,
  LAG(unique_sessions) OVER (ORDER BY year) as prev_year_sessions,
  ROUND(((unique_sessions - LAG(unique_sessions) OVER (ORDER BY year)::numeric) / 
         LAG(unique_sessions) OVER (ORDER BY year)::numeric * 100), 2) as yoy_growth_percent
FROM nasb_yearly
ORDER BY year DESC;
