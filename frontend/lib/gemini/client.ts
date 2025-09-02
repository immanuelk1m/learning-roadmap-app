import { GoogleGenerativeAI } from '@google/generative-ai'
import { knowledgeTreeSchema, quizSchema, oxQuizSchema, extendedQuizSchema, studyGuidePageSchema, knowledgeTreeWithOXSchema } from './schemas'

if (!process.env.GEMINI_API_KEY) {
  console.error('=== GEMINI API KEY ERROR ===')
  console.error('GEMINI_API_KEY environment variable is not set')
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

console.log('=== Gemini Client Initialization ===')
console.log(`API Key present: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`)
console.log(`API Key length: ${process.env.GEMINI_API_KEY?.length || 0} characters`)
console.log(`API Key starts with: ${process.env.GEMINI_API_KEY?.substring(0, 6)}...`)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Export the initialized AI instance for direct use
export { genAI }

// Helper function to upload file and wait for processing
// Helper function to convert a Blob to a base64 string
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

// Updated function to prepare file data for inline inclusion in API call
export async function prepareFileData(fileData: Blob, mimeType: string = 'application/pdf') {
  console.log('=== Preparing file data for Gemini API ===')
  console.log(`File size: ${(fileData.size / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`MIME type: ${mimeType}`)
  
  const startTime = Date.now()
  
  try {
    const base64Data = await blobToBase64(fileData)
    const totalTime = Date.now() - startTime
    console.log(`File prepared in ${totalTime}ms`)
    
    return {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    }
  } catch (error: any) {
    console.error('=== File Preparation Error ===')
    console.error('Error:', error.message)
    console.error('Full error:', error)
    throw error
  }
}

// Knowledge Tree Analysis Model configuration
export const geminiKnowledgeTreeModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Knowledge Tree API Call ===')
    console.log('Model: gemini-2.5-flash')
    console.log('Temperature: 0.3')
    console.log('Max output tokens: 16384')
    console.log('Response type: JSON with schema validation')
    
    try {
      console.log('Sending request to Gemini API...')
      const startTime = Date.now()
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
        },
        systemInstruction: "You are an expert curriculum designer for Korean university students. Always respond in Korean language. Analyze educational content and create structured knowledge trees.",
      })
      
      const result = await model.generateContent(input.contents)
      
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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
      systemInstruction: "You are an expert quiz creator for Korean university students. Always create questions, options, and explanations in Korean language. Focus on testing understanding rather than memorization.",
    })
    
    return model.generateContent(input)
  }
}

// Combined Knowledge Tree + O/X Quiz Model configuration
export const geminiCombinedModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Combined API Call ===')
    console.log('Model: gemini-2.5-flash')
    console.log('Temperature: 0.3')
    console.log('Max output tokens: 16384')
    console.log('Response type: JSON with combined schema')
    
    try {
      console.log('Sending combined request to Gemini API...')
      const startTime = Date.now()
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3, // Lower for consistency
          maxOutputTokens: 16384, // Increased for better response
          responseMimeType: "application/json",
        },
        systemInstruction: "You are an expert curriculum designer and assessment creator for Korean university students. CRITICAL: Always respond in Korean language. All node names and descriptions MUST be in Korean. English abbreviations (like GDP, AI, API) can be used in names but descriptions must be fully in Korean. Never use English sentences or explanations. 모든 응답은 한국어로 작성하세요.",
      })
      
      const result = await model.generateContent(input.contents)
      
      const endTime = Date.now()
      console.log(`Gemini Combined API call completed in ${endTime - startTime}ms`)
      
      if (!result) {
        console.error('Gemini API returned null result')
        throw new Error('Gemini API returned null result')
      }
      
      return result
    } catch (error: any) {
      console.error('=== Gemini Combined API Error ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error details:', error)
      throw error
    }
  }
}

// Extended Quiz Generation Model configuration
export const geminiExtendedQuizModel = {
  generateContent: async (input: any) => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
      systemInstruction: "You are an expert quiz creator for Korean university students. Create diverse question types that effectively assess understanding. Always write in Korean.",
    })
    
    return model.generateContent(input)
  }
}

// Page-based Study Guide Generation Model configuration
export const geminiStudyGuidePageModel = {
  generateContent: async (input: any) => {
    console.log('=== Gemini Study Guide Page API Call ===')
    console.log('Model: gemini-2.5-flash')
    console.log('Temperature: 0.7')
    console.log('Max output tokens: 50000')
    console.log('Response type: JSON with page-by-page schema')
    
    try {
      console.log('Sending page-based study guide request to Gemini API...')
      const startTime = Date.now()
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50000,
          responseMimeType: "application/json",
        },
        systemInstruction: "You are an expert educational content creator for Korean university students. Analyze PDF documents page by page and create detailed, customized explanations for each page based on the student's knowledge level. Always write in Korean. Focus on clarity and educational value.",
      })
      
      const result = await model.generateContent(input)
      
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
