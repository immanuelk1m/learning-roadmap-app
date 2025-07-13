'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, FilePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'

interface UploadPDFButtonProps {
  subjectId: string
  onUploadSuccess?: () => void
}

export default function UploadPDFButton({ subjectId, onUploadSuccess }: UploadPDFButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { showToast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드할 수 있습니다.')
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('파일 크기는 50MB 이하여야 합니다.')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    console.log('=== PDF Upload Started ===')
    console.log(`File: ${file.name}`)
    console.log(`Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`)
    console.log(`Type: ${file.type}`)
    console.log(`Subject ID: ${subjectId}`)

    setLoading(true)
    setError(null)

    try {
      // Use fixed user ID
      const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${FIXED_USER_ID}/${subjectId}/${Date.now()}.${fileExt}`

      console.log('Uploading to Supabase Storage...')
      console.log(`Storage path: ${fileName}`)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-documents')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        throw uploadError
      }

      console.log('Storage upload successful:', uploadData)

      // Create document record in database
      console.log('Creating document record...')
      const documentData = {
        subject_id: subjectId,
        user_id: FIXED_USER_ID,
        title: file.name.replace('.pdf', ''),
        file_path: fileName,
        file_size: file.size,
        status: 'processing',
      }
      console.log('Document data:', documentData)

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (dbError) {
        console.error('Database insert failed:', dbError)
        throw dbError
      }

      console.log('Document record created:', newDoc)

      setIsOpen(false)
      setFile(null)
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'PDF 업로드 완료',
        message: '문서를 분석하고 있습니다. 잠시 후 결과를 확인하세요.',
        duration: 5000
      })
      
      // Call the callback to refresh the document list immediately
      if (onUploadSuccess) {
        onUploadSuccess()
      }

      // Trigger AI analysis in background
      if (newDoc) {
        console.log('Triggering AI analysis...')
        console.log(`Analysis API endpoint: /api/documents/${newDoc.id}/analyze`)
        
        fetch(`/api/documents/${newDoc.id}/analyze`, {
          method: 'POST',
        })
        .then(response => {
          console.log(`Analysis API response status: ${response.status}`)
          if (!response.ok) {
            console.error(`Analysis API failed with status: ${response.status}`)
            return response.text().then(text => {
              console.error('Analysis API error response:', text)
            })
          }
          console.log('Analysis API triggered successfully')
        })
        .catch(error => {
          console.error('Failed to trigger analysis API:', error)
        })
      }

      console.log('=== PDF Upload Completed Successfully ===')
    } catch (error: any) {
      console.error('=== PDF Upload Failed ===')
      console.error('Error details:', error)
      console.error('Error stack:', error.stack)
      setError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
      >
        <FilePlus className="h-5 w-5 mr-2" />
        파일 선택
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">PDF 업로드</h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setFile(null)
                  setError(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  클릭하여 PDF 파일을 선택하세요
                </p>
                <p className="text-xs text-gray-500 mt-2">최대 50MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-neutral-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-neutral-100 text-neutral-700 text-sm rounded-md border border-neutral-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setFile(null)
                  setError(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}