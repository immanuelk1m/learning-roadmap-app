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
  const isOnboardingPage = pathname === '/onboarding'
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<{ name?: string | null; email?: string | null; avatar_url?: string | null } | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [usageSummary, setUsageSummary] = useState<{ pdf_pages_remaining: number; pdf_pages_limit: number; quiz_sets_remaining: number; quiz_set_creation_limit: number } | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCodes, setInviteCodes] = useState<Array<{ code: string; use_count: number; max_uses: number; active: boolean; created_at: string }>>([])
  const [availableSlots, setAvailableSlots] = useState<number>(0)
  const usableInviteCount = inviteCodes.filter((c) => (c.active) && ((c.use_count ?? 0) < (c.max_uses ?? 1))).length
  const baseName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
  const displayName = account?.name || baseName || '게스트'
  const avatarUrl = account?.avatar_url ||
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.profile_image || null

  useEffect(() => {
    if (!isOpen) return
    // Prevent background scroll only on smaller screens
    const isLarge = typeof window !== 'undefined' && window.innerWidth >= 1440
    if (isLarge) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // Auto-open drawer on large screens (>= 1440px), otherwise close
  useEffect(() => {
    const applyByWidth = () => {
      if (typeof window === 'undefined') return
      const large = window.innerWidth >= 1440
      setIsLargeScreen(large)
    }
    applyByWidth()
    window.addEventListener('resize', applyByWidth)
    return () => window.removeEventListener('resize', applyByWidth)
  }, [])

  // Invite codes load helper
  const loadInviteCodes = async () => {
    try {
      setInviteLoading(true)
      const res = await fetch('/api/invite/my', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setInviteCodes(Array.isArray(json.codes) ? json.codes : [])
      setAvailableSlots(typeof json.availableSlots === 'number' ? json.availableSlots : 0)
    } catch {
      setInviteCodes([])
      setAvailableSlots(0)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleOpenInviteModal = async () => {
    setInviteModalOpen(true)
    await loadInviteCodes()
  }

  const handleCreateInviteCode = async () => {
    try {
      setInviteLoading(true)
      const res = await fetch('/api/invite/create', { method: 'POST' })
      if (res.status === 409) {
        // limit reached; just reload to update state
        await loadInviteCodes()
        return
      }
      if (!res.ok) throw new Error('failed')
      await loadInviteCodes()
    } catch {
      // no-op
    } finally {
      setInviteLoading(false)
    }
  }

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

  // Check active subscription (PRO) status for current user
  useEffect(() => {
    const checkPro = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth.user?.id
        if (!uid) { setIsPro(false); return }
        const { data, error } = await (supabase as any)
          .from('subscriptions')
          .select('status,current_period_end,cancel_at_period_end')
          .eq('user_id', uid)
        if (error || !data) { setIsPro(false); return }
        const now = Date.now()
        const active = (data as any[]).some((row) => {
          if (row.status !== 'active') return false
          if (row.cancel_at_period_end) return false
          if (row.current_period_end) {
            const until = new Date(row.current_period_end).getTime()
            if (Number.isFinite(until) && until <= now) return false
          }
          return true
        })
        setIsPro(active)
      } catch {
        setIsPro(false)
      }
    }
    checkPro()
  }, [])

  // Load usage summary
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth.user?.id
        if (!uid) { setUsageSummary(null); return }
        const { data, error } = await (supabase as any)
          .rpc('get_user_usage_summary', { p_user_id: uid })
        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data
          setUsageSummary(row || null)
        }
      } catch {}
    }
    loadUsage()
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
      <div className={`fixed bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 h-[65px] left-0 top-0 w-full z-[10000] border-b border-gray-100 transition-all duration-300 ${
        isOpen ? 'pl-72' : 'pl-0'
      }`}>
        {/* Desktop: Absolute-positioned hamburger at far left of the navbar (outside centered container) */}
        {!isOnboardingPage && !isOpen && (
          <button
            type="button"
            aria-label="메뉴 열기"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <div className="relative max-w-[1200px] mx-auto h-full px-4 md:px-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex h-full items-center justify-between">
            {/* Left Section spacer (icon moved to absolute far-left on desktop) */}
            <div className="w-10 h-10" />

            {/* Right Section: Auth buttons */}
            <div className="flex items-center gap-3">
              {!isHomePage && !isOnboardingPage && (
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
          {(isAssessmentPage || isQuizPage || isHomePage || isOnboardingPage) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {(isHomePage || isOnboardingPage) ? (
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
            {/* Left: Hamburger Menu - Shown only when drawer is closed (open state handled inside drawer) */}
            {isOnboardingPage ? (
              <div className="w-10 h-10" />
            ) : (
              !isOpen ? (
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
              )
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
            {(isAssessmentPage || isQuizPage || isHomePage || isOnboardingPage) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {(isHomePage || isOnboardingPage) ? (
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
      {!isOnboardingPage && (
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl transition-transform duration-300 z-[11000] ${
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
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                onClick={async () => { const next = !userMenuOpen; setUserMenuOpen(next); if (next) { await loadInviteCodes() } }}
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
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</div>
                    {isPro ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">PRO</span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-semibold">STARTER</span>
                    )}
                  </div>
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
                  <button
                    onClick={() => { setUserMenuOpen(false); handleOpenInviteModal() }}
                    className="w-full text-left px-3 py-2 text-[14px] text-gray-800 hover:bg-gray-50 rounded-md flex items-center justify-between"
                  >
                    <span>친구 초대</span>
                    <span className="inline-flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${usableInviteCount > 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                      <span className="text-[11px] text-gray-500">{usableInviteCount > 0 ? '사용 가능' : '사용 불가능'}</span>
                    </span>
                  </button>
                  <Link
                    href="/pricing"
                    onClick={() => { setUserMenuOpen(false); setIsOpen(false) }}
                    className="block px-3 py-2 text-[14px] text-gray-800 hover:bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>요금제</span>
                      {usageSummary && (
                        <span className="text-[11px] text-gray-500">
                          PDF {usageSummary.pdf_pages_remaining}/{usageSummary.pdf_pages_limit} · 퀴즈 {usageSummary.quiz_sets_remaining}/{usageSummary.quiz_set_creation_limit}
                        </span>
                      )}
                    </div>
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
      )}

      {/* Click outside to close - only on mobile or when drawer is open */}
      {!isOnboardingPage && isOpen && !isLargeScreen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setInviteModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-gray-900">친구 초대</div>
              <button onClick={() => setInviteModalOpen(false)} className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">보유 코드:
                <span className="ml-2 inline-flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${usableInviteCount > 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <span className="text-gray-800 font-medium">{Math.max(5 - availableSlots, 0)} / 5</span>
                </span>
              </div>
            </div>
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">코드</th>
                    <th className="text-left px-3 py-2">상태</th>
                    <th className="text-right px-3 py-2">복사</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteCodes.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">코드가 없습니다.</td></tr>
                  ) : inviteCodes.map((c) => {
                    const usedUp = (c.use_count ?? 0) >= (c.max_uses ?? 1)
                    return (
                      <tr key={c.code} className="border-t">
                        <td className="px-3 py-2 font-mono text-[13px] text-gray-900">{c.code}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-2 ${usedUp || !c.active ? 'text-red-600' : 'text-emerald-700'}`}>
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${usedUp || !c.active ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            {usedUp ? '사용 완료' : (c.active ? '사용 가능' : '비활성')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={async () => { try { await navigator.clipboard.writeText(c.code) } catch {} }}
                            className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                          >복사</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
