import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete all quiz items for this document
    const { error: deleteError } = await supabase
      .from('quiz_items')
      .delete()
      .eq('document_id', documentId)

    if (deleteError) {
      console.error('Error deleting quiz items:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete quiz items', details: deleteError.message },
        { status: 500 }
      )
    }

    // Reset the document's quiz generation status
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        quiz_generation_status: { 
          generated: false, 
          count: 0, 
          last_attempt: null 
        } 
      })
      .eq('id', documentId)
      .eq('user_id', FIXED_USER_ID)

    if (updateError) {
      console.error('Error updating document:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Quiz deleted successfully'
    })
  } catch (error: any) {
    console.error('Quiz deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}