'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationBar() {
  const pathname = usePathname()

  return (
    <div className="fixed bg-white h-[65px] left-0 top-0 w-full z-50 border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto relative h-full px-4 md:px-0">
        {/* Logo and Welcome */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 md:left-[46px] flex items-center gap-[13px] h-full">
          <div className="text-[#212529] text-[17.398px] font-semibold">
            Commit
          </div>
          <div className="w-px h-[9.5px] border-l border-gray-300"></div>
          <div className="hidden md:block text-[#94aac0] text-[12px] font-normal">
            환영합니다, Taehee님
          </div>
        </div>

        {/* Mobile Navigation (scrollable) */}
        <div className="absolute inset-y-0 left-0 right-0 flex md:hidden items-center justify-center px-16">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap">
            <Link 
              href="/" 
              className={`text-[15px] font-semibold cursor-pointer ${pathname === '/' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
            >
              Main
            </Link>
            <Link 
              href="/subjects" 
              className={`text-[15px] font-semibold cursor-pointer ${pathname === '/subjects' || pathname.startsWith('/subjects/') ? 'text-[#212529]' : 'text-[#94aac0]'}`}
            >
              My Course
            </Link>
            <Link 
              href="/progress" 
              className={`text-[15px] font-semibold cursor-pointer ${pathname === '/progress' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
            >
              자료별 진행률
            </Link>
            <Link 
              href="/commits" 
              className={`text-[15px] font-semibold cursor-pointer ${pathname === '/commits' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
            >
              내커밋 한눈에 보기
            </Link>
          </div>
        </div>

        {/* Center Navigation */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-[60px]">
          <Link 
            href="/" 
            className={`text-[17.398px] font-semibold cursor-pointer ${pathname === '/' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
          >
            Main
          </Link>
          <Link 
            href="/subjects" 
            className={`text-[17.398px] font-semibold cursor-pointer ${pathname === '/subjects' || pathname.startsWith('/subjects/') ? 'text-[#212529]' : 'text-[#94aac0]'}`}
          >
            My Course
          </Link>
          <Link 
            href="/progress" 
            className={`text-[17.398px] font-semibold cursor-pointer ${pathname === '/progress' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
          >
            자료별 진행률
          </Link>
          <Link 
            href="/commits" 
            className={`text-[17.398px] font-semibold cursor-pointer ${pathname === '/commits' ? 'text-[#212529]' : 'text-[#94aac0]'}`}
          >
            내커밋 한눈에 보기
          </Link>
        </div>

        {/* Profile */}
        <div className="hidden md:block absolute right-[46px] top-2 w-[50px] h-[50px] rounded-[10px] border border-[#e5e5e5] overflow-hidden bg-white">
          <img 
            src="data:image/png;base64,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"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  )
}