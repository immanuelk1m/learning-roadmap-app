'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface NavigationBarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function NavigationBar({ isOpen, setIsOpen }: NavigationBarProps) {
  const pathname = usePathname()

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
    <>
      {/* Navigation Bar */}
      <div className={`fixed bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 h-[65px] left-0 top-0 w-full z-[10000] border-b border-gray-100 transition-transform duration-300 ${
        isOpen ? 'translate-x-72' : 'translate-x-0'
      }`}>
        <div className="max-w-[1200px] mx-auto h-full px-4 md:px-6">
          {/* Desktop Layout */}
          <div className="hidden md:flex h-full items-center justify-between">
            {/* Left Section: Hamburger Menu */}
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

            {/* Right Section: Logo + Welcome */}
            <div className="flex items-center gap-4">
              <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
              <div className="w-px h-5 bg-gray-300" />
              <div className="text-[#94aac0] text-[13px] font-normal">환영합니다, Taehee님</div>
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

            {/* Right: Logo */}
            <div className="text-[#212529] text-[18px] font-semibold">Commit</div>
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
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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