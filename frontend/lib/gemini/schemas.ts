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

// Base interface for all question types
export interface BaseQuizQuestion {
  question: string
  explanation: string
  source_quote: string
  difficulty: 'easy' | 'medium' | 'hard'
  node_id?: string  // Link to knowledge node
}

// Multiple choice question (current type)
export interface MultipleChoiceQuestion extends BaseQuizQuestion {
  type: 'multiple_choice'
  options: string[]
  correct_answer: string
}

// True/False question
export interface TrueFalseQuestion extends BaseQuizQuestion {
  type: 'true_false'
  correct_answer: boolean
}

// Short answer question
export interface ShortAnswerQuestion extends BaseQuizQuestion {
  type: 'short_answer'
  acceptable_answers: string[]  // Multiple acceptable variations
  hint?: string
}

// Fill in the blank question
export interface FillInTheBlankQuestion extends BaseQuizQuestion {
  type: 'fill_in_blank'
  template: string  // e.g., "The capital of Korea is ___"
  blanks: Array<{
    position: number
    answer: string
    alternatives?: string[]  // Alternative correct answers
  }>
}

// Matching question
export interface MatchingQuestion extends BaseQuizQuestion {
  type: 'matching'
  left_items: string[]
  right_items: string[]
  correct_pairs: Array<{
    left_index: number
    right_index: number
  }>
}

// Union type for all question types
export type ExtendedQuizQuestion = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | ShortAnswerQuestion 
  | FillInTheBlankQuestion 
  | MatchingQuestion

// Extended quiz response
export interface ExtendedQuizResponse {
  questions: ExtendedQuizQuestion[]
}

// Legacy interface for backward compatibility
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

// Page-by-page study guide interfaces
export interface StudyGuidePage {
  page_number: number
  page_title: string
  page_content: string
  key_concepts: string[]
  difficulty_level: 'easy' | 'medium' | 'hard'
  prerequisites: string[]
  learning_objectives: string[]
  original_content?: string
}

export interface StudyGuidePageResponse {
  document_title: string
  total_pages: number
  pages: StudyGuidePage[]
  overall_summary: string
  learning_path?: string[]  // Suggested order of pages to study
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

// Extended schema for diverse question types
export const extendedQuizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["multiple_choice", "true_false", "short_answer", "fill_in_blank", "matching"]
          },
          question: { type: Type.STRING },
          explanation: { type: Type.STRING },
          source_quote: { type: Type.STRING },
          difficulty: {
            type: Type.STRING,
            enum: ["easy", "medium", "hard"]
          },
          node_id: { 
            type: Type.STRING,
            nullable: true
          },
          // Multiple choice specific
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true
          },
          correct_answer: { 
            type: Type.STRING,
            nullable: true
          },
          // True/False specific
          correct_answer_bool: {
            type: Type.BOOLEAN,
            nullable: true
          },
          // Short answer specific
          acceptable_answers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true
          },
          hint: {
            type: Type.STRING,
            nullable: true
          },
          // Fill in the blank specific
          template: {
            type: Type.STRING,
            nullable: true
          },
          blanks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                position: { type: Type.INTEGER },
                answer: { type: Type.STRING },
                alternatives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  nullable: true
                }
              },
              required: ["position", "answer"]
            },
            nullable: true
          },
          // Matching specific
          left_items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true
          },
          right_items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true
          },
          correct_pairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                left_index: { type: Type.INTEGER },
                right_index: { type: Type.INTEGER }
              },
              required: ["left_index", "right_index"]
            },
            nullable: true
          }
        },
        required: ["type", "question", "explanation", "source_quote", "difficulty"]
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

// Schema for study guide generation - simplified for better JSON parsing
export const studyGuideSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "Study guide title in Korean"
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { 
            type: Type.STRING,
            description: "Section heading in Korean"
          },
          content: { 
            type: Type.STRING,
            description: "Section content in Korean, maximum 1000 characters"
          },
          key_points: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 5,
            description: "Maximum 5 key points in Korean"
          }
        },
        required: ["heading", "content", "key_points"]
      },
      maxItems: 8,
      description: "Maximum 8 sections"
    },
    summary: { 
      type: Type.STRING,
      description: "Study guide summary in Korean, maximum 500 characters"
    },
    references: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      maxItems: 5,
      nullable: true,
      description: "Optional references, maximum 5 items"
    }
  },
  required: ["title", "sections", "summary"]
}

// Schema for page-by-page study guide generation
export const studyGuidePageSchema = {
  type: Type.OBJECT,
  properties: {
    document_title: { 
      type: Type.STRING,
      description: "Document title in Korean"
    },
    total_pages: {
      type: Type.INTEGER,
      description: "Total number of pages analyzed"
    },
    pages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          page_number: {
            type: Type.INTEGER,
            description: "Page number (1-indexed)"
          },
          page_title: {
            type: Type.STRING,
            description: "Title or main topic of this page in Korean"
          },
          page_content: {
            type: Type.STRING,
            description: "Customized explanation for this page based on user's knowledge level, in Korean, max 2000 characters"
          },
          key_concepts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 10,
            description: "Key concepts covered in this page"
          },
          difficulty_level: {
            type: Type.STRING,
            enum: ["easy", "medium", "hard"],
            description: "Difficulty level of the page content"
          },
          prerequisites: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 5,
            description: "Concepts that should be understood before this page"
          },
          learning_objectives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 5,
            description: "What the student should learn from this page"
          },
          original_content: {
            type: Type.STRING,
            nullable: true,
            description: "Original PDF page text for reference (optional)"
          }
        },
        required: ["page_number", "page_title", "page_content", "key_concepts", "difficulty_level", "prerequisites", "learning_objectives"]
      },
      description: "Array of page descriptions"
    },
    overall_summary: {
      type: Type.STRING,
      description: "Overall summary of the document in Korean, max 1000 characters"
    },
    learning_path: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      nullable: true,
      description: "Suggested order of pages to study (optional)"
    }
  },
  required: ["document_title", "total_pages", "pages", "overall_summary"]
}