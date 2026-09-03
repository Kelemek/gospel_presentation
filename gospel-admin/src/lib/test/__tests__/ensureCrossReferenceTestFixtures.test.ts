import fs from 'fs'
import { execSync } from 'child_process'
import {
  crossReferenceFixturesPresent,
  ensureCrossReferenceTestFixtures,
} from '@/lib/test/ensureCrossReferenceTestFixtures'

jest.mock('fs')
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}))

const mockFs = fs as jest.Mocked<typeof fs>
const mockExec = execSync as jest.MockedFunction<typeof execSync>

describe('ensureCrossReferenceTestFixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.mkdirSync.mockImplementation(() => undefined)
    mockFs.rmSync.mockImplementation(() => undefined)
  })

  it('skips import when ROM 8 fixture is on disk', () => {
    mockFs.existsSync.mockReturnValue(true)

    ensureCrossReferenceTestFixtures()

    expect(crossReferenceFixturesPresent()).toBe(true)
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('runs fixtures-only import when data is missing', () => {
    let present = false
    mockFs.existsSync.mockImplementation(() => present)
    mockExec.mockImplementation(() => {
      present = true
      return Buffer.from('')
    })

    ensureCrossReferenceTestFixtures()

    expect(mockExec).toHaveBeenCalledTimes(1)
    expect(mockExec).toHaveBeenCalledWith(
      'node scripts/import-cross-references.js --fixtures-only',
      expect.objectContaining({ cwd: process.cwd(), stdio: 'pipe' })
    )
  })

  it('waits for another worker instead of importing while the lock exists', () => {
    const eexist = Object.assign(new Error('EEXIST'), { code: 'EEXIST' })
    mockFs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true)
    mockFs.mkdirSync.mockImplementation((_path, opts) => {
      if (opts && typeof opts === 'object' && 'recursive' in opts) return undefined
      throw eexist
    })

    ensureCrossReferenceTestFixtures()

    expect(mockExec).not.toHaveBeenCalled()
    expect(mockFs.existsSync).toHaveBeenCalled()
  })
})
