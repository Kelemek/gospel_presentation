/**
 * Centralized logging utility with environment-aware behavior
 * 
 * - In production (NODE_ENV=production): only errors and warnings are logged
 * - In development/test: all levels are logged
 * - Can be controlled via DEBUG environment variable
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

class AppLogger implements Logger {
  private isProduction: boolean
  private isDebugEnabled: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.isDebugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '*'
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors unless DEBUG is enabled
    if (this.isProduction && !this.isDebugEnabled) {
      return level === 'warn' || level === 'error'
    }
    // In development/test, log everything
    return true
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...args)
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(...args)
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args)
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args)
    }
  }
}

// Export singleton instance
export const logger = new AppLogger()

// For testing: allow tests to spy on or replace the logger
export default logger
