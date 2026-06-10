/** Short affirmations after completing rounds 1–4 (before the final round). */
export const MEMORIZATION_ROUND_AFFIRMATIONS: readonly string[] = [
  'Good work—you’re storing God’s Word where it can shape you. Keep going.',
  'Each round tucks this truth deeper in your heart. Stay with it.',
  'You’re learning to hide Scripture in your heart, not just on the screen. Press on.',
  'Faithful practice like this is how God’s Word takes root. Next step when you’re ready.',
  'Well done. Treasuring His Word in your heart is never wasted. Keep going.',
  'That round is another deposit of truth in your memory and your heart. Continue.',
  'Strong effort. God blesses the slow work of hiding His Word within you. Keep at it.',
  'You’re not just reciting—you’re letting His Word live in you. Stay encouraged.',
  'Beautiful. Scripture hidden in the heart is light for the path ahead. Onward.',
  'Nice round. Ask the Lord to bless what you’re planting in your heart, and keep going.',
]

/** Congratulations when all five rounds are finished. */
export const MEMORIZATION_ALL_DONE_MESSAGES: readonly string[] = [
  'Wonderful, keep treasuring God’s Word.',
  'All five rounds complete. You’ve labored to hide His Word in your heart; may it bear fruit.',
  'Finished! What you’ve stored in your heart is richer than anything on a screen. Well done.',
  'Congratulations. You stayed the course—may this passage dwell in you richly from here on.',
  'Amen. You’ve given real attention to hiding Scripture in your heart. Keep building on it.',
  'You did it. God’s Word is a gift—now carried a little deeper in your heart. Praise Him.',
  'Complete! Perseverance in memorization is love for the Lord and His truth. Keep going in grace.',
]

/** Round affirmations + all-done messages (memorize games and Daily Verse Hunt wins). */
export const MEMORIZATION_ENCOURAGEMENT_MESSAGES: readonly string[] = [
  ...MEMORIZATION_ROUND_AFFIRMATIONS,
  ...MEMORIZATION_ALL_DONE_MESSAGES,
]

function pickRandomFrom(messages: readonly string[]): string {
  if (messages.length === 0) return ''
  const i = Math.floor(Math.random() * messages.length)
  return messages[i] ?? messages[0] ?? ''
}

export function pickRandomRoundAffirmation(): string {
  return pickRandomFrom(MEMORIZATION_ROUND_AFFIRMATIONS)
}

export function pickRandomAllDoneMessage(): string {
  return pickRandomFrom(MEMORIZATION_ALL_DONE_MESSAGES)
}

export function pickRandomEncouragementMessage(): string {
  return pickRandomFrom(MEMORIZATION_ENCOURAGEMENT_MESSAGES)
}
