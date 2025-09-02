import { SchemaType } from '@google/generative-ai'

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
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          parent_id: { 
            type: SchemaType.STRING,
            nullable: true 
          },
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          level: { type: SchemaType.INTEGER },
          prerequisites: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
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
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          correct_answer: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          source_quote: { type: SchemaType.STRING },
          difficulty: {
            type: SchemaType.STRING,
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
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            enum: ["multiple_choice", "true_false", "short_answer", "fill_in_blank", "matching"]
          },
          question: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          source_quote: { type: SchemaType.STRING },
          difficulty: {
            type: SchemaType.STRING,
            enum: ["easy", "medium", "hard"]
          },
          node_id: { 
            type: SchemaType.STRING,
            nullable: true
          },
          // Multiple choice specific
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          },
          correct_answer: { 
            type: SchemaType.STRING,
            nullable: true
          },
          // True/False specific
          correct_answer_bool: {
            type: SchemaType.BOOLEAN,
            nullable: true
          },
          // Short answer specific
          acceptable_answers: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          },
          hint: {
            type: SchemaType.STRING,
            nullable: true
          },
          // Fill in the blank specific
          template: {
            type: SchemaType.STRING,
            nullable: true
          },
          blanks: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                position: { type: SchemaType.INTEGER },
                answer: { type: SchemaType.STRING },
                alternatives: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  nullable: true
                }
              },
              required: ["position", "answer"]
            },
            nullable: true
          },
          // Matching specific
          left_items: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          },
          right_items: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          },
          correct_pairs: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                left_index: { type: SchemaType.INTEGER },
                right_index: { type: SchemaType.INTEGER }
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
  type: SchemaType.OBJECT,
  properties: {
    quiz_items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          node_id: { type: SchemaType.STRING },
          question: { type: SchemaType.STRING },
          correct_answer: { 
            type: SchemaType.STRING,
            enum: ["O", "X"]
          },
          explanation: { type: SchemaType.STRING }
        },
        required: ["node_id", "question", "correct_answer", "explanation"]
      }
    }
  },
  required: ["quiz_items"]
}

// Combined schema for knowledge tree with O/X quiz
export const knowledgeTreeWithOXSchema = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          parent_id: { 
            type: SchemaType.STRING,
            nullable: true 
          },
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          level: { type: SchemaType.INTEGER },
          prerequisites: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["id", "name", "description", "level", "prerequisites"]
      }
    },
    ox_quiz: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          node_id: { type: SchemaType.STRING },
          question: { type: SchemaType.STRING },
          correct_answer: { 
            type: SchemaType.STRING,
            enum: ["O", "X"]
          },
          explanation: { type: SchemaType.STRING }
        },
        required: ["node_id", "question", "correct_answer", "explanation"]
      }
    }
  },
  required: ["nodes", "ox_quiz"]
}

// Schema for study guide generation - simplified for better JSON parsing
export const studyGuideSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { 
      type: SchemaType.STRING,
      description: "Study guide title in Korean"
    },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          heading: { 
            type: SchemaType.STRING,
            description: "Section heading in Korean"
          },
          content: { 
            type: SchemaType.STRING,
            description: "Section content in Korean, maximum 1000 characters"
          },
          key_points: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
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
      type: SchemaType.STRING,
      description: "Study guide summary in Korean, maximum 500 characters"
    },
    references: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      maxItems: 5,
      nullable: true,
      description: "Optional references, maximum 5 items"
    }
  },
  required: ["title", "sections", "summary"]
}

// Schema for page-by-page study guide generation
export const studyGuidePageSchema = {
  type: SchemaType.OBJECT,
  properties: {
    document_title: { 
      type: SchemaType.STRING,
      description: "Document title in Korean"
    },
    total_pages: {
      type: SchemaType.INTEGER,
      description: "Total number of pages analyzed"
    },
    pages: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          page_number: {
            type: SchemaType.INTEGER,
            description: "Page number (1-indexed)"
          },
          page_title: {
            type: SchemaType.STRING,
            description: "Title or main topic of this page in Korean"
          },
          page_content: {
            type: SchemaType.STRING,
            description: "Customized explanation for this page based on user's knowledge level, in Korean, max 2000 characters"
          },
          key_concepts: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            maxItems: 10,
            description: "Key concepts covered in this page"
          },
          difficulty_level: {
            type: SchemaType.STRING,
            enum: ["easy", "medium", "hard"],
            description: "Difficulty level of the page content"
          },
          prerequisites: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            maxItems: 5,
            description: "Concepts that should be understood before this page"
          },
          learning_objectives: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            maxItems: 5,
            description: "What the student should learn from this page"
          },
          original_content: {
            type: SchemaType.STRING,
            nullable: true,
            description: "Original PDF page text for reference (optional)"
          }
        },
        required: ["page_number", "page_title", "page_content", "key_concepts", "difficulty_level", "prerequisites", "learning_objectives"]
      },
      description: "Array of page descriptions"
    },
    overall_summary: {
      type: SchemaType.STRING,
      description: "Overall summary of the document in Korean, max 1000 characters"
    },
    learning_path: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      nullable: true,
      description: "Suggested order of pages to study (optional)"
    }
  },
  required: ["document_title", "total_pages", "pages", "overall_summary"]
}