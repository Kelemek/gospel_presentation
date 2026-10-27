-- Enable NASB translation now that verses have been imported
UPDATE translation_settings
SET is_enabled = true
WHERE translation_code = 'nasb';

-- Verify the change
SELECT translation_code, translation_name, is_enabled, display_order
FROM translation_settings
ORDER BY display_order;
