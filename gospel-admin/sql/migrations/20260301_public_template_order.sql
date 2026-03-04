-- Add public_template_order to admin_settings for Resources dropdown display order
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS public_template_order JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN admin_settings.public_template_order IS 'Order of public template slugs for the Resources dropdown; empty means use default (title) order.';
