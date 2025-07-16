import { Type } from '@google/genai'

export interface KnowledgeNode {
  id: string
  parent_id: string | null
  name: string
  description: string
  level: number
  prerequisites: string[]
}

export interface KnowledgeTreeResponse {
  nodes: KnowledgeNode[]
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  source_quote: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizResponse {
  questions: QuizQuestion[]
}

export interface OXQuizItem {
  node_id: string
  question: string
  correct_answer: 'O' | 'X'
  explanation: string
}

export interface OXQuizResponse {
  quiz_items: OXQuizItem[]
}

export interface StudyGuideSection {
  heading: string
  content: string
  key_points: string[]
}

export interface StudyGuideResponse {
  title: string
  sections: StudyGuideSection[]
  summary: string
  references?: string[]
}

// Schema for knowledge tree using the new Type enum
// Simplified flat structure to avoid recursive schema issues
export const knowledgeTreeSchema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          parent_id: { 
            type: Type.STRING,
            nullable: true 
          },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          level: { type: Type.INTEGER },
          prerequisites: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["id", "name", "description", "level", "prerequisites"]
      }
    }
  },
  required: ["nodes"]
}

// Schema for quiz generation using the new Type enum
export const quizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correct_answer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          source_quote: { type: Type.STRING },
          difficulty: {
            type: Type.STRING,
            enum: ["easy", "medium", "hard"]
          }
        },
        required: ["question", "options", "correct_answer", "explanation", "source_quote", "difficulty"],
        propertyOrdering: ["question", "options", "correct_answer", "explanation", "source_quote", "difficulty"]
      }
    }
  },
  required: ["questions"]
}

// Schema for O/X quiz generation
export const oxQuizSchema = {
  type: Type.OBJECT,
  properties: {
    quiz_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          node_id: { type: Type.STRING },
          question: { type: Type.STRING },
          correct_answer: { 
            type: Type.STRING,
            enum: ["O", "X"]
          },
          explanation: { type: Type.STRING }
        },
        required: ["node_id", "question", "correct_answer", "explanation"]
      }
    }
  },
  required: ["quiz_items"]
}

// Schema for study guide generation
export const studyGuideSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          content: { type: Type.STRING },
          key_points: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["heading", "content", "key_points"]
      }
    },
    summary: { type: Type.STRING },
    references: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["title", "sections", "summary"]
}