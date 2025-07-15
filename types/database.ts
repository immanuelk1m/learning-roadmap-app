export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          subject_id: string
          user_id: string
          title: string
          file_path: string
          file_size: number | null
          page_count: number | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          gemini_file_uri: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          user_id: string
          title: string
          file_path: string
          file_size?: number | null
          page_count?: number | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          gemini_file_uri?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          user_id?: string
          title?: string
          file_path?: string
          file_size?: number | null
          page_count?: number | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          gemini_file_uri?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_nodes: {
        Row: {
          id: string
          document_id: string
          parent_id: string | null
          name: string
          description: string | null
          level: number
          position: number
          prerequisites: string[]
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          parent_id?: string | null
          name: string
          description?: string | null
          level?: number
          position?: number
          prerequisites?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          parent_id?: string | null
          name?: string
          description?: string | null
          level?: number
          position?: number
          prerequisites?: string[]
          created_at?: string
        }
      }
      user_knowledge_status: {
        Row: {
          id: string
          user_id: string
          node_id: string
          understanding_level: number
          last_reviewed: string | null
          review_count: number
          assessment_method: 'self_reported' | 'quiz' | 'test'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          node_id: string
          understanding_level?: number
          last_reviewed?: string | null
          review_count?: number
          assessment_method?: 'self_reported' | 'quiz' | 'test'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          node_id?: string
          understanding_level?: number
          last_reviewed?: string | null
          review_count?: number
          assessment_method?: 'self_reported' | 'quiz' | 'test'
          created_at?: string
          updated_at?: string
        }
      }
      quiz_items: {
        Row: {
          id: string
          document_id: string
          node_id: string | null
          question: string
          question_type: 'multiple_choice' | 'true_false' | 'short_answer'
          options: Json
          correct_answer: string
          explanation: string | null
          difficulty: number
          page_reference: number | null
          is_assessment: boolean
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          node_id?: string | null
          question: string
          question_type: 'multiple_choice' | 'true_false' | 'short_answer'
          options?: Json
          correct_answer: string
          explanation?: string | null
          difficulty?: number
          page_reference?: number | null
          is_assessment?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          node_id?: string | null
          question?: string
          question_type?: 'multiple_choice' | 'true_false' | 'short_answer'
          options?: Json
          correct_answer?: string
          explanation?: string | null
          difficulty?: number
          page_reference?: number | null
          is_assessment?: boolean
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          quiz_item_id: string
          user_answer: string
          is_correct: boolean
          time_spent: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_item_id: string
          user_answer: string
          is_correct: boolean
          time_spent?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_item_id?: string
          user_answer?: string
          is_correct?: boolean
          time_spent?: number | null
          created_at?: string
        }
      }
      missed_questions: {
        Row: {
          id: string
          user_id: string
          quiz_item_id: string
          document_id: string
          node_id: string | null
          source_quote: string
          review_count: number
          last_reviewed: string | null
          mastered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_item_id: string
          document_id: string
          node_id?: string | null
          source_quote: string
          review_count?: number
          last_reviewed?: string | null
          mastered?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_item_id?: string
          document_id?: string
          node_id?: string | null
          source_quote?: string
          review_count?: number
          last_reviewed?: string | null
          mastered?: boolean
          created_at?: string
        }
      }
      ai_analysis_cache: {
        Row: {
          id: string
          document_id: string
          analysis_type: string
          result: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          analysis_type: string
          result: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          analysis_type?: string
          result?: Json
          created_at?: string
        }
      }
      knowledge_assessment_quizzes: {
        Row: {
          id: string
          node_id: string
          question: string
          correct_answer: boolean
          explanation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          node_id: string
          question: string
          correct_answer: boolean
          explanation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          node_id?: string
          question?: string
          correct_answer?: boolean
          explanation?: string | null
          created_at?: string
        }
      }
    }
  }
}