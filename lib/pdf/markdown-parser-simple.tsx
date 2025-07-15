import React from 'react'
import { Text, View, Link, StyleSheet } from '@react-pdf/renderer'

// Simple markdown parser for React PDF
export function parseAndRenderMarkdown(content: string, customStyles?: any): any {
  const lines = content.split('\n')
  const elements: any[] = []
  let currentParagraph: string[] = []
  
  const styles = StyleSheet.create({
    h1: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
      color: '#1f2937',
    },
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
      color: '#1f2937',
    },
    h3: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 6,
      color: '#374151',
    },
    h4: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 4,
      color: '#374151',
    },
    paragraph: {
      fontSize: 11,
      marginBottom: 10,
      lineHeight: 1.8,
      color: '#4b5563',
    },
    bold: {
      fontWeight: 'bold',
      fontFamily: 'NotoSansKR',  // Default font family
    },
    italic: {
      fontStyle: 'italic' as const,
      fontFamily: 'NotoSansKR',  // Default font family
    },
    code: {
      fontFamily: 'Courier',
      backgroundColor: '#f3f4f6',
      fontSize: 10,
    },
    codeBlock: {
      fontFamily: 'Courier',
      backgroundColor: '#f8f9fa',
      padding: 12,
      marginVertical: 10,
      fontSize: 10,
      lineHeight: 1.5,
      borderLeft: '3 solid #e5e7eb',
    },
    listItem: {
      flexDirection: 'row' as const,
      marginBottom: 4,
    },
    listBullet: {
      width: 20,
      fontSize: 11,
      color: '#6b7280',
    },
    listContent: {
      flex: 1,
      fontSize: 11,
      lineHeight: 1.8,
      color: '#4b5563',
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: '#3b82f6',
      paddingLeft: 15,
      marginVertical: 10,
      backgroundColor: '#f0f9ff',
      padding: 12,
      fontStyle: 'italic',
      color: '#1e40af',
    },
    link: {
      color: '#3b82f6',
      textDecoration: 'underline' as const,
    },
  })
  
  // Apply custom styles
  const finalStyles = { ...styles, ...customStyles }
  
  function processParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        elements.push(
          <View key={elements.length} style={finalStyles.paragraph}>
            <Text>{renderInlineMarkdown(text)}</Text>
          </View>
        )
      }
      currentParagraph = []
    }
  }
  
  function renderInlineMarkdown(text: string): any {
    const parts: any[] = []
    let lastIndex = 0
    
    // Simple regex for bold, italic, and code
    const regex = /\*\*(.*?)\*\*|\*(.*?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      if (match[1]) {
        // Bold
        parts.push(<Text key={parts.length} style={finalStyles.bold}>{match[1]}</Text>)
      } else if (match[2]) {
        // Italic
        parts.push(<Text key={parts.length} style={finalStyles.italic}>{match[2]}</Text>)
      } else if (match[3]) {
        // Inline code
        parts.push(<Text key={parts.length} style={finalStyles.code}>{match[3]}</Text>)
      } else if (match[4]) {
        // Link
        parts.push(<Link key={parts.length} src={match[5]} style={finalStyles.link}>{match[4]}</Link>)
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }
  
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeBlockLanguage = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // For mermaid blocks in PDF, show as styled code block with a note
        if (codeBlockLanguage === 'mermaid') {
          elements.push(
            <View key={elements.length} style={finalStyles.codeBlock}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#4f46e5' }}>
                [Mermaid Diagram - View in Web Version]
              </Text>
              <Text style={{ fontSize: 9 }}>{codeBlockLines.join('\n')}</Text>
            </View>
          )
        } else {
          elements.push(
            <View key={elements.length} style={finalStyles.codeBlock}>
              <Text>{codeBlockLines.join('\n')}</Text>
            </View>
          )
        }
        codeBlockLines = []
        codeBlockLanguage = ''
        inCodeBlock = false
      } else {
        processParagraph()
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
    if (line.startsWith('# ')) {
      processParagraph()
      elements.push(
        <Text key={elements.length} style={finalStyles.h1}>
          {renderInlineMarkdown(line.substring(2))}
        </Text>
      )
    } else if (line.startsWith('## ')) {
      processParagraph()
      elements.push(
        <Text key={elements.length} style={finalStyles.h2}>
          {renderInlineMarkdown(line.substring(3))}
        </Text>
      )
    } else if (line.startsWith('### ')) {
      processParagraph()
      elements.push(
        <Text key={elements.length} style={finalStyles.h3}>
          {renderInlineMarkdown(line.substring(4))}
        </Text>
      )
    } else if (line.startsWith('#### ')) {
      processParagraph()
      elements.push(
        <Text key={elements.length} style={finalStyles.h4}>
          {renderInlineMarkdown(line.substring(5))}
        </Text>
      )
    }
    // Lists
    else if (line.match(/^[-*+]\s+(.*)$/)) {
      processParagraph()
      const content = line.match(/^[-*+]\s+(.*)$/)![1]
      elements.push(
        <View key={elements.length} style={finalStyles.listItem}>
          <Text style={finalStyles.listBullet}>•</Text>
          <View style={finalStyles.listContent}>
            <Text>{renderInlineMarkdown(content)}</Text>
          </View>
        </View>
      )
    }
    // Blockquote
    else if (line.startsWith('>')) {
      processParagraph()
      const quotedText = line.substring(1).trim()
      elements.push(
        <View key={elements.length} style={finalStyles.blockquote}>
          <Text>{renderInlineMarkdown(quotedText)}</Text>
        </View>
      )
    }
    // Empty line
    else if (line.trim() === '') {
      processParagraph()
    }
    // Regular text
    else {
      currentParagraph.push(line)
    }
  }
  
  // Process any remaining paragraph
  processParagraph()
  
  return elements
}