'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationBar() {
  const pathname = usePathname()

  return (
    <nav 
      className="bg-white h-[65px] flex items-center justify-between px-[46px] border-b border-gray-200"
    >
      {/* Logo and Welcome */}
      <div className="flex items-center gap-[13px]">
        <div className="text-[#212529] text-[17.398px] font-semibold">
          Commit
        </div>
        <div className="w-0 h-[9.5px] border-l border-gray-300"></div>
        <div className="text-[#94aac0] text-[12px] font-bold">
          환영합니다, Taehee님
        </div>
      </div>

      {/* Center Navigation */}
      <div className="flex items-center gap-[60px]">
        <Link 
          href="/" 
          className={`text-[17.398px] font-semibold ${pathname === '/' ? 'text-[#212529]' : 'text-[#94aac0]'} no-underline`}
        >
          Main
        </Link>
        <Link 
          href="/my-course" 
          className={`text-[17.398px] font-semibold ${pathname === '/my-course' ? 'text-[#212529]' : 'text-[#94aac0]'} no-underline`}
        >
          My Course
        </Link>
        <Link 
          href="/progress" 
          className={`text-[17.398px] font-semibold ${pathname === '/progress' ? 'text-[#212529]' : 'text-[#94aac0]'} no-underline`}
        >
          과목별 진행률
        </Link>
        <Link 
          href="/commits" 
          className={`text-[17.398px] font-semibold ${pathname === '/commits' ? 'text-[#212529]' : 'text-[#94aac0]'} no-underline`}
        >
          내커밋 한눈에 보기
        </Link>
      </div>

      {/* Profile */}
      <div className="w-[50px] h-[50px] rounded-[10px] border border-[#004d47] overflow-hidden">
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#004d47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="#004d47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </nav>
  )
}