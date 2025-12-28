/**
 * Utility functions for AI Agent
 * 
 * Includes retry mechanisms, error recovery, performance monitoring, and helper functions
 */

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition?: (error: any) => boolean
}

/**
 * Default retry configuration for different operation types
 */
export const DEFAULT_RETRY_OPTIONS: Record<string, RetryOptions> = {
  aiApiCall: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      // Retry on rate limits, timeouts, and temporary failures
      const retryableErrors = [
        'rate_limit_exceeded',
        'timeout',
        'service_unavailable',
        'network_error',
        'temporary_failure'
      ]
      return retryableErrors.some(errorType => 
        error.message?.toLowerCase().includes(errorType) ||
        error.code?.toLowerCase().includes(errorType)
      )
    }
  },
  databaseOperation: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error: any) => {
      // Retry on connection issues and temporary database errors
      const retryableErrors = [
        'connection',
        'timeout',
        'temporary',
        'lock'
      ]
      return retryableErrors.some(errorType => 
        error.message?.toLowerCase().includes(errorType)
      )
    }
  },
  fileOperation: {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    retryCondition: (error: any) => {
      // Retry on network and temporary file system errors
      const retryableErrors = [
        'network',
        'timeout',
        'temporary',
        'connection'
      ]
      return retryableErrors.some(errorType => 
        error.message?.toLowerCase().includes(errorType)
      )
    }
  }
}

/**
 * Exponential backoff retry function with jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS.aiApiCall,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      console.log(`🔄 [RETRY] Attempting ${operationName} (${attempt + 1}/${options.maxRetries + 1})`)
      
      const result = await operation()
      
      if (attempt > 0) {
        console.log(`✅ [RETRY] ${operationName} succeeded after ${attempt} retries`)
      }
      
      return result
    } catch (error) {
      lastError = error
      
      // Don't retry if this is the last attempt
      if (attempt === options.maxRetries) {
        break
      }
      
      // Check if this error should be retried
      if (options.retryCondition && !options.retryCondition(error)) {
        console.log(`❌ [RETRY] ${operationName} failed with non-retryable error:`, (error as Error).message)
        throw error
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt), 
        options.maxDelay
      )
      const jitter = Math.random() * 0.3 * baseDelay // Add up to 30% jitter
      const delay = baseDelay + jitter
      
      console.log(`⏳ [RETRY] ${operationName} failed (attempt ${attempt + 1}), retrying in ${Math.round(delay)}ms:`, (error as Error).message)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  console.error(`❌ [RETRY] ${operationName} failed after ${options.maxRetries + 1} attempts:`, lastError)
  throw lastError
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 30000, // 30 seconds
    private monitoringPeriod: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>, operationName: string = 'operation'): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
        console.log(`🔄 [CIRCUIT-BREAKER] ${operationName} - Moving to half-open state`)
      } else {
        throw new Error(`Circuit breaker is open for ${operationName}. Failing fast.`)
      }
    }
    
    try {
      const result = await operation()
      
      if (this.state === 'half-open') {
        this.reset()
        console.log(`✅ [CIRCUIT-BREAKER] ${operationName} - Circuit breaker reset to closed`)
      }
      
      return result
    } catch (error) {
      this.recordFailure()
      
      if (this.failures >= this.threshold) {
        this.state = 'open'
        this.lastFailureTime = Date.now()
        console.error(`🚨 [CIRCUIT-BREAKER] ${operationName} - Circuit breaker opened due to ${this.failures} failures`)
      }
      
      throw error
    }
  }
  
  private recordFailure(): void {
    this.failures++
    
    // Reset failure count if enough time has passed
    if (Date.now() - this.lastFailureTime > this.monitoringPeriod) {
      this.failures = 1
    }
    
    this.lastFailureTime = Date.now()
  }
  
  private reset(): void {
    this.failures = 0
    this.state = 'closed'
    this.lastFailureTime = 0
  }
  
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

/**
 * Global circuit breakers for different services
 */
export const circuitBreakers = {
  claude: new CircuitBreaker(3, 30000, 60000),
  openai: new CircuitBreaker(3, 30000, 60000),
  database: new CircuitBreaker(5, 15000, 30000),
  fileOperations: new CircuitBreaker(3, 20000, 45000)
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private readonly maxMetrics = 100 // Keep last 100 measurements
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only recent measurements
    if (values.length > this.maxMetrics) {
      values.shift()
    }
  }
  
  getStats(name: string): { count: number, avg: number, min: number, max: number, p95: number } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) {
      return null
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    const count = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index] || max
    
    return { count, avg, min, max, p95 }
  }
  
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [name, _] of this.metrics) {
      stats[name] = this.getStats(name)
    }
    
    return stats
  }
  
  reset(): void {
    this.metrics.clear()
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Timeout wrapper with cancellation
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })
  
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    // Clean up timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  
  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private refillInterval: number = 1000 // ms
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }
  
  async waitForToken(): Promise<void> {
    this.refill()
    
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    
    // Calculate wait time
    const tokensNeeded = 1 - this.tokens
    const timeToWait = (tokensNeeded / this.refillRate) * 1000
    
    console.log(`⏳ [RATE-LIMITER] Waiting ${Math.round(timeToWait)}ms for rate limit`)
    
    await new Promise(resolve => setTimeout(resolve, timeToWait))
    
    this.refill()
    this.tokens -= 1
  }
  
  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    
    if (timePassed >= this.refillInterval) {
      const tokensToAdd = (timePassed / 1000) * this.refillRate
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }
  
  getStatus(): { tokens: number, maxTokens: number } {
    this.refill()
    return { tokens: this.tokens, maxTokens: this.maxTokens }
  }
}

