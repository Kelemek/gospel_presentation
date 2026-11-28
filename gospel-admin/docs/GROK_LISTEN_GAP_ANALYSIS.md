# Grok Listen gap analysis (measured)

Evidence gathered in-repo via `grokListenGapAnalysis.test.ts` and pipeline code review. Production symptoms: short pauses between **lines** while using Grok Listen.

## Chunk granularity (client split)

| Scenario | Raw `\n` segments | Grok chunks (after fix) | Chunks (legacy: per segment) |
| --- | ---: | ---: | ---: |
| 8 short paragraph lines (~32 chars each) | 8 | **1** | 8 |
| 8 same sentences joined with spaces | 1 | 1 | 1 |
| 40 × 12-word sentences (~8k chars) | 1 | ~7 (800–1200 char packs) | varies |

**Root cause (line-level pauses):** `splitListenRawIntoGrokChunksWithOffsets` previously ran the 800–1200 char packer **inside each newline segment**. Profile listen raw text inserts `\n` at every block (`<p>`, list item, etc.), so most body copy produced **one xAI clip per line**. Each clip chained through `HTMLAudioElement` → audible gap even when intentional inter-chunk delay was already **0 ms** for Grok.

**Fix:** Pack from **collapsed plain** text (`listenCollapsedPlainFromRaw`), same coordinate space as read-along indices.

### Intentional inter-chunk delay

| Mode | Sentence gap | Segment gap | Grok override |
| --- | ---: | ---: | --- |
| Device Web Speech | 55 ms | 95 ms | — |
| Grok | 0 ms | 0 ms | `{ grok: true }` in `computeProfileListenInterChunkGapMs` |

## Fetch / playback pipeline (per chunk)

| Stage | Where | Notes |
| --- | --- | --- |
| Text split | `grokListenChunks.ts` | 800–1200 chars; collapsed plain |
| POST | `/api/read-aloud/tts` | Device token + rate limits (IP + device buckets) |
| Upstream | `https://api.x.ai/v1/tts` | JSON + base64 audio; optional `audio_timestamps` |
| Client decode | `fetchGrokTtsChunk` | base64 → blob URL; warm `Audio` (`preload=auto`) |
| Prefetch | `GROK_LISTEN_PREFETCH_AHEAD = 2` | Bootstrap current +2 on start; ahead +2 each chunk |
| Play | `GrokResourceListenPlayer` | Reuse warmed element when `isChunkReady` |

Estimated handoff when prefetch hit (not a live prod trace): **~25 ms** element swap; **~45 ms** extra if next chunk not warmed; **~120 ms** fetch wait added to handoff in the offline model when starved.

## TTS file padding (trailing silence)

xAI returns MPEG audio longer than the last `graph_times` end. Fixture model in tests uses **~350 ms** trailing silence per clip (aligned with reports of ~200–400 ms).

| Measurement | Method |
| --- | --- |
| Speech end | Last `graph_times[i][1]` via `grokSpeechEndSecFromTracks` |
| File duration | `mp3DurationSeconds` on decoded bytes |
| Trailing ms | `(fileDuration − speechEnd) × 1000` |

**Fix:** Resource Listen always requests timestamps (`GROK_LISTEN_WITH_TIMESTAMPS`). Playback stops at `speechEndSec + 20 ms` on `timeupdate`. Times also feed line-change scroll. No underline is drawn.

## HTML Audio vs Web Audio (iOS)

Current Grok path uses sequential `HTMLAudioElement` (`play()` after `onended`). Lab constants document typical iOS Safari start latency (~45 ms). **Web Audio** `AudioBufferSourceNode.start(when)` scheduled back-to-back would remove element handoff but requires decode + scheduling; not shipped in this change because chunk packing + tail trim address the reported line gaps first.

## Read-along scroll (packed chunks)

Larger Grok chunks mean many spoken lines advance inside one audio clip. The previous **comfort-band** scroll (`scrollReadAlongPlainOffsetIntoViewIfNeeded`) did not move the page until the caret left the band, so the active line could sit low on screen through most of a chunk. Resource Listen now uses **`scrollReadAlongPlainOffsetToVerticalCenter`** (50% viewport, instant jump) on each read-along UI update so the spoken line stays near vertical center.

## Related tests

- `src/lib/__tests__/grokListenGapAnalysis.test.ts` — granularity, padding model, PCM fixture
- `src/lib/__tests__/grokListenChunks.test.ts` — packed newline blocks
- `src/lib/__tests__/grokResourceListenPlayer.test.ts` — prefetch / warm replay