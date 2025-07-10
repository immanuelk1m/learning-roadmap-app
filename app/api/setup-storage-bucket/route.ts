import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Create pdf-documents bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 })
    }

    const pdfBucket = buckets?.find(bucket => bucket.name === 'pdf-documents')
    
    if (!pdfBucket) {
      console.log('Creating pdf-documents bucket...')
      const { error: createError } = await supabase.storage.createBucket('pdf-documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf']
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 })
      } else {
        console.log('✓ pdf-documents bucket created successfully')
      }
    } else {
      console.log('✓ pdf-documents bucket already exists')
    }

    // Set up storage policies for pdf-documents bucket
    const policies = [
      {
        name: 'pdf_documents_select_policy',
        sql: `
          DROP POLICY IF EXISTS "pdf_documents_select_policy" ON storage.objects;
          CREATE POLICY "pdf_documents_select_policy" ON storage.objects
          FOR SELECT TO public
          USING (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'pdf_documents_insert_policy',
        sql: `
          DROP POLICY IF EXISTS "pdf_documents_insert_policy" ON storage.objects;
          CREATE POLICY "pdf_documents_insert_policy" ON storage.objects
          FOR INSERT TO public
          WITH CHECK (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'pdf_documents_update_policy',
        sql: `
          DROP POLICY IF EXISTS "pdf_documents_update_policy" ON storage.objects;
          CREATE POLICY "pdf_documents_update_policy" ON storage.objects
          FOR UPDATE TO public
          USING (bucket_id = 'pdf-documents')
          WITH CHECK (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'pdf_documents_delete_policy',
        sql: `
          DROP POLICY IF EXISTS "pdf_documents_delete_policy" ON storage.objects;
          CREATE POLICY "pdf_documents_delete_policy" ON storage.objects
          FOR DELETE TO public
          USING (bucket_id = 'pdf-documents');
        `
      }
    ]

    // Apply policies
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        })
        
        if (error) {
          console.error(`Error creating policy "${policy.name}":`, error)
        } else {
          console.log(`✓ Policy "${policy.name}" applied`)
        }
      } catch (err) {
        console.error(`Error with policy "${policy.name}":`, err)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'PDF documents storage bucket and policies configured successfully'
    })
  } catch (error: any) {
    console.error('Setup storage bucket error:', error)
    return NextResponse.json(
      { error: 'Failed to setup storage bucket', details: error.message },
      { status: 500 }
    )
  }
}