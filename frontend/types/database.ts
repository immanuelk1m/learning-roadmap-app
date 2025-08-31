export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          assessment_completed: boolean | null
          created_at: string
          file_path: string
          file_size: number | null
          gemini_file_uri: string | null
          id: string
          page_count: number | null
          quiz_generation_status: Json | null
          status: string | null
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_completed?: boolean | null
          created_at?: string
          file_path: string
          file_size?: number | null
          gemini_file_uri?: string | null
          id?: string
          page_count?: number | null
          quiz_generation_status?: Json | null
          status?: string | null
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_completed?: boolean | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          gemini_file_uri?: string | null
          id?: string
          page_count?: number | null
          quiz_generation_status?: Json | null
          status?: string | null
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_assessment_quizzes: {
        Row: {
          correct_answer: boolean
          created_at: string | null
          explanation: string | null
          id: string
          node_id: string
          question: string
        }
        Insert: {
          correct_answer: boolean
          created_at?: string | null
          explanation?: string | null
          id?: string
          node_id: string
          question: string
        }
        Update: {
          correct_answer?: boolean
          created_at?: string | null
          explanation?: string | null
          id?: string
          node_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_assessment_quizzes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          assessment_method: string | null
          created_at: string
          description: string | null
          document_id: string
          id: string
          last_reviewed: string | null
          level: number
          name: string
          parent_id: string | null
          position: number
          prerequisites: string[] | null
          review_count: number | null
          subject_id: string
          understanding_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_method?: string | null
          created_at?: string
          description?: string | null
          document_id: string
          id?: string
          last_reviewed?: string | null
          level?: number
          name: string
          parent_id?: string | null
          position?: number
          prerequisites?: string[] | null
          review_count?: number | null
          subject_id: string
          understanding_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_method?: string | null
          created_at?: string
          description?: string | null
          document_id?: string
          id?: string
          last_reviewed?: string | null
          level?: number
          name?: string
          parent_id?: string | null
          position?: number
          prerequisites?: string[] | null
          review_count?: number | null
          subject_id?: string
          understanding_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      missed_questions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          last_reviewed: string | null
          mastered: boolean | null
          node_id: string | null
          quiz_item_id: string
          review_count: number | null
          source_quote: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean | null
          node_id?: string | null
          quiz_item_id: string
          review_count?: number | null
          source_quote: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean | null
          node_id?: string | null
          quiz_item_id?: string
          review_count?: number | null
          source_quote?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missed_questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_questions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_questions_quiz_item_id_fkey"
            columns: ["quiz_item_id"]
            isOneToOne: false
            referencedRelation: "quiz_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          quiz_item_id: string
          time_spent: number | null
          user_answer: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          quiz_item_id: string
          time_spent?: number | null
          user_answer: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          quiz_item_id?: string
          time_spent?: number | null
          user_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_item_id_fkey"
            columns: ["quiz_item_id"]
            isOneToOne: false
            referencedRelation: "quiz_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_item_nodes: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          node_id: string
          quiz_item_id: string
          relevance_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          node_id: string
          quiz_item_id: string
          relevance_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          node_id?: string
          quiz_item_id?: string
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_item_nodes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_item_nodes_quiz_item_id_fkey"
            columns: ["quiz_item_id"]
            isOneToOne: false
            referencedRelation: "quiz_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_items: {
        Row: {
          acceptable_answers: Json | null
          blanks: Json | null
          correct_answer: string
          correct_pairs: Json | null
          created_at: string
          difficulty: string | null
          document_id: string
          explanation: string | null
          hint: string | null
          id: string
          is_assessment: boolean | null
          left_items: Json | null
          options: Json | null
          page_reference: number | null
          question: string
          question_type: string
          quiz_set_id: string
          right_items: Json | null
          source_quote: string | null
          template: string | null
        }
        Insert: {
          acceptable_answers?: Json | null
          blanks?: Json | null
          correct_answer: string
          correct_pairs?: Json | null
          created_at?: string
          difficulty?: string | null
          document_id: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_assessment?: boolean | null
          left_items?: Json | null
          options?: Json | null
          page_reference?: number | null
          question: string
          question_type: string
          quiz_set_id: string
          right_items?: Json | null
          source_quote?: string | null
          template?: string | null
        }
        Update: {
          acceptable_answers?: Json | null
          blanks?: Json | null
          correct_answer?: string
          correct_pairs?: Json | null
          created_at?: string
          difficulty?: string | null
          document_id?: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_assessment?: boolean | null
          left_items?: Json | null
          options?: Json | null
          page_reference?: number | null
          question?: string
          question_type?: string
          quiz_set_id?: string
          right_items?: Json | null
          source_quote?: string | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_items_quiz_set_id_fkey"
            columns: ["quiz_set_id"]
            isOneToOne: false
            referencedRelation: "quiz_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          created_at: string | null
          current_question_index: number | null
          document_id: string | null
          id: string
          last_updated: string | null
          question_results: Json | null
          quiz_set_id: string | null
          quiz_type: string | null
          show_results: boolean | null
          status: string | null
          time_completed: string | null
          time_started: string | null
          total_questions: number | null
          user_answers: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_question_index?: number | null
          document_id?: string | null
          id?: string
          last_updated?: string | null
          question_results?: Json | null
          quiz_set_id?: string | null
          quiz_type?: string | null
          show_results?: boolean | null
          status?: string | null
          time_completed?: string | null
          time_started?: string | null
          total_questions?: number | null
          user_answers?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_question_index?: number | null
          document_id?: string | null
          id?: string
          last_updated?: string | null
          question_results?: Json | null
          quiz_set_id?: string | null
          quiz_type?: string | null
          show_results?: boolean | null
          status?: string | null
          time_completed?: string | null
          time_started?: string | null
          total_questions?: number | null
          user_answers?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_set_id_fkey"
            columns: ["quiz_set_id"]
            isOneToOne: false
            referencedRelation: "quiz_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_set_items: {
        Row: {
          created_at: string | null
          id: string
          order_position: number
          quiz_item_id: string
          quiz_set_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_position?: number
          quiz_item_id: string
          quiz_set_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_position?: number
          quiz_item_id?: string
          quiz_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_set_items_quiz_item_id_fkey"
            columns: ["quiz_item_id"]
            isOneToOne: false
            referencedRelation: "quiz_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_set_items_quiz_set_id_fkey"
            columns: ["quiz_set_id"]
            isOneToOne: false
            referencedRelation: "quiz_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sets: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_distribution: Json | null
          document_id: string
          generation_method: string | null
          id: string
          name: string
          node_focus: Json | null
          question_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_distribution?: Json | null
          document_id: string
          generation_method?: string | null
          id?: string
          name: string
          node_focus?: Json | null
          question_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_distribution?: Json | null
          document_id?: string
          generation_method?: string | null
          id?: string
          name?: string
          node_focus?: Json | null
          question_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guide_pages: {
        Row: {
          created_at: string | null
          difficulty_level: string | null
          id: string
          key_concepts: string[] | null
          learning_objectives: string[] | null
          original_content: string | null
          page_content: string
          page_number: number
          page_title: string | null
          prerequisites: string[] | null
          study_guide_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          key_concepts?: string[] | null
          learning_objectives?: string[] | null
          original_content?: string | null
          page_content: string
          page_number: number
          page_title?: string | null
          prerequisites?: string[] | null
          study_guide_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          key_concepts?: string[] | null
          learning_objectives?: string[] | null
          original_content?: string | null
          page_content?: string
          page_number?: number
          page_title?: string | null
          prerequisites?: string[] | null
          study_guide_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_guide_pages_study_guide_id_fkey"
            columns: ["study_guide_id"]
            isOneToOne: false
            referencedRelation: "study_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          created_at: string
          document_id: string
          document_title: string | null
          generation_method: string | null
          id: string
          known_concepts: string[] | null
          total_pages: number | null
          unknown_concepts: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          document_title?: string | null
          generation_method?: string | null
          id?: string
          known_concepts?: string[] | null
          total_pages?: number | null
          unknown_concepts?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          document_title?: string | null
          generation_method?: string | null
          id?: string
          known_concepts?: string[] | null
          total_pages?: number | null
          unknown_concepts?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          exam_date: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          exam_date?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          exam_date?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_activity_heatmap: {
        Args: { days?: number; p_user_id: string }
        Returns: {
          activity_date: string
          correct_rate: number
          quiz_count: number
          study_time: number
        }[]
      }
      get_documents_with_progress: {
        Args: { p_user_id: string }
        Returns: {
          completed_nodes: number
          created_at: string
          file_path: string
          id: string
          node_count: number
          page_count: number
          progress: number
          status: string
          subject_color: string
          subject_id: string
          subject_name: string
          title: string
          updated_at: string
        }[]
      }
      get_subjects_with_progress: {
        Args: { p_user_id: string }
        Returns: {
          color: string
          completed_nodes: number
          created_at: string
          description: string
          documents_processing: number
          exam_date: string
          id: string
          incomplete_nodes: number
          last_activity: string
          name: string
          node_count: number
          progress: number
          total_documents: number
          updated_at: string
        }[]
      }
      get_system_status: {
        Args: { p_user_id: string }
        Returns: {
          completed_documents: number
          failed_documents: number
          last_activity: string
          processing_documents: number
          total_documents: number
          total_quiz_attempts: number
          total_subjects: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never