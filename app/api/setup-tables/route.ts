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

    // Create quiz_items table
    const { error: quizItemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS quiz_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          node_id UUID REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
          question TEXT NOT NULL,
          options TEXT[] NOT NULL,
          correct_answer TEXT NOT NULL,
          explanation TEXT NOT NULL,
          source_quote TEXT NOT NULL,
          difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_items_document ON quiz_items(document_id);
        CREATE INDEX IF NOT EXISTS idx_quiz_items_node ON quiz_items(node_id);
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