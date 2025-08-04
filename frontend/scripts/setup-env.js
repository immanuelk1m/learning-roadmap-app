#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('🚀 AI PDF 학습 서비스 환경 설정\n');

  const supabaseUrl = await question('Supabase URL (https://xxx.supabase.co): ');
  const supabaseKey = await question('Supabase Anon Key: ');
  const geminiKey = await question('Gemini API Key: ');

  const envContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}

# Gemini API
GEMINI_API_KEY=${geminiKey}
`;

  const envPath = path.join(__dirname, '..', '.env.local');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env.local 파일이 생성되었습니다!');
  console.log('\n다음 단계:');
  console.log('1. Supabase 대시보드에서 SQL 스키마 실행');
  console.log('2. vercel 명령어로 배포 시작');
  
  rl.close();
}

setup().catch(console.error);