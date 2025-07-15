import React from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with mermaid
const MermaidDiagram = dynamic(() => import('@/components/ui/MermaidDiagram'), {
  ssr: false,
  loading: () => <div className="bg-gray-100 rounded-lg p-4 my-4 animate-pulse h-64" />
})

// 웹에서 사용할 마크다운 파서
export function parseMarkdownToReact(content: string): React.ReactElement[] {
  const lines = content.split('\n')
  const elements: React.ReactElement[] = []
  let currentParagraph: string[] = []
  
  function processParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        elements.push(
          <p key={elements.length} className="text-gray-700 mb-3 leading-relaxed">
            {renderInlineMarkdown(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }
  
  function renderInlineMarkdown(text: string): (string | React.ReactElement)[] {
    const parts: (string | React.ReactElement)[] = []
    let lastIndex = 0
    
    // Regex for bold, italic, code, and links
    const regex = /\*\*(.*?)\*\*|\*(.*?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      if (match[1]) {
        // Bold
        parts.push(<strong key={`bold-${parts.length}`} className="font-bold">{match[1]}</strong>)
      } else if (match[2]) {
        // Italic
        parts.push(<em key={`italic-${parts.length}`} className="italic">{match[2]}</em>)
      } else if (match[3]) {
        // Inline code
        parts.push(
          <code key={`code-${parts.length}`} className="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">
            {match[3]}
          </code>
        )
      } else if (match[4]) {
        // Link
        parts.push(
          <a key={`link-${parts.length}`} href={match[5]} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {match[4]}
          </a>
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }
  
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeBlockLanguage = ''
  let inList = false
  let listItems: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Check if it's a mermaid block
        if (codeBlockLanguage === 'mermaid') {
          elements.push(
            <MermaidDiagram 
              key={elements.length} 
              chart={codeBlockLines.join('\n')} 
            />
          )
        } else {
          elements.push(
            <pre key={elements.length} className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code className="text-sm font-mono">{codeBlockLines.join('\n')}</code>
            </pre>
          )
        }
        codeBlockLines = []
        codeBlockLanguage = ''
        inCodeBlock = false
      } else {
        processParagraph()
        if (inList) {
          processListItems()
          inList = false
        }
        inCodeBlock = true
        // Extract language from ```language
        const langMatch = line.match(/^```(\w+)?/)
        codeBlockLanguage = langMatch?.[1] || ''
      }
      continue
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }
    
    // Headers
    if (line.match(/^#{1,6}\s+/)) {
      processParagraph()
      if (inList) {
        processListItems()
        inList = false
      }
      
      const level = line.match(/^#+/)?.[0].length || 1
      const text = line.replace(/^#+\s*/, '')
      
      if (level === 1) {
        elements.push(
          <h2 key={elements.length} className="text-2xl font-bold text-gray-900 mb-4 mt-6 border-b pb-2">
            {renderInlineMarkdown(text)}
          </h2>
        )
      } else if (level === 2) {
        elements.push(
          <h3 key={elements.length} className="text-xl font-bold text-gray-900 mb-3 mt-5">
            {renderInlineMarkdown(text)}
          </h3>
        )
      } else if (level === 3) {
        elements.push(
          <h4 key={elements.length} className="text-lg font-semibold text-gray-800 mb-2 mt-4">
            {renderInlineMarkdown(text)}
          </h4>
        )
      } else if (level === 4) {
        elements.push(
          <h5 key={elements.length} className="text-base font-medium text-gray-700 mb-2 mt-3">
            {renderInlineMarkdown(text)}
          </h5>
        )
      } else {
        elements.push(
          <h6 key={elements.length} className="text-sm font-medium text-gray-600 mb-2 mt-2">
            {renderInlineMarkdown(text)}
          </h6>
        )
      }
    }
    // Lists
    else if (line.match(/^[\s]*[-*+]\s+(.*)$/) || line.match(/^[\s]*\d+\.\s+(.*)$/)) {
      processParagraph()
      
      if (!inList) {
        inList = true
        listItems = []
      }
      
      const isOrdered = !!line.match(/^[\s]*\d+\.\s+(.*)$/)
      const content = line.match(/^[\s]*[-*+\d]+\.?\s+(.*)$/)?.[1] || ''
      listItems.push(content)
      
      // Check if next line is not a list item
      if (i === lines.length - 1 || !lines[i + 1].match(/^[\s]*[-*+\d]+\.?\s+/)) {
        processListItems(isOrdered)
        inList = false
      }
    }
    // Blockquote
    else if (line.startsWith('>')) {
      processParagraph()
      if (inList) {
        processListItems()
        inList = false
      }
      
      const quotedText = line.substring(1).trim()
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic text-gray-700 bg-blue-50">
          {renderInlineMarkdown(quotedText)}
        </blockquote>
      )
    }
    // Horizontal rule
    else if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      processParagraph()
      if (inList) {
        processListItems()
        inList = false
      }
      elements.push(<hr key={elements.length} className="my-6 border-gray-300" />)
    }
    // Empty line
    else if (line.trim() === '') {
      processParagraph()
      if (inList) {
        processListItems()
        inList = false
      }
    }
    // Regular text
    else {
      if (inList) {
        processListItems()
        inList = false
      }
      currentParagraph.push(line)
    }
  }
  
  // Process any remaining content
  processParagraph()
  if (inList) {
    processListItems()
  }
  
  function processListItems(ordered = false) {
    if (listItems.length > 0) {
      const ListTag = ordered ? 'ol' : 'ul'
      const listClass = ordered 
        ? "list-decimal list-inside mb-4 space-y-1" 
        : "list-disc list-inside mb-4 space-y-1"
      
      elements.push(
        <ListTag key={elements.length} className={listClass}>
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ListTag>
      )
      listItems = []
    }
  }
  
  return elements
}