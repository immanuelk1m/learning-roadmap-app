'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ComponentPropsWithoutRef } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headers
        h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 border-b pb-2" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
          <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
          <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-4" {...props}>
            {children}
          </h3>
        ),
        h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
          <h4 className="text-base font-medium text-gray-700 mb-2 mt-3" {...props}>
            {children}
          </h4>
        ),
        
        // Paragraph
        p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
          <p className="text-gray-700 mb-3 leading-relaxed" {...props}>
            {children}
          </p>
        ),
        
        // Bold
        strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
          <strong className="font-bold text-gray-900" {...props}>
            {children}
          </strong>
        ),
        
        // Italic
        em: ({ children, ...props }: ComponentPropsWithoutRef<'em'>) => (
          <em className="italic" {...props}>
            {children}
          </em>
        ),
        
        // Links
        a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        
        // Lists
        ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
          <ul className="list-disc list-inside mb-4 space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
          <ol className="list-decimal list-inside mb-4 space-y-1" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
          <li className="text-gray-700" {...props}>
            {children}
          </li>
        ),
        
        // Code
        code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) => {
          const isBlock = className?.includes('language-')
          
          if (isBlock) {
            return (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-sm font-mono" {...props}>
                  {children}
                </code>
              </pre>
            )
          }
          
          return (
            <code className="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          )
        },
        
        // Blockquote
        blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
          <blockquote 
            className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic text-gray-700 bg-blue-50"
            {...props}
          >
            {children}
          </blockquote>
        ),
        
        // Horizontal Rule
        hr: ({ ...props }: ComponentPropsWithoutRef<'hr'>) => (
          <hr className="my-6 border-gray-300" {...props} />
        ),
        
        // Table
        table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse border border-gray-300" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
          <thead className="bg-gray-100" {...props}>
            {children}
          </thead>
        ),
        tbody: ({ children, ...props }: ComponentPropsWithoutRef<'tbody'>) => (
          <tbody {...props}>
            {children}
          </tbody>
        ),
        tr: ({ children, ...props }: ComponentPropsWithoutRef<'tr'>) => (
          <tr className="border-b border-gray-300" {...props}>
            {children}
          </tr>
        ),
        th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
          <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
          <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props}>
            {children}
          </td>
        ),
        
        // Strikethrough (GFM)
        del: ({ children, ...props }: ComponentPropsWithoutRef<'del'>) => (
          <del className="line-through text-gray-500" {...props}>
            {children}
          </del>
        ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}