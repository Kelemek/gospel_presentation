import { jest } from '@jest/globals'

describe('logger', () => {
  let origEnv: any
  let origLog: any
  let origWarn: any
  let origError: any

  beforeEach(() => {
    jest.resetModules()
    origEnv = { ...process.env }
    origLog = console.log
    origWarn = console.warn
    origError = console.error
  })

  afterEach(() => {
    process.env = origEnv
    console.log = origLog
    console.warn = origWarn
    console.error = origError
  })

  test('logs all levels in development/test', () => {
  ;(process.env as any).NODE_ENV = 'test'
    const logs: any[] = []
    const warns: any[] = []
    const errs: any[] = []
    console.log = (...args: any[]) => logs.push(args)
    console.warn = (...args: any[]) => warns.push(args)
    console.error = (...args: any[]) => errs.push(args)

    const { logger } = require('../logger')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(logs.length).toBeGreaterThanOrEqual(2) // debug + info
    expect(warns.length).toBe(1)
    expect(errs.length).toBe(1)
  })

  test('in production without DEBUG only warn/error are logged', () => {
  ;(process.env as any).NODE_ENV = 'production'
  delete (process.env as any).DEBUG

    const logs: any[] = []
    const warns: any[] = []
    const errs: any[] = []
    console.log = (...args: any[]) => logs.push(args)
    console.warn = (...args: any[]) => warns.push(args)
    console.error = (...args: any[]) => errs.push(args)

    const { logger } = require('../logger')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(logs.length).toBe(0)
    expect(warns.length).toBe(1)
    expect(errs.length).toBe(1)
  })

  test('DEBUG enables debug in production', () => {
  ;(process.env as any).NODE_ENV = 'production'
  ;(process.env as any).DEBUG = 'true'

    const logs: any[] = []
    console.log = (...args: any[]) => logs.push(args)
    const { logger } = require('../logger')
    logger.debug('d')
    logger.info('i')
    expect(logs.length).toBeGreaterThanOrEqual(2)
  })
})
