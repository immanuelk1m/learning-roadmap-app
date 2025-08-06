import { geminiLogger } from '@/lib/logger'

/**
 * Attempt to recover incomplete JSON responses from Gemini API
 * This handles common issues like truncated arrays or objects
 * @param response - The incomplete JSON string
 * @param responseType - The type of response being parsed
 * @returns Recovered JSON string
 */
function attemptJsonRecovery(response: string, responseType: string): string {
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
  
  // Handle incomplete string literals at the end
  const lastQuoteIndex = recovered.lastIndexOf('"')
  if (lastQuoteIndex > -1) {
    const afterLastQuote = recovered.substring(lastQuoteIndex + 1).trim()
    if (afterLastQuote && !afterLastQuote.match(/^[,\]\}]/)) {
      // Truncate to the last complete string
      recovered = recovered.substring(0, lastQuoteIndex + 1)
      if (!recovered.endsWith('}') && !recovered.endsWith(']')) {
        if (recovered.includes('[') && !recovered.includes(']')) {
          recovered += ']'
        }
        if (recovered.includes('{') && !recovered.endsWith('}')) {
          recovered += '}'
        }
      }
      
      geminiLogger.info('Applied string truncation recovery', {
        metadata: {
          originalLength: response.length,
          recoveredLength: recovered.length,
          lastQuoteIndex
        }
      })
    }
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