/** True when the browser can record audio for Whisper-based Recite mode. */
export function isWhisperReciteSupported(): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) return false;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  return typeof MediaRecorder !== 'undefined';
}
