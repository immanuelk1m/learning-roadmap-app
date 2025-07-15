import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer'
import { parseAndRenderMarkdown } from '@/lib/pdf/markdown-parser-simple'

// Register Korean font
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/fonts-archive/NotoSansKR/NotoSansKR-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/fonts-archive/NotoSansKR/NotoSansKR-Bold.ttf', fontWeight: 'bold' },
  ]
})

// Register Bold font separately for better support
Font.register({
  family: 'NotoSansKR-Bold',
  src: 'https://cdn.jsdelivr.net/gh/fonts-archive/NotoSansKR/NotoSansKR-Bold.ttf'
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansKR',
    fontSize: 11,
    lineHeight: 1.8,
    backgroundColor: '#ffffff',
  },
  
  // Cover page styles
  coverPage: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 20,
    color: '#374151',
    marginBottom: 50,
    textAlign: 'center',
  },
  coverMeta: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  coverStats: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    width: '80%',
  },
  
  // Table of contents styles
  tocPage: {
    padding: 50,
  },
  tocTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1f2937',
  },
  tocItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  tocLevel0: {
    marginLeft: 0,
    fontWeight: 'bold',
    fontSize: 13,
  },
  tocLevel1: {
    marginLeft: 20,
    fontSize: 12,
  },
  tocLevel2: {
    marginLeft: 40,
    fontSize: 11,
    color: '#6b7280',
  },
  tocDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    marginTop: 3,
  },
  tocText: {
    flex: 1,
  },
  
  // Concept page styles
  conceptPage: {
    padding: 40,
  },
  conceptHeader: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #e5e7eb',
  },
  conceptTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  conceptLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
  },
  knownBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  unclearBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  unknownBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  
  // Content sections
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  paragraph: {
    marginBottom: 10,
    color: '#4b5563',
    textAlign: 'justify',
  },
  
  // Prerequisites
  prerequisiteBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 6,
    marginBottom: 10,
  },
  prerequisiteItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  prerequisiteText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 5,
  },
  
  // Key points
  keyPointBox: {
    backgroundColor: '#eff6ff',
    borderLeft: '4 solid #3b82f6',
    padding: 15,
    marginVertical: 10,
  },
  keyPointText: {
    color: '#1e40af',
    fontSize: 11,
    fontStyle: 'italic',
  },
  
  // Markdown content container
  markdownContent: {
    marginVertical: 5,
  },
  
  // Override markdown styles for PDF
  markdownOverrides: {
    paragraph: {
      fontFamily: 'NotoSansKR',
      fontSize: 11,
      lineHeight: 1.8,
      color: '#4b5563',
      marginBottom: 10,
    },
    bold: {
      fontFamily: 'NotoSansKR-Bold',
      fontWeight: undefined,  // Remove default fontWeight to avoid conflicts
    },
    code: {
      fontFamily: 'Courier',
      backgroundColor: '#f3f4f6',
      paddingHorizontal: 4,
      paddingVertical: 2,
      fontSize: 10,
      borderRadius: 2,
    },
    codeBlock: {
      fontFamily: 'Courier',
      backgroundColor: '#f8f9fa',
      padding: 12,
      marginVertical: 10,
      borderRadius: 4,
      fontSize: 10,
      lineHeight: 1.5,
      borderLeft: '3 solid #e5e7eb',
    },
    link: {
      color: '#3b82f6',
      textDecoration: 'underline',
      fontSize: 11,
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
  },
  
  // Tips
  tipBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 12,
    marginVertical: 10,
  },
  tipTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 10,
    color: '#78350f',
  },
  
  // Page footer
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
})

interface KnowledgeNode {
  id: string
  document_id: string
  parent_id: string | null
  name: string
  description: string | null
  level: number
  position: number
  prerequisites: string[]
}

interface UserStatus {
  node_id: string
  status: 'known' | 'unclear' | 'unknown'
  understanding_level: number
}

interface StudyGuidePDFProps {
  studyGuide: {
    content: string
    known_concepts: string[]
    unknown_concepts: string[]
    created_at: string
    updated_at: string
  }
  documentName: string
  knowledgeNodes: KnowledgeNode[]
  userStatusMap: Map<string, UserStatus>
}

