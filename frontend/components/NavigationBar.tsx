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
  const [account, setAccount] = useState<{ name?: string | null; email?: string | null; avatar_url?: string | null } | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const baseName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
  const displayName = account?.name || baseName || '게스트'
  const avatarUrl = account?.avatar_url ||
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.profile_image || null

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
        // load subjects for current user (auth required)
        const { data: userRes } = await supabase.auth.getUser()
        const uid = userRes.user?.id
        const { data } = uid ? await supabase
          .from('subjects')
          .select('id, name')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
        : { data: [] as any[] }
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

  // Load extended account info from auth.users via server API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (json?.user) {
          setAccount({ name: json.user.name, email: json.user.email, avatar_url: json.user.avatar_url })
        } else {
          setAccount(null)
        }
      } catch {}
    }
    load()
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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // First-time signups land on onboarding to complete survey
        redirectTo: origin ? `${origin}/onboarding` : undefined,
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
                  <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, {displayName}</div>
                </div>
              )}
              {user ? null : (
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
                  <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, {displayName}</div>
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
            {user ? null : (
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
                    <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, {displayName}</div>
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
        
        <nav className="p-4 pb-24 flex flex-col gap-2 bg-white">
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
        {/* Bottom: Current account info */}
        <div className="absolute bottom-0 left-0 w-full border-t border-gray-200 bg-white/95 p-3">
          {user ? (
            <div className="relative">
              <button
                className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-md p-2 text-left"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                {avatarUrl ? (
                  // Avatar image from auth user metadata
                  <img
                    src={avatarUrl}
                    alt="profile"
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  // Fallback initials avatar
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold border border-gray-200">
                    {(displayName || 'G')?.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</div>
                  <div className="text-[12px] text-gray-500 truncate">{account?.email || user?.email}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-14 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-[10001]">
                  <div className="px-3 py-2 text-[12px] text-gray-500 truncate border-b border-gray-100">
                    {account?.email || user?.email}
                  </div>
                  <Link
                    href="/upgrade"
                    onClick={() => { setUserMenuOpen(false); setIsOpen(false) }}
                    className="block px-3 py-2 text-[14px] text-gray-800 hover:bg-gray-50 rounded-md"
                  >
                    플랜 업그레이드
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => { setUserMenuOpen(false); setIsOpen(false) }}
                    className="block px-3 py-2 text-[14px] text-gray-800 hover:bg-gray-50 rounded-md"
                  >
                    도움말
                  </Link>
                  <button
                    onClick={async () => { setUserMenuOpen(false); await handleSignOut(); setIsOpen(false) }}
                    className="w-full text-left px-3 py-2 text-[14px] text-gray-800 hover:bg-gray-50 rounded-md"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-semibold border border-gray-200">
                  ?
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-900">로그인이 필요합니다</div>
                  <div className="text-[12px] text-gray-500">계정으로 시작하세요</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoogleLogin}
                  className="px-2.5 py-1 text-[12px] rounded-md bg-[#2f332f] text-white hover:bg-black"
                >
                  로그인
                </button>
                <button
                  onClick={handleGoogleSignup}
                  className="px-2.5 py-1 text-[12px] rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  회원가입
                </button>
              </div>
            </div>
          )}
        </div>
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
