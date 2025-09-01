'use client'

import Link from 'next/link'
import Image from 'next/image'
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
    <div className="fixed bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 h-[65px] left-0 top-0 w-full z-[10000] border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto h-full px-4 md:px-6">
        {/* Desktop Layout - 3단 구조 */}
        <div className="hidden md:flex h-full items-center justify-between">
          {/* Left Section: Logo + Welcome */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
            <div className="w-px h-5 bg-gray-300" />
            <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, Taehee님</div>
          </div>

          {/* Center Section: Navigation */}
          <nav className="flex items-center gap-12">
            <Link 
              href="/" 
              className={`text-[16px] font-semibold transition-colors ${
                pathname === '/' ? 'text-[#212529]' : 'text-[#94aac0] hover:text-[#212529]'
              }`}
            >
              Main
            </Link>
            <Link 
              href="/subjects" 
              className={`text-[16px] font-semibold transition-colors ${
                pathname === '/subjects' || pathname.startsWith('/subjects/') 
                  ? 'text-[#212529]' 
                  : 'text-[#94aac0] hover:text-[#212529]'
              }`}
            >
              My Course
            </Link>
            <Link 
              href="/mypage" 
              className={`text-[16px] font-semibold transition-colors ${
                pathname === '/mypage' ? 'text-[#212529]' : 'text-[#94aac0] hover:text-[#212529]'
              }`}
            >
              마이페이지
            </Link>
          </nav>

          {/* Right Section: Profile */}
          <div className="w-[40px] h-[40px] rounded-[10px] border border-gray-200 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
            <Image 
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden h-full items-center justify-between">
          {/* Left: Hamburger Menu */}
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

          {/* Center: Logo */}
          <div className="text-[#212529] text-[18px] font-semibold">Commit</div>

          {/* Right: Placeholder for balance */}
          <div className="w-10 h-10" />
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
          <Link onClick={() => setIsOpen(false)} href="/mypage" className={`py-2 px-2 rounded-md ${pathname === '/mypage' ? 'text-[#212529] font-semibold' : 'text-[#94aac0]'}`}>마이페이지</Link>
        </nav>
      </aside>
    </div>
  )
}