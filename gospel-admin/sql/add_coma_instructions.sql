-- Add instructions field to coma_templates table
ALTER TABLE coma_templates 
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Update the default template with instructions
UPDATE coma_templates
SET instructions = '
<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold mb-4">COMA Method — A Practical Guide for Daily Bible Study</h1>
  </div>

  <div class="space-y-4">
    <h2 class="text-2xl font-semibold text-blue-700 mt-6">1. Context — Set the scene</h2>
    <p class="text-gray-700">Before reading, ask:</p>
    <ul class="list-disc pl-6 space-y-2 text-gray-700">
      <li>Who wrote this passage?</li>
      <li>Who was the original audience?</li>
      <li>What''s happening in the surrounding verses or chapters?</li>
      <li>What kind of writing is this (letter, poem, story, prophecy)?</li>
    </ul>
    <p class="bg-blue-50 border-l-4 border-blue-500 p-3 my-3">
      <strong class="text-blue-800">Tip:</strong> 
      <span class="text-gray-700">Use a study Bible or intro notes to get a quick overview. This helps you avoid misreading isolated verses.</span>
    </p>
  </div>

  <div class="space-y-4">
    <h2 class="text-2xl font-semibold text-blue-700 mt-6">2. Observation — Slow down and notice</h2>
    <p class="text-gray-700">As you read the passage:</p>
    <ul class="list-disc pl-6 space-y-2 text-gray-700">
      <li>Highlight repeated words or phrases.</li>
      <li>Look for contrasts (e.g., light vs darkness, old vs new).</li>
      <li>Identify commands, promises, or warnings.</li>
      <li>Pay attention to tone—joyful, urgent, sorrowful?</li>
    </ul>
    <p class="bg-blue-50 border-l-4 border-blue-500 p-3 my-3">
      <strong class="text-blue-800">Tip:</strong> 
      <span class="text-gray-700">Write down anything that stands out or surprises you. Don''t rush—this step builds your foundation.</span>
    </p>
  </div>

  <div class="space-y-4">
    <h2 class="text-2xl font-semibold text-blue-700 mt-6">3. Meaning — Ask what it teaches</h2>
    <p class="text-gray-700">After observing, reflect:</p>
    <ul class="list-disc pl-6 space-y-2 text-gray-700">
      <li>What is the main message of this passage?</li>
      <li>How does it fit into the bigger story of the Bible?</li>
      <li>What does it reveal about God''s character?</li>
      <li>Are there any difficult words or cultural details to research?</li>
    </ul>
    <p class="bg-blue-50 border-l-4 border-blue-500 p-3 my-3">
      <strong class="text-blue-800">Tip:</strong> 
      <span class="text-gray-700">Cross-reference related verses or consult a commentary if you''re stuck.</span>
    </p>
  </div>

  <div class="space-y-4">
    <h2 class="text-2xl font-semibold text-blue-700 mt-6">4. Application — Make it personal</h2>
    <p class="text-gray-700">Finally, ask yourself:</p>
    <ul class="list-disc pl-6 space-y-2 text-gray-700">
      <li>How does this passage challenge or encourage me today?</li>
      <li>Is there a sin to confess, a promise to trust, or a command to obey?</li>
      <li>What specific action can I take this week in response?</li>
    </ul>
    <p class="bg-blue-50 border-l-4 border-blue-500 p-3 my-3">
      <strong class="text-blue-800">Tip:</strong> 
      <span class="text-gray-700">Write out one concrete step. Application without action is just information.</span>
    </p>
  </div>

  <div class="space-y-4">
    <h2 class="text-2xl font-semibold text-blue-700 mt-6">Daily Flow Example</h2>
    <ol class="list-decimal pl-6 space-y-2 text-gray-700">
      <li>Pray for insight.</li>
      <li>Read the passage slowly (maybe twice).</li>
      <li>Work through C.O.M.A. with pen and paper.</li>
      <li>Close in prayer, asking God to help you live it out.</li>
    </ol>
  </div>
</div>
'
WHERE is_default = true;
