// Structured logging utility for production debugging
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogContext {
  correlationId?: string
  userId?: string
  documentId?: string
  nodeId?: string
  operation?: string
  duration?: number
  error?: any
  metadata?: Record<string, any>
}

class Logger {
  private serviceName: string
  private isProduction: boolean

  constructor(serviceName: string) {
    this.serviceName = serviceName
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const log = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context,
      // Add environment info for Vercel
      environment: {
        region: process.env.VERCEL_REGION || 'unknown',
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local',
        gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      }
    }

    // In production, use structured JSON logging
    if (this.isProduction) {
      return JSON.stringify(log)
    }

    // In development, use readable format
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] [${this.serviceName}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext) {
    if (!this.isProduction) {
      console.log(this.formatLog('DEBUG', message, context))
    }
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context))
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatLog('ERROR', message, context))
  }

  // Helper to measure operation duration
  startTimer(): () => number {
    const start = Date.now()
    return () => Date.now() - start
  }

  // Helper to generate correlation ID
  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Helper to extract correlation ID from headers (for server components only)
  static getCorrelationIdFromHeaders(headersList: Headers): string {
    return headersList.get('x-correlation-id') || Logger.generateCorrelationId()
  }

  // Helper to log memory usage
  logMemoryUsage(operation: string) {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      this.info(`Memory usage for ${operation}`, {
        operation,
        metadata: {
          heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        }
      })
    }
  }

  // Helper for API response logging
  logApiResponse(endpoint: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'
    this[level.toLowerCase() as 'info' | 'warn' | 'error'](
      `API Response: ${endpoint}`,
      {
        ...context,
        operation: endpoint,
        duration,
        metadata: {
          ...context?.metadata,
          statusCode: status,
        }
      }
    )
  }
}

// Export pre-configured loggers for different services
export const uploadLogger = new Logger('upload')
export const analyzeLogger = new Logger('analyze')
export const quizLogger = new Logger('quiz')
export const assessmentLogger = new Logger('assessment')
export const geminiLogger = new Logger('gemini')
export const supabaseLogger = new Logger('supabase')

// Export the Logger class for custom loggers
export default Logger