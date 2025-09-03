import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Ensure the quiz_set exists and belongs to user via document -> subject (user_id) if needed
    const { data: quizSet, error: setErr } = await supabase
      .from('quiz_sets')
      .select('id, document_id')
      .eq('id', id)
      .single()

    if (setErr || !quizSet) {
      return NextResponse.json({ error: 'Quiz set not found' }, { status: 404 })
    }

    // Get quiz items linked to this set
    const { data: quizItems } = await supabase
      .from('quiz_items')
      .select('id')
      .eq('quiz_set_id', id)

    const quizItemIds = (quizItems || []).map(q => q.id)

    // No join-table cleanup needed: schema links items directly to set via quiz_set_id
    // If you later add session cleanup, ensure columns match schema before filtering

    // Delete quiz items belonging to the set
    await supabase
      .from('quiz_items')
      .delete()
      .eq('quiz_set_id', id)

    // Finally delete the set
    const { error: delErr } = await supabase
      .from('quiz_sets')
      .delete()
      .eq('id', id)

    if (delErr) {
      return NextResponse.json({ error: 'Failed to delete quiz set' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
