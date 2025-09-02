// Centralized environment setup for Google Gemini via Vercel AI SDK
// We only use GEMINI_API_KEY; bridge it to the provider's expected var.

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

// Vercel AI SDK Google provider reads GOOGLE_GENERATIVE_AI_API_KEY.
// Map it from GEMINI_API_KEY so we don’t need a second env var.
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY

