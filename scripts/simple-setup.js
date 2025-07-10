const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // First try to create a simple test subject
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: 'Test Subject',
        description: 'Testing database connection',
        color: '#3B82F6',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select();
    
    if (error) {
      console.log('Error details:', JSON.stringify(error, null, 2));
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('❌ Tables do not exist yet');
        console.log('Please run the SQL from /supabase/all-migrations.sql in Supabase SQL Editor');
        return false;
      } else if (error.code === '42501') {
        console.log('❌ Permission denied - RLS may be blocking access');
        console.log('Please run the SQL from /supabase/all-migrations.sql in Supabase SQL Editor');
        return false;
      } else {
        console.error('Database error:', error);
        return false;
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('✅ Tables exist and are accessible');
      console.log('Test subject created:', data);
      return true;
    }
  } catch (err) {
    console.error('Connection failed:', err.message);
    return false;
  }
}

async function verifySetup() {
  console.log('Verifying database setup...');
  
  try {
    // Check if subjects table exists and has data
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', '00000000-0000-0000-0000-000000000000');
    
    if (subjectsError) {
      console.error('Error checking subjects:', subjectsError);
      return false;
    }
    
    console.log(`✅ Found ${subjects?.length || 0} demo subjects`);
    
    // Try to create a new subject to test insert functionality
    const { data: newSubject, error: insertError } = await supabase
      .from('subjects')
      .insert({
        name: 'API Test Subject',
        description: 'Created via API',
        color: '#10B981',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating test subject:', insertError);
      return false;
    }
    
    console.log('✅ Successfully created test subject:', newSubject);
    
    // Clean up test subject
    await supabase
      .from('subjects')
      .delete()
      .eq('id', newSubject.id);
    
    console.log('✅ Database setup is working correctly!');
    return true;
    
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database setup verification...\n');
  
  const connected = await testConnection();
  if (connected) {
    await verifySetup();
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. If tables don\'t exist, run the SQL from /supabase/all-migrations.sql in Supabase SQL Editor');
  console.log('2. If everything works, your app should now be able to create subjects!');
}

main();