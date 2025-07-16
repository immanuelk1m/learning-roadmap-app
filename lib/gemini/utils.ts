import { geminiLogger } from '@/lib/logger'

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