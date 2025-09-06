import { geminiLogger } from '@/lib/logger'

/**
 * Attempt to recover incomplete JSON responses from Gemini API
 * This handles common issues like truncated arrays or objects
 * @param response - The incomplete JSON string
 * @param responseType - The type of response being parsed
 * @returns Recovered JSON string
 */
export function attemptJsonRecovery(response: string, responseType: string): string {
  let recovered = response.trim()
  
  // Handle truncated arrays - common issue with large responses
  if (recovered.includes('[') && !recovered.endsWith(']')) {
    // Find the last complete object/element
    let depth = 0
    let lastValidPos = -1
    
    for (let i = 0; i < recovered.length; i++) {
      const char = recovered[i]
      if (char === '{' || char === '[') {
        depth++
      } else if (char === '}' || char === ']') {
        depth--
        if (depth === 1) { // We're back to the main array level
          lastValidPos = i
        }
      }
    }
    
    if (lastValidPos > -1) {
      recovered = recovered.substring(0, lastValidPos + 1)
      
      // Close the array properly
      if (responseType === 'study_guide') {
        recovered += ']}'
      } else {
        recovered += ']}'
      }
      
      geminiLogger.info('Applied array truncation recovery', {
        metadata: {
          originalLength: response.length,
          recoveredLength: recovered.length,
          lastValidPos
        }
      })
    }
  }
  
  // Handle truncated objects
  if (recovered.includes('{') && !recovered.endsWith('}')) {
    let depth = 0
    let lastValidPos = -1
    
    for (let i = 0; i < recovered.length; i++) {
      const char = recovered[i]
      if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
        if (depth === 0) {
          lastValidPos = i
        }
      }
    }
    
    if (lastValidPos > -1) {
      recovered = recovered.substring(0, lastValidPos + 1)
    } else {
      // Force close the object if no valid position found
      recovered += '}'
    }
    
    geminiLogger.info('Applied object truncation recovery', {
      metadata: {
        originalLength: response.length,
        recoveredLength: recovered.length,
        lastValidPos
      }
    })
  }
  
  // Handle incomplete string literals at the end - improved logic
  // Count quotes to determine if we're inside a string
  let quoteCount = 0
  let inString = false
  let escapeNext = false
  let lastCompletePosition = -1
  
  for (let i = 0; i < recovered.length; i++) {
    const char = recovered[i]
    const prevChar = i > 0 ? recovered[i - 1] : ''
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"' && prevChar !== '\\') {
      inString = !inString
      quoteCount++
      if (!inString) {
        // We just closed a string, this is a safe position
        lastCompletePosition = i + 1
      }
    }
  }
  
  // If we're inside an unclosed string, truncate to the last complete position
  if (inString && lastCompletePosition > -1) {
    recovered = recovered.substring(0, lastCompletePosition)
    
    // Now we need to properly close any open arrays or objects
    // Track structure depth more accurately
    const structureStack: ('array' | 'object')[] = []
    let skipString = false
    let escapeNext = false
    
    for (let i = 0; i < recovered.length; i++) {
      const char = recovered[i]
      
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        continue
      }
      
      if (char === '"' && !escapeNext) {
        skipString = !skipString
        continue
      }
      
      if (!skipString) {
        if (char === '{') {
          structureStack.push('object')
        } else if (char === '}') {
          if (structureStack[structureStack.length - 1] === 'object') {
            structureStack.pop()
          }
        } else if (char === '[') {
          structureStack.push('array')
        } else if (char === ']') {
          if (structureStack[structureStack.length - 1] === 'array') {
            structureStack.pop()
          }
        }
      }
    }
    
    // Close any unclosed structures in reverse order
    while (structureStack.length > 0) {
      const structure = structureStack.pop()
      if (structure === 'array') {
        recovered += ']'
      } else if (structure === 'object') {
        recovered += '}'
      }
    }
    
    geminiLogger.info('Applied improved string truncation recovery', {
      metadata: {
        originalLength: response.length,
        recoveredLength: recovered.length,
        lastCompletePosition,
        wasInString: true
      }
    })
  }
  
  // Clean up any trailing commas that might cause issues
  recovered = recovered.replace(/,(\s*[\}\]])/g, '$1')
  
  return recovered
}

/**
 * Safely parse JSON response from Gemini API with detailed error logging
 * @param response - The JSON string response from Gemini
 * @param context - Context information for logging
 * @returns Parsed JSON object
 * @throws Error with detailed information if parsing fails
 */
