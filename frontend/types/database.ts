export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      quiz_sessions: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          quiz_type: string | null
          status: string | null
          current_question_index: number | null
          total_questions: number | null
          user_answers: Json | null
          question_results: Json | null
          show_results: boolean | null
          time_started: string | null
          time_completed: string | null
          last_updated: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          quiz_type?: string | null
          status?: string | null
          current_question_index?: number | null
          total_questions?: number | null
          user_answers?: Json | null
          question_results?: Json | null
          show_results?: boolean | null
          time_started?: string | null
          time_completed?: string | null
          last_updated?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          quiz_type?: string | null
          status?: string | null
          current_question_index?: number | null
          total_questions?: number | null
          user_answers?: Json | null
          question_results?: Json | null
          show_results?: boolean | null
          time_started?: string | null
          time_completed?: string | null
          last_updated?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
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
          node_id: string | null
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
          node_id?: string | null
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
          node_id?: string | null
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
            foreignKeyName: "quiz_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
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
      quiz_sets: {
        Row: {
          created_at: string
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
          user_id: string | null
        }
        Insert: {
          created_at?: string
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
          user_id?: string | null
        }
        Update: {
          created_at?: string
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
          user_id?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
        Args: { days: number; p_user_id: string }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
