import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTables() {
  try {
    console.log('Creating database tables...')

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
    } else {
      console.log('✓ knowledge_nodes table created')
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
    } else {
      console.log('✓ user_knowledge_status table created')
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
    } else {
      console.log('✓ quiz_items table created')
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
    } else {
      console.log('✓ missed_questions table created')
    }

    // Create study_guides table
    const { error: studyGuidesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS study_guides (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          known_concepts TEXT[] DEFAULT '{}',
          unknown_concepts TEXT[] DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, document_id)
        );

        CREATE INDEX IF NOT EXISTS idx_study_guides_user ON study_guides(user_id);
        CREATE INDEX IF NOT EXISTS idx_study_guides_document ON study_guides(document_id);
      `
    })

    if (studyGuidesError) {
      console.error('Error creating study_guides table:', studyGuidesError)
    } else {
      console.log('✓ study_guides table created')
    }

    console.log('\nAll tables created successfully!')
  } catch (error) {
    console.error('Setup error:', error)
  }
}

setupTables()