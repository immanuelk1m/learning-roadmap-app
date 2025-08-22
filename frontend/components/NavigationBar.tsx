'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavigationBar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [isOpen])

  return (
    <div className="fixed bg-white h-[65px] left-0 top-0 w-full z-[10000] border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto h-full px-4 md:px-0 flex items-center relative">
        {/* Mobile: Hamburger button (left) */}
        <button
          type="button"
          aria-label="메뉴 열기"
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700"
          onClick={() => setIsOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Mobile: Center logo (absolute) / Desktop: Left logo + welcome */}
        <div className="absolute left-1/2 transform -translate-x-1/2 md:relative md:left-0 md:transform-none md:flex-initial flex items-center justify-center md:justify-start">
          <div className="flex items-center gap-[13px] flex-shrink-0">
            <div className="text-[#212529] text-[17.398px] font-semibold">Commit</div>
            <div className="hidden md:block w-px h-[9.5px] border-l border-gray-300" />
            <div className="hidden md:block text-[#94aac0] text-[12px] font-normal max-w-[120px] sm:max-w-[200px] truncate">환영합니다, Taehee님</div>
          </div>
        </div>

        {/* Desktop: Center navigation */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-6 md:gap-[60px] overflow-x-auto whitespace-nowrap">
            <Link href="/" className={`text-[15px] md:text-[17.398px] font-semibold cursor-pointer ${pathname === '/' ? 'text-[#212529]' : 'text-[#94aac0]'}`}>Main</Link>
            <Link href="/subjects" className={`text-[15px] md:text-[17.398px] font-semibold cursor-pointer ${pathname === '/subjects' || pathname.startsWith('/subjects/') ? 'text-[#212529]' : 'text-[#94aac0]'}`}>My Course</Link>
            <Link href="/progress" className={`text-[15px] md:text-[17.398px] font-semibold cursor-pointer ${pathname === '/progress' ? 'text-[#212529]' : 'text-[#94aac0]'}`}>자료별 진행률</Link>
            <Link href="/commits" className={`text-[15px] md:text-[17.398px] font-semibold cursor-pointer ${pathname === '/commits' ? 'text-[#212529]' : 'text-[#94aac0]'}`}>내커밋 한눈에 보기</Link>
          </div>
        </div>

        {/* Desktop: Profile */}
        <div className="hidden md:block w-[50px] h-[50px] rounded-[10px] border border-[#e5e5e5] overflow-hidden bg-white flex-shrink-0">
          <img 
            src="data:image/png;base64,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"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Drawer and Backdrop */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ zIndex: 11000 }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ zIndex: 12000 }}
        aria-label="모바일 네비게이션"
      >
        <div className="h-[65px] flex items-center justify-between px-4 border-b">
          <span className="text-[#212529] font-semibold">메뉴</span>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200"
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-3">
          <Link onClick={() => setIsOpen(false)} href="/" className={`py-2 px-2 rounded-md ${pathname === '/' ? 'text-[#212529] font-semibold' : 'text-[#94aac0]'}`}>Main</Link>
          <Link onClick={() => setIsOpen(false)} href="/subjects" className={`py-2 px-2 rounded-md ${pathname === '/subjects' || pathname.startsWith('/subjects/') ? 'text-[#212529] font-semibold' : 'text-[#94aac0]'}`}>My Course</Link>
          <Link onClick={() => setIsOpen(false)} href="/progress" className={`py-2 px-2 rounded-md ${pathname === '/progress' ? 'text-[#212529] font-semibold' : 'text-[#94aac0]'}`}>자료별 진행률</Link>
          <Link onClick={() => setIsOpen(false)} href="/commits" className={`py-2 px-2 rounded-md ${pathname === '/commits' ? 'text-[#212529] font-semibold' : 'text-[#94aac0]'}`}>내커밋 한눈에 보기</Link>
        </nav>
      </aside>
    </div>
  )
}