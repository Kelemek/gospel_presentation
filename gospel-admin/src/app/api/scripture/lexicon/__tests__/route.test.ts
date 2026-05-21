/** @jest-environment node */

import { execSync } from 'child_process'
import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'
import { clearStepBibleLexiconCache } from '@/lib/step-bible-lexicon'

const FIXTURE_ROOT = path.join(process.cwd(), 'data', 'stepbible')

describe('GET /api/scripture/lexicon', () => {
  beforeAll(() => {
    if (!fs.existsSync(path.join(FIXTURE_ROOT, 'lexicon', 'greek.json'))) {
      execSync('node scripts/import-stepbible-data.js --fixtures-only', {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    }
    clearStepBibleLexiconCache()
  })

  it('returns brief Greek lexicon', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/lexicon?strongs=G3339&detail=brief')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.strongs).toBe('G3339')
    expect(body.source).toBe('TBESG')
    expect(body.gloss).toContain('transform')
  })

  it('returns brief Hebrew lexicon', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/lexicon?strongs=H430&detail=brief')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.strongs).toBe('H430')
    expect(body.source).toBe('TBESH')
    expect(body.language).toBe('heb')
  })

  it('returns 404 for unknown Strong', async () => {
    const { GET } = await import('../route')
    const res = await GET(
      new NextRequest('http://localhost/api/scripture/lexicon?strongs=G999999')
    )
    expect(res.status).toBe(404)
  })
})
