-- Create table for storing COMA question templates
CREATE TABLE IF NOT EXISTS coma_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default COMA Template',
  questions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coma_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage COMA templates"
  ON coma_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Insert default COMA template
INSERT INTO coma_templates (name, questions, is_default)
VALUES (
  'Default COMA Template',
  '[
    "Context: Who wrote it? Who was it written to? What''s happening in the surrounding chapters or book? This step helps you avoid misinterpreting verses by placing them in their proper historical and literary setting.",
    "Observation: Look closely at what the passage says. What words or phrases stand out? Are there repeated ideas, contrasts, or commands? What is the structure or flow? This is about noticing the details before jumping to conclusions.",
    "Meaning: Ask what the passage means. What does this teach about God, humanity, or salvation? What is the author''s main message? How does this connect to the gospel? This step helps you uncover the theological and spiritual significance.",
    "Application: Apply the passage to your life. What should change in your thoughts, actions, or relationships? Is there a promise to trust or a command to obey? How can you live this out today? This is where Scripture becomes personal and transformative."
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