export default function StudyGuidePDF({ 
  studyGuide, 
  documentName, 
  knowledgeNodes,
  userStatusMap 
}: StudyGuidePDFProps) {
  
  // Helper function to get status color
  const getStatusColor = (nodeId: string) => {
    const status = userStatusMap.get(nodeId)
    if (!status) return styles.unknownBadge
    if (status.understanding_level >= 80) return styles.knownBadge
    if (status.understanding_level >= 50) return styles.unclearBadge
    return styles.unknownBadge
  }
  
  // Helper function to get status text
  const getStatusText = (nodeId: string) => {
    const status = userStatusMap.get(nodeId)
    if (!status) return '학습 필요'
    if (status.understanding_level >= 80) return '잘 알고 있어요'
    if (status.understanding_level >= 50) return '조금 더 공부가 필요해요'
    return '새로 배워야 해요'
  }
  
  // Build node tree structure
  const buildNodeTree = () => {
    const nodeMap = new Map(knowledgeNodes.map(node => [node.id, node]))
    const rootNodes: KnowledgeNode[] = []
    
    knowledgeNodes.forEach(node => {
      if (!node.parent_id) {
        rootNodes.push(node)
      }
    })
    
    return { nodeMap, rootNodes }
  }
  
  const { nodeMap, rootNodes } = buildNodeTree()
  
  // Get children of a node
  const getChildren = (nodeId: string) => {
    return knowledgeNodes.filter(node => node.parent_id === nodeId)
  }
  
  // Parse study guide content to extract concept-specific explanations
  const parseStudyGuideContent = () => {
    const conceptExplanations = new Map<string, string>()
    const lines = studyGuide.content.split('\n')
    let currentConcept = ''
    let currentExplanation: string[] = []
    let inConceptSection = false
    
    lines.forEach((line, index) => {
      // Check if this line is a concept header (### or #### format)
      const headerMatch = line.match(/^(#{3,4})\s+(.+)$/)
      if (headerMatch && !headerMatch[2].includes('[')) {
        // Save previous concept if exists
        if (currentConcept && currentExplanation.length > 0) {
          conceptExplanations.set(currentConcept, currentExplanation.join('\n').trim())
        }
        // Start new concept
        currentConcept = headerMatch[2].trim()
        currentExplanation = []
        inConceptSection = true
      } else if (line.match(/^#{1,2}\s+/)) {
        // Higher level header, end current concept section
        if (currentConcept && currentExplanation.length > 0) {
          conceptExplanations.set(currentConcept, currentExplanation.join('\n').trim())
        }
        currentConcept = ''
        currentExplanation = []
        inConceptSection = false
      } else if (inConceptSection) {
        // Add to current concept explanation (including empty lines for proper formatting)
        currentExplanation.push(line)
      }
    })
    
    // Save last concept
    if (currentConcept && currentExplanation.length > 0) {
      conceptExplanations.set(currentConcept, currentExplanation.join('\n').trim())
    }
    
    return conceptExplanations
  }
  
  const conceptExplanations = parseStudyGuideContent()
  
  // Generate user-friendly explanation based on understanding level
  const generateExplanation = (node: KnowledgeNode) => {
    const status = userStatusMap.get(node.id)
    const understandingLevel = status?.understanding_level || 0
    const customExplanation = conceptExplanations.get(node.name)
    
    let baseExplanation = ''
    if (understandingLevel >= 80) {
      baseExplanation = `이미 잘 알고 계신 개념이네요! ${node.name}은(는) ${node.description || ''}.`
    } else if (understandingLevel >= 50) {
      baseExplanation = `거의 다 왔어요! ${node.name}은(는) ${node.description || ''}. 핵심은 이해하고 계시지만, 조금만 더 보완하면 완벽하게 마스터할 수 있을 거예요.`
    } else {
      baseExplanation = `새롭게 배울 개념이에요. ${node.name}은(는) ${node.description || ''}. 차근차근 설명드릴게요.`
    }
    
    // Add custom explanation from study guide if available
    if (customExplanation) {
      return `${baseExplanation}\n\n${customExplanation}`
    }
    
    return baseExplanation
  }
  
  // Generate learning tips
  const generateTips = (node: KnowledgeNode) => {
    const status = userStatusMap.get(node.id)
    const understandingLevel = status?.understanding_level || 0
    
    if (understandingLevel >= 80) {
      return "이 개념을 다른 사람에게 설명해보세요. 가르치는 것이 최고의 학습법이에요!"
    } else if (understandingLevel >= 50) {
      return "예제 문제를 풀어보면서 실전 감각을 익혀보세요. 아는 것과 할 수 있는 것은 다르답니다."
    } else {
      return "선수 지식부터 차근차근 복습해보세요. 기초가 탄탄해야 새로운 개념도 쉽게 이해할 수 있어요."
    }
  }
  
  const createdDate = new Date(studyGuide.updated_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={[styles.page, styles.coverPage]}>
        <Text style={styles.coverTitle}>나만의 맞춤 해설집</Text>
        <Text style={styles.coverSubtitle}>{documentName}</Text>
        
        <View style={styles.coverStats}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 15, color: '#1f2937' }}>
            학습 현황 요약
          </Text>
          <Text style={{ marginBottom: 8, color: '#374151' }}>
            📚 전체 개념: {knowledgeNodes.length}개
          </Text>
          <Text style={{ marginBottom: 8, color: '#065f46' }}>
            ✅ 잘 아는 개념: {knowledgeNodes.filter(n => (userStatusMap.get(n.id)?.understanding_level || 0) >= 80).length}개
          </Text>
          <Text style={{ marginBottom: 8, color: '#92400e' }}>
            🤔 애매한 개념: {knowledgeNodes.filter(n => {
              const score = userStatusMap.get(n.id)?.understanding_level || 0
              return score >= 50 && score < 80
            }).length}개
          </Text>
          <Text style={{ color: '#991b1b' }}>
            📖 새로운 개념: {knowledgeNodes.filter(n => (userStatusMap.get(n.id)?.understanding_level || 0) < 50).length}개
          </Text>
        </View>
        
        <Text style={styles.coverMeta}>생성일: {createdDate}</Text>
      </Page>
      
      {/* Table of Contents */}
      <Page size="A4" style={[styles.page, styles.tocPage]}>
        <Text style={styles.tocTitle}>📋 목차</Text>
        
        {rootNodes.map((node, index) => (
          <View key={node.id}>
            <View style={[styles.tocItem, styles.tocLevel0]}>
              <View style={[styles.tocDot, getStatusColor(node.id)]} />
              <Text style={styles.tocText}>
                {index + 1}. {node.name}
              </Text>
            </View>
            
            {getChildren(node.id).map((child, childIndex) => (
              <View key={child.id}>
                <View style={[styles.tocItem, styles.tocLevel1]}>
                  <View style={[styles.tocDot, getStatusColor(child.id)]} />
                  <Text style={styles.tocText}>
                    {index + 1}.{childIndex + 1} {child.name}
                  </Text>
                </View>
                
                {getChildren(child.id).map((grandchild, gcIndex) => (
                  <View key={grandchild.id} style={[styles.tocItem, styles.tocLevel2]}>
                    <View style={[styles.tocDot, getStatusColor(grandchild.id)]} />
                    <Text style={styles.tocText}>
                      {index + 1}.{childIndex + 1}.{gcIndex + 1} {grandchild.name}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </Page>
      
      {/* Concept Pages */}
      {knowledgeNodes.map((node, pageIndex) => (
        <Page key={node.id} size="A4" style={[styles.page, styles.conceptPage]}>
          {/* Header */}
          <View style={styles.conceptHeader}>
            <Text style={styles.conceptTitle}>{node.name}</Text>
            <View style={styles.conceptLevel}>
              <Text style={[styles.levelBadge, getStatusColor(node.id)]}>
                {getStatusText(node.id)}
              </Text>
            </View>
          </View>
          
          {/* Prerequisites */}
          {node.prerequisites && node.prerequisites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text style={styles.sectionIcon}>📚</Text>
                선수 지식
              </Text>
              <View style={styles.prerequisiteBox}>
                {node.prerequisites.map((prereq, idx) => (
                  <View key={idx} style={styles.prerequisiteItem}>
                    <Text style={styles.prerequisiteText}>• {prereq}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Main Explanation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>💡</Text>
              개념 설명
            </Text>
            <View style={styles.markdownContent}>
              {parseAndRenderMarkdown(generateExplanation(node), styles.markdownOverrides)}
            </View>
            
            {/* Key Point */}
            <View style={styles.keyPointBox}>
              <Text style={styles.keyPointText}>
                💎 핵심 포인트: {node.description}
              </Text>
            </View>
          </View>
          
          {/* Related Concepts */}
          {getChildren(node.id).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text style={styles.sectionIcon}>🔗</Text>
                하위 개념들
              </Text>
              {getChildren(node.id).map((child, idx) => (
                <Text key={idx} style={styles.paragraph}>
                  • {child.name}: {child.description || '자세한 내용은 해당 페이지를 참고하세요.'}
                </Text>
              ))}
            </View>
          )}
          
          {/* Learning Tips */}
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 학습 팁</Text>
            <Text style={styles.tipText}>
              {generateTips(node)}
            </Text>
          </View>
          
          {/* Page Footer */}
          <View style={styles.pageFooter}>
            <Text>{documentName}</Text>
            <Text>{pageIndex + 3} / {knowledgeNodes.length + 2}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}