import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface KnowledgeNode {
  id: string
  document_id: string
  parent_id: string | null
  name: string
  level: number
  position: number
  prerequisites: string[] | null
}

async function migrateKnowledgeNodes() {
  console.log('🚀 Starting knowledge nodes migration...')
  
  try {
    // 1. 모든 문서 가져오기
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title')
    
    if (docError) {
      console.error('❌ Failed to fetch documents:', docError)
      return
    }
    
    console.log(`📄 Found ${documents?.length || 0} documents`)
    
    // 2. 각 문서별로 knowledge_nodes 처리
    for (const doc of documents || []) {
      console.log(`\n📘 Processing document: ${doc.title} (${doc.id})`)
      
      // 해당 문서의 모든 노드 가져오기
      const { data: nodes, error: nodesError } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', doc.id)
        .order('level', { ascending: true })
        .order('position', { ascending: true })
      
      if (nodesError) {
        console.error(`❌ Failed to fetch nodes for document ${doc.id}:`, nodesError)
        continue
      }
      
      if (!nodes || nodes.length === 0) {
        console.log(`⚠️  No nodes found for document ${doc.title}`)
        continue
      }
      
      console.log(`  Found ${nodes.length} nodes`)
      
      // 3. level별로 그룹화
      const nodesByLevel: Record<number, KnowledgeNode[]> = {}
      nodes.forEach((node: KnowledgeNode) => {
        const level = node.level || 1
        if (!nodesByLevel[level]) {
          nodesByLevel[level] = []
        }
        nodesByLevel[level].push(node)
      })
      
      const levels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b)
      console.log(`  Levels found: ${levels.join(', ')}`)
      
      // 4. parent_id 매핑 생성
      const parentMapping: Record<string, string> = {}
      let updateCount = 0
      
      for (const level of levels) {
        const levelNodes = nodesByLevel[level]
        console.log(`  Processing level ${level}: ${levelNodes.length} nodes`)
        
        if (level === 1) {
          // Level 1 노드는 parent_id가 null이어야 함
          for (const node of levelNodes) {
            if (node.parent_id !== null) {
              const { error } = await supabase
                .from('knowledge_nodes')
                .update({ parent_id: null })
                .eq('id', node.id)
              
              if (error) {
                console.error(`    ❌ Failed to update node ${node.name}:`, error)
              } else {
                console.log(`    ✅ Set parent_id to null for level 1 node: ${node.name}`)
                updateCount++
              }
            }
          }
        } else {
          // Level 2+ 노드는 이전 레벨에서 부모를 찾아야 함
          const parentLevel = level - 1
          const parentNodes = nodesByLevel[parentLevel] || []
          
          if (parentNodes.length === 0) {
            console.log(`    ⚠️  No parent nodes found for level ${level}`)
            continue
          }
          
          for (const node of levelNodes) {
            // 가장 가까운 position의 부모 노드 찾기
            let bestParent = parentNodes[0]
            let minDistance = Math.abs(node.position - parentNodes[0].position)
            
            for (const parentNode of parentNodes) {
              const distance = Math.abs(node.position - parentNode.position)
              if (distance < minDistance) {
                minDistance = distance
                bestParent = parentNode
              }
            }
            
            if (node.parent_id !== bestParent.id) {
              const { error } = await supabase
                .from('knowledge_nodes')
                .update({ parent_id: bestParent.id })
                .eq('id', node.id)
              
              if (error) {
                console.error(`    ❌ Failed to update node ${node.name}:`, error)
              } else {
                console.log(`    ✅ Set parent ${bestParent.name} for node: ${node.name}`)
                updateCount++
              }
            }
          }
        }
      }
      
      console.log(`  📊 Updated ${updateCount} nodes for document ${doc.title}`)
    }
    
    console.log('\n✨ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// 실행
migrateKnowledgeNodes()