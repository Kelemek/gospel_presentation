import { webcrypto } from 'node:crypto'
import { TextDecoder, TextEncoder } from 'node:util'
import {
  decryptSyncValue,
  deriveStorageId,
  encryptSyncValue,
  generateSyncKeyBase64,
  hashSyncPlaintext,
  unwrapSyncKeyFromPairing,
  wrapSyncKeyForPairing,
} from '@/lib/gospelDeviceSync/crypto'

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder,
    configurable: true,
  })
})

describe('gospelDeviceSync crypto', () => {
  it('derives a stable storage id from sync key', async () => {
    const syncKey = await generateSyncKeyBase64()
    const a = await deriveStorageId(syncKey)
    const b = await deriveStorageId(syncKey)
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('encrypts and decrypts sync values', async () => {
    const syncKey = await generateSyncKeyBase64()
    const plaintext = '{"bookmarks":[]}'
    const ciphertext = await encryptSyncValue(plaintext, syncKey)
    const roundTrip = await decryptSyncValue(ciphertext, syncKey)
    expect(roundTrip).toBe(plaintext)
  })

  it('hashes plaintext for content comparison', async () => {
    const hash = await hashSyncPlaintext('hello')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('wraps and unwraps sync key with pairing code', async () => {
    const syncKey = await generateSyncKeyBase64()
    const code = '482913'
    const envelope = await wrapSyncKeyForPairing(syncKey, code)
    const unwrapped = await unwrapSyncKeyFromPairing(envelope, code)
    expect(unwrapped).toBe(syncKey)
  })

  it('fails unwrap with wrong pairing code', async () => {
    const syncKey = await generateSyncKeyBase64()
    const envelope = await wrapSyncKeyForPairing(syncKey, '111111')
    await expect(unwrapSyncKeyFromPairing(envelope, '222222')).rejects.toThrow()
  })
})
