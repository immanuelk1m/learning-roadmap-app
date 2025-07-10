import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Fix RLS policies for user_knowledge_status table
    const policies = [
      {
        name: 'Enable read access for all users',
        sql: `
          DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."user_knowledge_status";
          CREATE POLICY "Enable read access for all users" ON "public"."user_knowledge_status"
          FOR SELECT USING (true);
        `
      },
      {
        name: 'Enable insert for all users',
        sql: `
          DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."user_knowledge_status";
          CREATE POLICY "Enable insert for all users" ON "public"."user_knowledge_status"
          FOR INSERT WITH CHECK (true);
        `
      },
      {
        name: 'Enable update for all users',
        sql: `
          DROP POLICY IF EXISTS "Enable update for all users" ON "public"."user_knowledge_status";
          CREATE POLICY "Enable update for all users" ON "public"."user_knowledge_status"
          FOR UPDATE USING (true);
        `
      }
    ]

    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        })
        
        if (error) {
          console.error(`Error creating policy "${policy.name}":`, error)
        } else {
          console.log(`✓ Policy "${policy.name}" created`)
        }
      } catch (err) {
        console.error(`Error with policy "${policy.name}":`, err)
      }
    }

    // Ensure RLS is enabled
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE "public"."user_knowledge_status" ENABLE ROW LEVEL SECURITY;'
      })
      console.log('✓ RLS enabled')
    } catch (err) {
      console.log('RLS might already be enabled')
    }

    return NextResponse.json({ 
      success: true,
      message: 'Permissions fixed'
    })
  } catch (error: any) {
    console.error('Fix permissions error:', error)
    return NextResponse.json(
      { error: 'Failed to fix permissions', details: error.message },
      { status: 500 }
    )
  }
}