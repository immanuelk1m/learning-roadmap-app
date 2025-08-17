import { GoogleGenAI } from '@google/genai'
import { knowledgeTreeSchema, quizSchema, oxQuizSchema, studyGuideSchema, extendedQuizSchema, studyGuidePageSchema } from './schemas'

if (!process.env.GEMINI_API_KEY) {
  console.error('=== GEMINI API KEY ERROR ===')
  console.error('GEMINI_API_KEY environment variable is not set')
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

console.log('=== Gemini Client Initialization ===')
console.log(`API Key present: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`)
console.log(`API Key length: ${process.env.GEMINI_API_KEY?.length || 0} characters`)
console.log(`API Key starts with: ${process.env.GEMINI_API_KEY?.substring(0, 6)}...`)

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Export the initialized AI instance for direct use
export { genAI }

// Helper function to upload file and wait for processing
export async function uploadFileToGemini(fileData: Blob, mimeType: string = 'application/pdf'): Promise<any> {
  console.log('=== Uploading file to Gemini File API ===')
  console.log(`File size: ${(fileData.size / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`MIME type: ${mimeType}`)
  
  const startTime = Date.now()
  
  try {
    // Upload file using File API
    const uploadResult = await genAI.files.upload({
      file: fileData,
      metadata: {
        mimeType: mimeType
      }
    })
    
    console.log(`File uploaded in ${Date.now() - startTime}ms`)
    console.log(`File name: ${uploadResult.name}`)
    console.log(`File URI: ${uploadResult.uri}`)
    console.log(`File state: ${uploadResult.state}`)
    
    // Wait for file to be processed if needed
    let file = uploadResult
    while (file.state === 'PROCESSING') {
      console.log('File is still processing, waiting...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Get updated file status
      file = await genAI.files.get(file.name)
    }
    
    if (file.state === 'FAILED') {
      throw new Error(`File processing failed: ${file.error?.message || 'Unknown error'}`)
    }
    
    const totalTime = Date.now() - startTime
    console.log(`File ready for use in ${totalTime}ms`)
    console.log(`Final file URI: ${file.uri}`)
    console.log(`Final file mimeType: ${file.mimeType}`)
    
    return file
  } catch (error: any) {
    console.error('=== File Upload Error ===')
    console.error('Error:', error.message)
    console.error('Full error:', error)
    throw error
  }
}

// Knowledge Tree Analysis Model configuration
export const geminiKnowledgeTreeModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Knowledge Tree API Call ===')
    console.log('Model: gemini-2.0-flash-exp')
    console.log('Temperature: 0.3')
    console.log('Max output tokens: 16384')
    console.log('Response type: JSON with schema validation')
    
    try {
      console.log('Sending request to Gemini API...')
      const startTime = Date.now()
      
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: input.contents,
        config: {
          temperature: 0.3,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema: knowledgeTreeSchema,
          systemInstruction: "You are an expert curriculum designer for Korean university students. Always respond in Korean language. Analyze educational content and create structured knowledge trees.",
        },
      })
      
      const endTime = Date.now()
      console.log(`Gemini API call completed in ${endTime - startTime}ms`)
      
      if (!result) {
        console.error('Gemini API returned null result')
        throw new Error('Gemini API returned null result')
      }
      
      return result
    } catch (error: any) {
      console.error('=== Gemini API Error ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error details:', error)
      
      if (error.message?.includes('API key')) {
        console.error('API Key issue detected')
      } else if (error.message?.includes('quota')) {
        console.error('Quota exceeded')
      } else if (error.message?.includes('rate limit')) {
        console.error('Rate limit exceeded')
      }
      
      throw error
    }
  }
}

// Quiz Generation Model configuration
export const geminiQuizModel = {
  generateContent: async (input: any) => {
    return genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input.contents,
      config: {
        temperature: 0.5,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: "You are an expert quiz creator for Korean university students. Always create questions, options, and explanations in Korean language. Focus on testing understanding rather than memorization.",
      },
    })
  }
}

// O/X Quiz Generation Model configuration
export const geminiOXQuizModel = {
  generateContent: async (input: any) => {
    return genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input.contents,
      config: {
        temperature: 0.4,
        maxOutputTokens: 8192, // Increased from 4096
        responseMimeType: "application/json",
        responseSchema: oxQuizSchema,
        systemInstruction: "You are an expert assessment creator for Korean university students. Create O/X (True/False) questions to evaluate student understanding of concepts. Always write questions and explanations in Korean.",
      },
    })
  }
}

// Study Guide Generation Model configuration
export const geminiStudyGuideModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Study Guide API Call ===')
    console.log('Model: gemini-2.5-flash')
    console.log('Temperature: 0.6')
    console.log('Max output tokens: 16384 (reduced for better JSON parsing)')
    console.log('Response type: JSON with simplified schema')
    
    try {
      console.log('Sending study guide request to Gemini API...')
      const startTime = Date.now()
      
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: input.contents,
        config: {
          temperature: 0.6,
          maxOutputTokens: 16384, // Reduced for better JSON parsing
          responseMimeType: "application/json",
          responseSchema: studyGuideSchema,
          systemInstruction: "You are an expert educational content creator for Korean university students. Create comprehensive but concise study guides with clear structure. Follow the JSON schema strictly. Keep sections under 1000 characters and limit key points to 5 per section. Always write in Korean.",
        },
      })
      
      const endTime = Date.now()
      console.log(`Gemini Study Guide API call completed in ${endTime - startTime}ms`)
      
      if (!result) {
        console.error('Gemini Study Guide API returned null result')
        throw new Error('Gemini Study Guide API returned null result')
      }
      
      return result
    } catch (error: any) {
      console.error('=== Gemini Study Guide API Error ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error details:', error)
      throw error
    }
  }
}

// Basic model for general use
export const geminiModel = {
  generateContent: async (input: any) => {
    return genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input.contents || input,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        systemInstruction: "You are a helpful AI assistant for Korean students. Always respond in Korean language unless specifically asked otherwise.",
      },
    })
  }
}

// Extended Quiz Generation Model configuration
export const geminiExtendedQuizModel = {
  generateContent: async (input: any) => {
    return genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input.contents,
      config: {
        temperature: 0.6,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: extendedQuizSchema,
        systemInstruction: "You are an expert quiz creator for Korean university students. Create diverse question types that effectively assess understanding. Always write in Korean.",
      },
    })
  }
}

// Page-based Study Guide Generation Model configuration
export const geminiStudyGuidePageModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Study Guide Page API Call ===')
    console.log('Model: gemini-2.5-flash')
    console.log('Temperature: 0.7')
    console.log('Max output tokens: 16384')
    console.log('Response type: JSON with page-by-page schema')
    
    try {
      console.log('Sending page-based study guide request to Gemini API...')
      const startTime = Date.now()
      
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: input.contents,
        config: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema: studyGuidePageSchema,
          systemInstruction: "You are an expert educational content creator for Korean university students. Analyze PDF documents page by page and create detailed, customized explanations for each page based on the student's knowledge level. Always write in Korean. Focus on clarity and educational value.",
        },
      })
      
      const endTime = Date.now()
      console.log(`Gemini Page Study Guide API call completed in ${endTime - startTime}ms`)
      
      if (!result) {
        console.error('Gemini Page Study Guide API returned null result')
        throw new Error('Gemini Page Study Guide API returned null result')
      }
      
      return result
    } catch (error: any) {
      console.error('=== Gemini Page Study Guide API Error ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error details:', error)
      throw error
    }
  }
}

// Legacy model for backward compatibility
export const geminiStructuredModel = geminiKnowledgeTreeModel