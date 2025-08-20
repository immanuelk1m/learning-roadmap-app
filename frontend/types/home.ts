export interface SubjectWithProgress {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
  exam_date: string | null
  progress: number
  node_count: number
  completed_nodes: number
  last_activity: string | null
  documents_processing: number
  total_documents: number
  incomplete_nodes: number
}

export interface ActivityData {
  activity_date: string
  quiz_count: number
  study_time: number
  correct_rate: number
}

export interface SystemStatus {
  total_documents: number
  processing_documents: number
  completed_documents: number
  failed_documents: number
  last_activity: string | null
  total_quiz_attempts: number
  total_subjects: number
}

export interface TodayRecommendation {
  subject: SubjectWithProgress
  reason: 'lowest_progress' | 'most_recent' | 'exam_soon'
  message: string
}

export interface DocumentWithProgress {
  id: string
  title: string
  subject_id: string
  subject_name: string
  subject_color: string
  status: string
  created_at: string
  updated_at: string
  progress: number
  node_count: number
  completed_nodes: number
  page_count: number | null
  file_path: string
}