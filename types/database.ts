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
          status: 'known' | 'unclear' | 'unknown'
          confidence_score: number
          last_reviewed: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          node_id: string
          status?: 'known' | 'unclear' | 'unknown'
          confidence_score?: number
          last_reviewed?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          node_id?: string
          status?: 'known' | 'unclear' | 'unknown'
          confidence_score?: number
          last_reviewed?: string | null
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
          options: Json
          correct_answer: string
          explanation: string
          source_quote: string
          difficulty: 'easy' | 'medium' | 'hard'
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          node_id?: string | null
          question: string
          options: Json
          correct_answer: string
          explanation: string
          source_quote: string
          difficulty?: 'easy' | 'medium' | 'hard'
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          node_id?: string | null
          question?: string
          options?: Json
          correct_answer?: string
          explanation?: string
          source_quote?: string
          difficulty?: 'easy' | 'medium' | 'hard'
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
    }
  }
}