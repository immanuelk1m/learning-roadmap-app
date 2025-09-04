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

  // Polar 설정 (빈 값 입력 시 공백으로 저장됩니다)
  const polarOrgId = await question('Polar Organization ID (optional): ');
  const polarAccessToken = await question('Polar Access Token (optional): ');
  const polarWebhookSecret = await question('Polar Webhook Secret (optional): ');
  const polarServer = await question('Polar Server (sandbox|production, default sandbox): ');
  const polarProProductId = await question('Polar Pro Product ID (optional): ');
  const polarSuccessUrl = await question('Polar Success URL (optional): ');

  const envContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}

# Gemini API
GEMINI_API_KEY=${geminiKey}

# Polar
POLAR_ORGANIZATION_ID=${polarOrgId}
POLAR_ACCESS_TOKEN=${polarAccessToken}
POLAR_WEBHOOK_SECRET=${polarWebhookSecret}
POLAR_SERVER=${polarServer || 'sandbox'}
POLAR_PRO_PRODUCT_ID=${polarProProductId}
POLAR_SUCCESS_URL=${polarSuccessUrl}
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