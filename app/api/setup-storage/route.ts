import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  try {
    const supabase = createServiceClient()

    // Create pdf-documents bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets()
    
    const documentsBucket = buckets?.find(bucket => bucket.name === 'pdf-documents')
    
    if (!documentsBucket) {
      const { error: createError } = await supabase.storage.createBucket('pdf-documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf']
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
      } else {
        console.log('PDF Documents bucket created successfully')
      }
    }

    // Set up storage policies
    const policies = [
      {
        name: 'Public Access',
        definition: `
          CREATE POLICY "Public Access" ON storage.objects
          FOR SELECT TO public
          USING (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'Authenticated users can upload',
        definition: `
          CREATE POLICY "Authenticated users can upload" ON storage.objects
          FOR INSERT TO public
          WITH CHECK (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'Users can update own files',
        definition: `
          CREATE POLICY "Users can update own files" ON storage.objects
          FOR UPDATE TO public
          USING (bucket_id = 'pdf-documents')
          WITH CHECK (bucket_id = 'pdf-documents');
        `
      },
      {
        name: 'Users can delete own files',
        definition: `
          CREATE POLICY "Users can delete own files" ON storage.objects
          FOR DELETE TO public
          USING (bucket_id = 'pdf-documents');
        `
      }
    ]

    // Apply policies
    for (const policy of policies) {
      try {
        await supabase.rpc('exec_sql', {
          sql: policy.definition
        })
        console.log(`Policy "${policy.name}" created`)
      } catch (error) {
        console.log(`Policy "${policy.name}" might already exist`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Storage setup completed'
    })
  } catch (error: any) {
    console.error('Setup storage error:', error)
    return NextResponse.json(
      { error: 'Failed to setup storage', details: error.message },
      { status: 500 }
    )
  }
}