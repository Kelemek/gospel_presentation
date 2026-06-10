/** Affirmations when a user completes the Daily Verse Hunt. */
export const DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES: readonly string[] = [
  'Nice find—you traced the clue to the right passage. Well done.',
  'You found it! May this verse encourage you as you go through your day.',
  'Well hunted. Searching the Scriptures and landing on the truth is always worth it.',
  'Great work—you opened the Bible reader right where the clue pointed.',
  'Excellent! You followed the reference and found the treasure.',
  'Found it! May the Lord bless you as you reflect on this passage.',
  'Good sleuthing. There’s joy in opening Scripture and finding exactly what you were looking for.',
  'Well done. Another day, another verse discovered in God’s Word.',
  'You nailed it. Keep enjoying the daily hunt through Scripture.',
  'Victory! May this passage be a lamp for your feet today.',
]

export function pickRandomDailyVerseHuntEncouragementMessage(): string {
  if (DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES.length === 0) return ''
  const i = Math.floor(Math.random() * DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES.length)
  return DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES[i] ?? DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES[0] ?? ''
}
