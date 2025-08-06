import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function migrateQuizNodes() {
  console.log('Starting quiz node migration...')
  
  try {
    // Get all quiz items without node_id
    const { data: quizItems, error: quizError } = await supabase
      .from('quiz_items')
      .select('*')
      .is('node_id', null)
    
    if (quizError) {
      console.error('Error fetching quiz items:', quizError)
      return
    }
    
    if (!quizItems || quizItems.length === 0) {
      console.log('No quiz items without node_id found')
      return
    }
    
    console.log(`Found ${quizItems.length} quiz items without node_id`)
    
    // Group quiz items by document
    const itemsByDocument: { [key: string]: any[] } = {}
    quizItems.forEach(item => {
      if (!itemsByDocument[item.document_id]) {
        itemsByDocument[item.document_id] = []
      }
      itemsByDocument[item.document_id].push(item)
    })
    
    let totalUpdated = 0
    let totalFailed = 0
    
    // Process each document's items
    for (const [documentId, items] of Object.entries(itemsByDocument)) {
      console.log(`\nProcessing document ${documentId} with ${items.length} items...`)
      
      // Get knowledge nodes for this document
      const { data: nodes, error: nodesError } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', documentId)
      
      if (nodesError || !nodes || nodes.length === 0) {
        console.log(`No nodes found for document ${documentId}, skipping...`)
        continue
      }
      
      console.log(`Found ${nodes.length} nodes for document`)
      
      // Try to match each quiz item to a node
      for (const item of items) {
        const questionLower = item.question.toLowerCase()
        const sourceQuoteLower = (item.source_quote || '').toLowerCase()
        
        // Strategy 1: Direct name match in question
        let matchedNode = nodes.find(node => {
          const nameLower = node.name.toLowerCase()
          return questionLower.includes(nameLower) || 
                 sourceQuoteLower.includes(nameLower)
        })
        
        // Strategy 2: Keyword matching
        if (!matchedNode) {
          // Extract key terms from the question
          const keywords = extractKeywords(item.question)
          
          matchedNode = nodes.find(node => {
            const nameLower = node.name.toLowerCase()
            const descLower = (node.description || '').toLowerCase()
            
            return keywords.some(keyword => 
              nameLower.includes(keyword) || descLower.includes(keyword)
            )
          })
        }
        
        // Strategy 3: Find most relevant node based on description overlap
        if (!matchedNode && nodes.length > 0) {
          const scores = nodes.map(node => ({
            node,
            score: calculateRelevanceScore(item.question, node)
          }))
          
          scores.sort((a, b) => b.score - a.score)
          if (scores[0].score > 0.3) { // Threshold for minimum relevance
            matchedNode = scores[0].node
          }
        }
        
        if (matchedNode) {
          // Update the quiz item with the matched node
          const { error: updateError } = await supabase
            .from('quiz_items')
            .update({ node_id: matchedNode.id })
            .eq('id', item.id)
          
          if (updateError) {
            console.error(`Failed to update item ${item.id}:`, updateError)
            totalFailed++
          } else {
            console.log(`✓ Matched question to node: ${matchedNode.name}`)
            totalUpdated++
          }
        } else {
          console.log(`✗ No match found for question: ${item.question.substring(0, 50)}...`)
          totalFailed++
        }
      }
    }
    
    console.log('\n=== Migration Summary ===')
    console.log(`Total items processed: ${quizItems.length}`)
    console.log(`Successfully updated: ${totalUpdated}`)
    console.log(`Failed to match: ${totalFailed}`)
    console.log(`Success rate: ${((totalUpdated / quizItems.length) * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

function extractKeywords(text: string): string[] {
  // Remove common Korean particles and extract meaningful words
  const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '와', '과', '하다', '되다', '있다', '없다']
  
  const words = text
    .toLowerCase()
    .replace(/[.,!?'"]/g, '')
    .split(/\s+/)
    .filter((word: string) => word.length > 1 && !stopWords.includes(word))
  
  // Return unique keywords
  return [...new Set(words)]
}

function calculateRelevanceScore(question: string, node: any): number {
  const questionLower = question.toLowerCase()
  const nameLower = node.name.toLowerCase()
  const descLower = (node.description || '').toLowerCase()
  
  let score = 0
  
  // Full name match
  if (questionLower.includes(nameLower)) {
    score += 1
  }
  
  // Partial name match (individual words)
  const nameWords = nameLower.split(/\s+/)
  nameWords.forEach((word: string) => {
    if (word.length > 2 && questionLower.includes(word)) {
      score += 0.3
    }
  })
  
  // Description keywords match
  const descWords = descLower.split(/\s+/).filter((w: string) => w.length > 2)
  const matchingDescWords = descWords.filter((word: string) => questionLower.includes(word))
  score += (matchingDescWords.length / Math.max(descWords.length, 1)) * 0.5
  
  return Math.min(score, 1) // Cap at 1
}

// Run the migration
migrateQuizNodes()
  .then(() => {
    console.log('\nMigration completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nMigration failed:', error)
    process.exit(1)
  })