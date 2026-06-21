import { PAIRING_WRAP_SALT, SYNC_VALUE_INFO } from '@/lib/gospelDeviceSync/constants'

export interface EncryptedPayload {
  iv: string
  ct: string
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('Web Crypto is not available')
  }
  return globalThis.crypto.subtle
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload)
}

export function parseEncryptedPayload(serialized: string): EncryptedPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized) as unknown
  } catch {
    throw new Error('Invalid encrypted payload')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid encrypted payload')
  }
  const o = parsed as Record<string, unknown>
  if (typeof o.iv !== 'string' || typeof o.ct !== 'string') {
    throw new Error('Invalid encrypted payload')
  }
  return { iv: o.iv, ct: o.ct }
}

async function derivePairingWrapKey(code: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto()
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(code.padStart(6, '0')),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(PAIRING_WRAP_SALT),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function deriveSyncValueKey(syncKeyBase64: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto()
  const syncKeyBytes = base64ToBytes(syncKeyBase64)
  const baseKey = await subtle.importKey('raw', syncKeyBytes, 'HKDF', false, ['deriveKey'])
  return subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(SYNC_VALUE_INFO),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function generateSyncKeyBase64(): Promise<string> {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return bytesToBase64(bytes)
}

export async function deriveStorageId(syncKeyBase64: string): Promise<string> {
  const bytes = base64ToBytes(syncKeyBase64)
  const digest = await getSubtleCrypto().digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashSyncPlaintext(plaintext: string): Promise<string> {
  const digest = await getSubtleCrypto().digest('SHA-256', new TextEncoder().encode(plaintext))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function wrapSyncKeyForPairing(syncKeyBase64: string, code: string): Promise<string> {
  const key = await derivePairingWrapKey(code)
  const iv = new Uint8Array(12)
  globalThis.crypto.getRandomValues(iv)
  const ct = await getSubtleCrypto().encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(syncKeyBase64)
  )
  return serializeEncryptedPayload({
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  })
}

export async function unwrapSyncKeyFromPairing(envelope: string, code: string): Promise<string> {
  const payload = parseEncryptedPayload(envelope)
  const key = await derivePairingWrapKey(code)
  const plain = await getSubtleCrypto().decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ct)
  )
  return new TextDecoder().decode(plain)
}

export async function encryptSyncValue(plaintext: string, syncKeyBase64: string): Promise<string> {
  const key = await deriveSyncValueKey(syncKeyBase64)
  const iv = new Uint8Array(12)
  globalThis.crypto.getRandomValues(iv)
  const ct = await getSubtleCrypto().encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  return serializeEncryptedPayload({
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  })
}

export async function decryptSyncValue(ciphertext: string, syncKeyBase64: string): Promise<string> {
  const payload = parseEncryptedPayload(ciphertext)
  const key = await deriveSyncValueKey(syncKeyBase64)
  const plain = await getSubtleCrypto().decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ct)
  )
  return new TextDecoder().decode(plain)
}
