'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  subject_id: string
  subject?: {
    id: string
    name: string
    color: string
  }
}

export default function RecentDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  // Fixed user ID (same as in other components)
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        // Fetch recent documents with subject information
        const { data: documentsData, error } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            status,
            created_at,
            subject_id,
            subjects (
              id,
              name,
              color
            )
          `)
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching recent documents:', error)
          return
        }

        if (documentsData) {
          // Transform the data to match our interface
          const transformedDocs = documentsData.map(doc => ({
            id: doc.id,
            title: doc.title,
            status: doc.status,
            created_at: doc.created_at,
            subject_id: doc.subject_id,
            subject: doc.subjects as any
          }))
          setDocuments(transformedDocs)
        }
      } catch (error) {
        console.error('Error in fetchRecentDocuments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentDocuments()

    // Set up real-time subscription for document updates
    const channel = supabase
      .channel('recent-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${FIXED_USER_ID}`
        },
        () => {
          // Refetch documents when any change occurs
          fetchRecentDocuments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료'
      case 'processing':
        return '처리중'
      case 'failed':
        return '실패'
      case 'pending':
        return '대기중'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) {
      return `${days}일 전`
    } else if (hours > 0) {
      return `${hours}시간 전`
    } else if (minutes > 0) {
      return `${minutes}분 전`
    } else {
      return '방금 전'
    }
  }

  return (
    <div className="surface-primary" style={{ 
      padding: 'var(--spacing-6)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h2 className="text-heading-4" style={{ 
          color: 'var(--color-neutral-900)',
          marginBottom: 'var(--spacing-1)'
        }}>
          최근 문서
        </h2>
        <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)' }}>
          최근 업로드한 문서 목록
        </p>
      </div>

      {/* Document List */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        marginRight: '-8px',
        paddingRight: '8px'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            color: 'var(--color-neutral-500)'
          }}>
            <span>로딩 중...</span>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-8)',
            color: 'var(--color-neutral-500)'
          }}>
            <FileText style={{ 
              width: '48px', 
              height: '48px', 
              margin: '0 auto',
              marginBottom: 'var(--spacing-3)',
              color: 'var(--color-neutral-400)'
            }} />
            <p>아직 업로드한 문서가 없습니다</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/subjects/${doc.subject_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  className="card"
                  style={{ 
                    padding: 'var(--spacing-4)',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    border: '1px solid var(--color-neutral-200)'
                  }}
                >
                  {/* Document Icon and Title */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-3)',
                    marginBottom: 'var(--spacing-2)'
                  }}>
                    <div style={{ 
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: doc.subject?.color || 'var(--color-primary-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText style={{ 
                        width: '16px', 
                        height: '16px',
                        color: 'var(--color-neutral-0)'
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ 
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-neutral-900)',
                        marginBottom: 'var(--spacing-1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.title}
                      </h4>
                      {doc.subject && (
                        <p style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-neutral-600)',
                          marginBottom: 'var(--spacing-1)'
                        }}>
                          {doc.subject.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status and Time */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 'var(--font-size-xs)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 'var(--spacing-1)'
                    }}>
                      {getStatusIcon(doc.status)}
                      <span style={{ color: 'var(--color-neutral-600)' }}>
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-neutral-500)' }}>
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}