'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavigationBarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function NavigationBar({ isOpen, setIsOpen }: NavigationBarProps) {
  const pathname = usePathname()
  const isAssessmentPage = !!pathname && /^\/subjects\/[^/]+\/study\/assessment$/.test(pathname)
  const isQuizPage = !!pathname && /^\/subjects\/[^/]+\/quiz$/.test(pathname)
  const isHomePage = pathname === '/'
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [isOpen])

  // Load user's subjects for drawer submenu
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })
        setSubjects(data || [])
      } catch (e) {
        console.warn('Failed to load subjects for drawer', e)
      }
    }
    fetchSubjects()
  }, [])

  // Auth state (Google OAuth via Supabase)
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleGoogleLogin = async () => {
    const target = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
        // Try to let user pick account when logging in
        queryParams: { prompt: 'select_account' }
      }
    })
  }

  const handleGoogleSignup = async () => {
    const target = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
        // Ensure consent screen for first-time signup
        queryParams: { prompt: 'consent' }
      }
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // keep drawer state
  }

  return (
    <>
      {/* Navigation Bar */}
      <div className={`fixed bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 h-[65px] left-0 top-0 w-full z-[10000] border-b border-gray-100 transition-transform duration-300 ${
        isOpen ? 'translate-x-72' : 'translate-x-0'
      }`}>
        <div className="relative max-w-[1200px] mx-auto h-full px-4 md:px-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex h-full items-center justify-between">
            {/* Left Section: Hamburger Menu - Hide when drawer is open */}
            {!isOpen ? (
              <button
                type="button"
                aria-label="메뉴 열기"
                className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}

            {/* Right Section: Auth buttons */}
            <div className="flex items-center gap-3">
              {!isHomePage && (
                <div className="hidden xl:flex items-center gap-4">
                  <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
                  <div className="w-px h-5 bg-gray-300" />
                  <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, Taehee님</div>
                </div>
              )}
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-[13px] rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  로그아웃
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGoogleLogin}
                    className="px-3 py-1.5 text-[13px] rounded-md bg-[#2f332f] text-white hover:bg-black"
                  >
                    로그인
                  </button>
                  <button
                    onClick={handleGoogleSignup}
                    className="px-3 py-1.5 text-[13px] rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    회원가입
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center Title (Assessment page only) */}
          {(isAssessmentPage || isQuizPage || isHomePage) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isHomePage ? (
                <div className="flex items-center gap-4">
                  <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
                  <div className="w-px h-5 bg-gray-300" />
                  <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, Taehee님</div>
                </div>
              ) : (
                <span className="text-[15px] font-semibold text-gray-900">{isAssessmentPage ? '학습 전 배경지식 체크' : '연습문제 - '}</span>
              )}
            </div>
          )}

          {/* Mobile Layout */}
          <div className="relative flex md:hidden h-full items-center justify-between">
            {/* Left: Hamburger Menu - Hide when drawer is open */}
            {!isOpen ? (
              <button
                type="button"
                aria-label="메뉴 열기"
                className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700"
                onClick={() => setIsOpen(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}

            {/* Right: Logo */}
            <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="ml-auto px-3 py-1.5 text-[12px] rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                로그아웃
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleGoogleLogin}
                  className="px-3 py-1.5 text-[12px] rounded-md bg-[#2f332f] text-white hover:bg-black"
                >
                  로그인
                </button>
                <button
                  onClick={handleGoogleSignup}
                  className="px-3 py-1.5 text-[12px] rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  회원가입
                </button>
              </div>
            )}

            {/* Mobile Center Title (Assessment page only) */}
            {(isAssessmentPage || isQuizPage || isHomePage) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isHomePage ? (
                  <div className="flex items-center gap-4">
                    <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
                    <div className="w-px h-5 bg-gray-300" />
                    <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, Taehee님</div>
                  </div>
                ) : (
                  <span className="text-[15px] font-semibold text-gray-900">{isAssessmentPage ? '학습 전 배경지식 체크' : '연습문제 - '}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Panel - Fixed position but appears to push content */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl transition-transform duration-300 z-[9999] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#ffffff' }}
        aria-label="네비게이션 메뉴"
      >
        <div className="h-[65px] flex items-center justify-between px-4 border-b border-gray-200 bg-white">
          <span className="text-[#212529] font-semibold text-lg">메뉴</span>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-2 bg-white">
          <Link 
            onClick={() => setIsOpen(false)} 
            href="/" 
            className={`py-3 px-4 rounded-md transition-colors ${
              pathname === '/' 
                ? 'bg-gray-100 text-[#212529] font-semibold' 
                : 'text-[#94aac0] hover:bg-gray-50 hover:text-[#212529]'
            }`}
          >
            Main
          </Link>
          {/* My Course with always-visible subject list */}
          <Link 
            onClick={() => setIsOpen(false)} 
            href="/subjects" 
            className={`py-3 px-4 rounded-md transition-colors ${
              pathname === '/subjects' || pathname.startsWith('/subjects/') 
                ? 'bg-gray-100 text-[#212529] font-semibold' 
                : 'text-[#94aac0] hover:bg-gray-50 hover:text-[#212529]'
            }`}
          >
            My Course
          </Link>
          <div id="drawer-subjects" className="ml-2 pl-2 border-l border-gray-200 flex flex-col gap-1">
            <Link
              onClick={() => setIsOpen(false)}
              href="/subjects"
              className={`py-2 px-3 rounded-md text-sm transition-colors ${
                pathname === '/subjects' ? 'bg-gray-100 text-[#212529] font-semibold' : 'text-[#7b8a9a] hover:bg-gray-50 hover:text-[#212529]'
              }`}
            >
              전체 과목 보기
            </Link>
            {subjects.map((s) => (
              <Link
                key={s.id}
                onClick={() => setIsOpen(false)}
                href={`/subjects/${s.id}`}
                className={`py-2 px-3 rounded-md text-sm truncate transition-colors ${
                  pathname === `/subjects/${s.id}` ? 'bg-gray-100 text-[#212529] font-semibold' : 'text-[#7b8a9a] hover:bg-gray-50 hover:text-[#212529]'
                }`}
                title={s.name}
              >
                {s.name}
              </Link>
            ))}
          </div>
          <Link 
            onClick={() => setIsOpen(false)} 
            href="/mypage" 
            className={`py-3 px-4 rounded-md transition-colors ${
              pathname === '/mypage' 
                ? 'bg-gray-100 text-[#212529] font-semibold' 
                : 'text-[#94aac0] hover:bg-gray-50 hover:text-[#212529]'
            }`}
          >
            마이페이지
          </Link>
        </nav>
      </aside>

      {/* Click outside to close - only on mobile or when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