export function parseGeminiResponse<T>(
  response: string, 
  context: { correlationId?: string; documentId?: string; responseType: string }
): T {
  if (!response) {
    throw new Error('Empty response from Gemini API')
  }

  try {
    const parsed = JSON.parse(response) as T
    
    geminiLogger.debug('Successfully parsed Gemini response', {
      correlationId: context.correlationId,
      documentId: context.documentId,
      metadata: {
        responseType: context.responseType,
        responseLength: response.length
      }
    })
    
    return parsed
  } catch (error: any) {
    // Log the error with context
    geminiLogger.error('Failed to parse Gemini response', {
      correlationId: context.correlationId,
      documentId: context.documentId,
      error,
      metadata: {
        responseType: context.responseType,
        responseLength: response.length,
        responseStart: response.substring(0, 200),
        responseEnd: response.length > 200 ? response.substring(response.length - 200) : '',
        errorMessage: error.message,
        errorType: error.name
      }
    })

    // Check for common JSON parsing issues
    if (response.includes('```json')) {
      throw new Error('Response contains markdown code blocks. Gemini may not be following the structured output format.')
    }
    
    if (response.startsWith('```') || response.endsWith('```')) {
      throw new Error('Response is wrapped in code blocks. Check the prompt instructions.')
    }
    
    // Attempt JSON recovery for incomplete responses
    let recoveredResponse = response
    try {
      recoveredResponse = attemptJsonRecovery(response, context.responseType)
      const parsed = JSON.parse(recoveredResponse) as T
      
      geminiLogger.warn('Successfully recovered and parsed incomplete JSON response', {
        correlationId: context.correlationId,
        documentId: context.documentId,
        metadata: {
          responseType: context.responseType,
          originalLength: response.length,
          recoveredLength: recoveredResponse.length,
          recoveryApplied: true
        }
      })
      
      return parsed
    } catch (recoveryError: any) {
      geminiLogger.error('JSON recovery also failed', {
        correlationId: context.correlationId,
        documentId: context.documentId,
        error: recoveryError,
        metadata: {
          responseType: context.responseType,
          originalError: error.message,
          recoveryError: recoveryError.message
        }
      })
    }
    
    // Re-throw with more context
    throw new Error(`Failed to parse ${context.responseType} response: ${error.message}`)
  }
}

/**
 * Validate that a response matches expected structure
 * @param response - The parsed response object
 * @param requiredFields - Array of required field names
 * @param context - Context information for logging
 * @throws Error if validation fails
 */
export function validateResponseStructure<T extends Record<string, any>>(
  response: T,
  requiredFields: string[],
  context: { correlationId?: string; documentId?: string; responseType: string }
): void {
  const missingFields: string[] = []
  
  for (const field of requiredFields) {
    if (!(field in response)) {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    geminiLogger.error('Response validation failed - missing required fields', {
      correlationId: context.correlationId,
      documentId: context.documentId,
      metadata: {
        responseType: context.responseType,
        missingFields,
        receivedFields: Object.keys(response),
        response: JSON.stringify(response).substring(0, 500)
      }
    })
    
    throw new Error(`Invalid ${context.responseType} response structure: missing fields [${missingFields.join(', ')}]`)
  }
  
  geminiLogger.debug('Response validation passed', {
    correlationId: context.correlationId,
    documentId: context.documentId,
    metadata: {
      responseType: context.responseType,
      validatedFields: requiredFields
    }
  })
}

/**
 * Wraps an async function with exponential backoff retry logic.
 * @param asyncFn The async function to execute.
 * @param maxRetries The maximum number of retries.
 * @param initialDelayMs The initial delay in milliseconds.
 * @returns The result of the async function.
 * @throws Error if the function fails after all retries.
 */
export async function withRetry<T>(
  asyncFn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 2000
): Promise<T> {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      geminiLogger.info(`Attempting operation (attempt ${attempt + 1}/${maxRetries})...`)
      return await asyncFn()
    } catch (error: any) {
      geminiLogger.warn(`Operation failed (attempt ${attempt + 1}):`, {
        error: error.message,
        status: error.status
      })
      
      attempt++
      if (attempt >= maxRetries) {
        geminiLogger.error('Max retries reached. Rethrowing error.', { error })
        throw error
      }

      // Check if it's a 5xx error, which is a good candidate for retry
      if (error.status >= 500 && error.status <= 599) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1)
        geminiLogger.info(`Waiting ${delay}ms before next retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // If it's not a server error (e.g., 4xx), don't retry
        geminiLogger.error('Non-retriable error encountered. Rethrowing immediately.', { error })
        throw error
      }
    }
  }
  // This line should not be reachable, but is required for TypeScript
  throw new Error('Exited retry loop unexpectedly.')
}

/**
 * Run an async operation with explicit custom backoff delays.
 * Example: delaysMs=[16000, 64000, 128000] will retry up to 3 times with those waits.
 * The total attempts = delaysMs.length + 1 (initial + retries).
 */
export async function withCustomBackoff<T>(
  asyncFn: () => Promise<T>,
  delaysMs: number[]
): Promise<T> {
  let attempt = 0
  const totalAttempts = delaysMs.length + 1
  while (attempt < totalAttempts) {
    try {
      geminiLogger.info(`Attempting operation (attempt ${attempt + 1}/${totalAttempts})...`)
      return await asyncFn()
    } catch (error: any) {
      attempt++
      if (attempt >= totalAttempts) {
        geminiLogger.error('All attempts failed for withCustomBackoff. Rethrowing error.', { error })
        throw error
      }
      const delay = delaysMs[attempt - 1]
      geminiLogger.warn(`Attempt ${attempt} failed. Waiting ${delay}ms before retry.`, {
        error: error?.message,
        status: error?.status
      })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Exited custom backoff loop unexpectedly.')
}