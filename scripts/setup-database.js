const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../supabase/all-migrations.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by statements (rough split by semicolons and newlines)
    const statements = sqlContent
      .split(';\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s.endsWith(';') ? s : s + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement 
        });
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          // Continue with next statement for non-critical errors
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Exception in statement ${i + 1}:`, err.message);
      }
    }
    
    // Test by querying tables
    console.log('\nVerifying setup...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Tables created:', tables?.map(t => t.table_name) || []);
    }
    
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', '00000000-0000-0000-0000-000000000000');
    
    if (subjectsError) {
      console.error('Error checking subjects:', subjectsError);
    } else {
      console.log('Demo subjects created:', subjects?.length || 0);
    }
    
    console.log('\n✅ Database setup completed!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();