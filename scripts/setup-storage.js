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

async function setupStorage() {
  try {
    console.log('Setting up Supabase Storage...')

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const documentsBucket = buckets?.find(bucket => bucket.name === 'documents')
    
    if (!documentsBucket) {
      console.log('Creating documents bucket...')
      
      const { data, error: createError } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf']
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        return
      }
      
      console.log('✓ Documents bucket created successfully')
    } else {
      console.log('✓ Documents bucket already exists')
    }

    // Note: Storage policies need to be set up manually in Supabase Dashboard
    // or through SQL commands in the Supabase SQL editor
    console.log('\n⚠️  Important: Please set up storage policies in Supabase Dashboard')
    console.log('Go to Storage > Policies and add the following policies:')
    console.log('1. Public Read Access')
    console.log('2. Public Upload Access')
    console.log('3. Public Update Access')
    console.log('4. Public Delete Access')
    console.log('\nRefer to STORAGE_SETUP.md for detailed instructions')

  } catch (error) {
    console.error('Setup error:', error)
  }
}

setupStorage()