/**
 * Rate limiters for different APIs
 */
export const rateLimiters = {
  claude: new RateLimiter(10, 1), // 10 tokens, 1 per second
  openai: new RateLimiter(20, 2), // 20 tokens, 2 per second
  database: new RateLimiter(50, 10) // 50 tokens, 10 per second
}

/**
 * Error classification and handling
 */
export interface ErrorContext {
  operation: string
  component: string
  userId?: string
  transcriptId?: string
  additionalData?: any
}

export class AIAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: ErrorContext,
    public originalError?: any,
    public recoverable: boolean = true
  ) {
    super(message)
    this.name = 'AIAgentError'
  }
}

export function classifyError(error: any, context: ErrorContext): AIAgentError {
  // API-specific error classification
  if (error.message?.includes('rate_limit_exceeded') || error.status === 429) {
    return new AIAgentError(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      context,
      error,
      true
    )
  }
  
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return new AIAgentError(
      'Operation timed out',
      'TIMEOUT',
      context,
      error,
      true
    )
  }
  
  if (error.message?.includes('insufficient_quota') || error.status === 402) {
    return new AIAgentError(
      'Insufficient API quota',
      'INSUFFICIENT_QUOTA',
      context,
      error,
      false
    )
  }
  
  if (error.message?.includes('invalid_api_key') || error.status === 401) {
    return new AIAgentError(
      'Invalid API key',
      'INVALID_API_KEY',
      context,
      error,
      false
    )
  }
  
  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new AIAgentError(
      'Network connection failed',
      'NETWORK_ERROR',
      context,
      error,
      true
    )
  }
  
  // Database errors
  if (error.message?.includes('database') || error.message?.includes('supabase')) {
    return new AIAgentError(
      'Database operation failed',
      'DATABASE_ERROR',
      context,
      error,
      true
    )
  }
  
  // Default classification
  return new AIAgentError(
    error.message || 'Unknown error occurred',
    'UNKNOWN_ERROR',
    context,
    error,
    true
  )
}

/**
 * Comprehensive error handler with recovery strategies
 */
export async function handleErrorWithRecovery<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  recoveryStrategies: Array<() => Promise<T>> = [],
  options: RetryOptions = DEFAULT_RETRY_OPTIONS.aiApiCall
): Promise<T> {
  try {
    return await retryWithBackoff(operation, options, context.operation)
  } catch (primaryError) {
    const classifiedError = classifyError(primaryError, context)
    
    console.error(`❌ [ERROR-HANDLER] ${context.operation} failed:`, {
      code: classifiedError.code,
      message: classifiedError.message,
      context: classifiedError.context,
      recoverable: classifiedError.recoverable
    })
    
    // Try recovery strategies if error is recoverable
    if (classifiedError.recoverable && recoveryStrategies.length > 0) {
      console.log(`🔄 [ERROR-HANDLER] Attempting ${recoveryStrategies.length} recovery strategies`)
      
      for (let i = 0; i < recoveryStrategies.length; i++) {
        try {
          console.log(`🔄 [ERROR-HANDLER] Trying recovery strategy ${i + 1}`)
          const result = await recoveryStrategies[i]()
          console.log(`✅ [ERROR-HANDLER] Recovery strategy ${i + 1} succeeded`)
          return result
        } catch (recoveryError) {
          console.log(`❌ [ERROR-HANDLER] Recovery strategy ${i + 1} failed:`, (recoveryError as Error).message)
        }
      }
    }
    
    // All recovery attempts failed
    throw classifiedError
  }
}

/**
 * Memory and resource monitoring
 */
export function getResourceUsage() {
  const usage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  
  return {
    memory: {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: Math.round(process.uptime())
  }
}

/**
 * Concurrent processing utilities
 */
export async function processConcurrently<T, U>(
  items: T[],
  processor: (item: T, index: number) => Promise<U>,
  concurrency: number = 5
): Promise<U[]> {
  const results: U[] = new Array(items.length)
  const executing: Promise<void>[] = []
  
  for (let i = 0; i < items.length; i++) {
    const promise = processor(items[i], i).then(result => {
      results[i] = result
    })
    
    executing.push(promise)
    
    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(executing.findIndex(p => p === promise), 1)
    }
  }
  
  await Promise.all(executing)
  return results
}

/**
 * Health check utilities
 */
export async function checkServiceHealth(serviceName: string, healthCheck: () => Promise<boolean>): Promise<{
  service: string
  healthy: boolean
  responseTime: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const healthy = await withTimeout(healthCheck(), 5000, `${serviceName} health check timeout`)
    const responseTime = Date.now() - startTime
    
    return {
      service: serviceName,
      healthy,
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      service: serviceName,
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}