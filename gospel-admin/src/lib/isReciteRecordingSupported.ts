export function isReciteRecordingSupported(): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) return false;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  return typeof MediaRecorder !== 'undefined';
}
