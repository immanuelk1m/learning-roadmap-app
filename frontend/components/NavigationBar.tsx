'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-8 right-8 z-50">
      <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-2 shadow-lg">
        <Link
          href="/"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            pathname === '/' 
              ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          홈
        </Link>
        <Link
          href="/subjects"
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            pathname === '/subjects' 
              ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          과목 목록
        </Link>
      </div>
    </nav>
  )
}