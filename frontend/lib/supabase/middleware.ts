import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 모든 라우트에 대해 자유로운 접근 허용
  return NextResponse.next({
    request,
  })
}