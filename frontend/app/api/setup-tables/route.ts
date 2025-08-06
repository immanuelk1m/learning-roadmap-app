import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Create knowledge_nodes table
    const { error: knowledgeNodesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS knowledge_nodes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          parent_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          level INTEGER NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          prerequisites TEXT[] DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_document ON knowledge_nodes(document_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_parent ON knowledge_nodes(parent_id);
      `
    })

    if (knowledgeNodesError) {
      console.error('Error creating knowledge_nodes table:', knowledgeNodesError)
    }

    // Create user_knowledge_status table
    const { error: userStatusError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_knowledge_status (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
          status TEXT CHECK (status IN ('known', 'unclear', 'unknown')) DEFAULT 'unknown',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, node_id)
        );

        CREATE INDEX IF NOT EXISTS idx_user_knowledge_status_user ON user_knowledge_status(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_knowledge_status_node ON user_knowledge_status(node_id);
      `
    })

    if (userStatusError) {
      console.error('Error creating user_knowledge_status table:', userStatusError)
    }

    // Create quiz_items table with extended structure
    const { error: quizItemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS quiz_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          node_id UUID REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
          question TEXT NOT NULL,
          question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_in_blank', 'matching')) DEFAULT 'multiple_choice',
          options JSONB,
          correct_answer TEXT,
          acceptable_answers JSONB,
          template TEXT,
          blanks JSONB,
          left_items JSONB,
          right_items JSONB,
          correct_pairs JSONB,
          explanation TEXT,
          source_quote TEXT,
          difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
          hint TEXT,
          is_assessment BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_items_document ON quiz_items(document_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_items_node ON quiz_items(node_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_items_assessment ON quiz_items(is_assessment);
      `
    })

    if (quizItemsError) {
      console.error('Error creating quiz_items table:', quizItemsError)
    }

    // Create missed_questions table
    const { error: missedQuestionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS missed_questions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          quiz_item_id UUID REFERENCES quiz_items(id) ON DELETE CASCADE,
          source_quote TEXT NOT NULL,
          attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, quiz_item_id)
        );

        CREATE INDEX IF NOT EXISTS idx_missed_questions_user ON missed_questions(user_id);
        CREATE INDEX IF NOT EXISTS idx_missed_questions_quiz ON missed_questions(quiz_item_id);
      `
    })

    if (missedQuestionsError) {
      console.error('Error creating missed_questions table:', missedQuestionsError)
    }

    // Create quiz_attempts table
    const { error: quizAttemptsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          quiz_item_id UUID REFERENCES quiz_items(id) ON DELETE CASCADE,
          user_answer TEXT NOT NULL,
          is_correct BOOLEAN NOT NULL,
          time_spent INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_item_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_item_id);
      `
    })

    if (quizAttemptsError) {
      console.error('Error creating quiz_attempts table:', quizAttemptsError)
    }

    // Create quiz_sessions table for persistent state
    const { error: quizSessionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS quiz_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          quiz_type TEXT CHECK (quiz_type IN ('practice', 'assessment', 'missed_questions')) DEFAULT 'practice',
          status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
          current_question_index INTEGER DEFAULT 0,
          total_questions INTEGER DEFAULT 0,
          user_answers JSONB DEFAULT '{}',
          question_results JSONB DEFAULT '{}',
          show_results BOOLEAN DEFAULT FALSE,
          time_started TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          time_completed TIMESTAMP WITH TIME ZONE,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_sessions_document ON quiz_sessions(document_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_document ON quiz_sessions(user_id, document_id, status);
      `
    })

    if (quizSessionsError) {
      console.error('Error creating quiz_sessions table:', quizSessionsError)
    }

    // Update user_knowledge_status table to add missing columns
    const { error: updateKnowledgeStatusError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_knowledge_status 
        ADD COLUMN IF NOT EXISTS understanding_level INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS assessment_method TEXT DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
      `
    })

    if (updateKnowledgeStatusError) {
      console.error('Error updating user_knowledge_status table:', updateKnowledgeStatusError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tables created successfully'
    })
  } catch (error: any) {
    console.error('Setup tables error:', error)
    return NextResponse.json(
      { error: 'Failed to create tables', details: error.message },
      { status: 500 }
    )
  }
}