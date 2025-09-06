'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import UploadPDFButton from '@/components/documents/UploadPDFButton'
import { useRouter } from 'next/navigation'

type UsagePurpose = 'exam_preparation' | 'concept_understanding' | 'assignment_help'
type Material = 'pdf' | 'ppt' | 'youtube'

const SUBJECT_SUGGESTIONS = [
  '수학','컴퓨터공학','통계','경영/경제','의학','법학','외국어','인문/사회','공학','자연과학'
]

const USAGE_PURPOSE_OPTIONS: { label: string, value: UsagePurpose }[] = [
  { label: '시험 대비 공부', value: 'exam_preparation' },
  { label: '개념 이해', value: 'concept_understanding' },
  { label: '과제 도움', value: 'assignment_help' },
]

const MATERIAL_OPTIONS: { label: string, value: Material }[] = [
  { label: 'PDF', value: 'pdf' },
  { label: 'PPT', value: 'ppt' },
  { label: '유튜브 영상', value: 'youtube' },
]

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState<'invite'|'survey1'|'survey2'|'survey3'|'createSubject'|'upload'>('invite')

  // survey answers
  const [preferredSubject, setPreferredSubject] = useState<string>('')
  const [customSubject, setCustomSubject] = useState<string>('')
  const [usagePurpose, setUsagePurpose] = useState<UsagePurpose | null>(null)
  const [preferredMaterial, setPreferredMaterial] = useState<Material | null>(null)

  // subject creation
  const [subjectName, setSubjectName] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdSubjectId, setCreatedSubjectId] = useState<string | null>(null)

  // save onboarding answers once after step3
  const [savingAnswers, setSavingAnswers] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // invite code (first screen)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [inviteCheckLoading, setInviteCheckLoading] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const effectiveSubject = useMemo(() => {
    return customSubject?.trim() ? customSubject.trim() : (preferredSubject || '')
  }, [preferredSubject, customSubject])

  useEffect(() => {
    // small UX: prefill subjectName from step1
    if (step === 'createSubject') {
      setSubjectName(effectiveSubject || '')
    }
  }, [step])

  const handleSaveAnswers = async () => {
    try {
      setSavingAnswers(true)
      setSaveError(null)

      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) {
        setSaveError('로그인이 필요합니다.')
        return
      }

      if (!usagePurpose || !preferredMaterial) {
        setSaveError('필수 문항을 선택해주세요.')
        return
      }

      const raw_answers = {
        step1: { subject: effectiveSubject || null },
        step2: USAGE_PURPOSE_OPTIONS.find(o => o.value === usagePurpose)?.label,
        step3: MATERIAL_OPTIONS.find(o => o.value === preferredMaterial)?.label,
      }

      // upsert by user_id unique constraint
      const { error } = await (supabase as any)
        .from('onboarding_responses')
        .upsert({
          user_id: userId,
          preferred_subject: effectiveSubject || null,
          usage_purpose: usagePurpose,
          preferred_material: preferredMaterial,
          raw_answers,
        }, { onConflict: 'user_id' })

      if (error) throw error

      // If invite code looked valid, try redeem once after saving answers
      if (inviteCode && inviteCode.trim().length === 8) {
        try {
          const res = await fetch('/api/invite/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode.trim().toUpperCase() })
          })
          if (res.ok) {
            // success toast
            setInviteMessage('초대 코드 적용 완료 — 프로 1개월 활성화')
          } else {
            // do not block flow
          }
        } catch {}
      }

      setStep('createSubject')
    } catch (e: any) {
      setSaveError(e?.message || '설문 저장에 실패했습니다.')
    } finally {
      setSavingAnswers(false)
    }
  }

  const checkInviteCode = async () => {
    try {
      setInviteCheckLoading(true)
      setInviteMessage(null)
      setInviteValid(null)
      const code = inviteCode.trim().toUpperCase()
      if (!code || code.length !== 8) {
        setInviteValid(false)
        setInviteMessage('8자리 코드 형식을 확인해주세요')
        return
      }
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.valid) {
        setInviteValid(true)
        setInviteMessage('사용 가능한 코드입니다')
      } else {
        setInviteValid(false)
        setInviteMessage('유효하지 않은 코드입니다')
      }
    } finally {
      setInviteCheckLoading(false)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      setCreateError(null)

      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) {
        setCreateError('로그인이 필요합니다.')
        return
      }
      if (!subjectName.trim()) {
        setCreateError('과목명을 입력해주세요.')
        return
      }

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: subjectName.trim(),
          description: null,
          color: '#2f332f',
          user_id: userId,
          exam_date: null,
        })
        .select('id')
        .single()

      if (error) throw error

      setCreatedSubjectId(data.id)
      setStep('upload')
    } catch (e: any) {
      setCreateError(e?.message || '과목 생성에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const renderStepIndicator = (activeIndex: number) => (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
      {[1,2,3,4].map((n, idx) => (
        <div key={n} className="flex items-center">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            idx <= activeIndex ? 'bg-[#2f332f] text-[#2ce477]' : 'bg-gray-200 text-gray-700'
          }`}>{n}</span>
          {idx < 3 && <span className="mx-2 w-8 h-[2px] bg-gray-200" />}
        </div>
      ))}
    </div>
  )

  if (step === 'createSubject') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">과목 생성</h1>
        <p className="text-sm text-gray-600 mb-5">학습을 시작할 과목을 만들어주세요.</p>
        <form onSubmit={handleCreateSubject} className="flex flex-col gap-4">
          {createError && (
            <div className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{createError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">과목명</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e)=>setSubjectName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="예: 자료구조"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={()=>router.push('/')} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">나중에</button>
            <button type="submit" disabled={creating} className="px-4 py-2 bg-[#2f332f] text-[#2ce477] rounded-lg disabled:opacity-50">{creating ? '생성 중...' : '생성'}</button>
          </div>
        </form>
      </div>
    )
  }

  if (step === 'upload') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">PDF 업로드</h1>
        <p className="text-sm text-gray-600 mb-5">첫 문서를 업로드하면 자동으로 학습 전 배경지식 체크로 이동합니다.</p>
        {!createdSubjectId ? (
          <div className="text-sm text-red-600">과목 정보가 없습니다. 처음부터 다시 진행해주세요.</div>
        ) : (
          <div>
            <UploadPDFButton subjectId={createdSubjectId} />
            <p className="text-xs text-gray-500 mt-3">업로드가 완료되면 평가 페이지로 이동합니다.</p>
          </div>
        )}
      </div>
    )
  }

  // steps: 1) invite, 2) survey1, 3) survey2, 4) survey3
  const showIndicator = step === 'invite' || step === 'survey1' || step === 'survey2' || step === 'survey3'
  const stepIndex = step === 'invite' ? 0 : step === 'survey1' ? 1 : step === 'survey2' ? 2 : 3

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {showIndicator && renderStepIndicator(stepIndex)}
      {step === 'invite' && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">초대 코드가 있으신가요?</h1>
          <p className="text-sm text-gray-600 mb-5 text-center">있다면 입력하고 확인을 눌러 혜택을 활성화하세요. 없으면 건너뛰셔도 됩니다.</p>
          <div className="mb-4 flex items-center gap-2 justify-center">
            <input
              type="text"
              value={inviteCode}
              onChange={(e)=>{ setInviteCode(e.target.value.toUpperCase()); setInviteValid(null); setInviteMessage(null) }}
              placeholder="초대코드 (선택)"
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm tracking-widest"
              maxLength={8}
            />
            <button
              type="button"
              onClick={checkInviteCode}
              disabled={inviteCheckLoading}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >{inviteCheckLoading ? '확인 중...' : '확인'}</button>
            {inviteValid === true && (
              <span className="inline-flex items-center gap-2 text-emerald-700 text-sm">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />사용 가능
              </span>
            )}
            {inviteValid === false && inviteMessage && (
              <span className="inline-flex items-center gap-2 text-red-600 text-sm">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />{inviteMessage}
              </span>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStep('survey1')} className="px-4 py-2 bg-[#2f332f] text-[#2ce477] rounded-lg">다음</button>
            </div>
          </div>
        </div>
      )}
      {step === 'survey1' && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">어떤 과목을 주로 공부하시나요?</h1>
          <p className="text-sm text-gray-600 mb-5 text-center">관심 분야를 알려주시면 추천과 화면 구성을 맞춰드려요.</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {SUBJECT_SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={()=>{ setPreferredSubject(s); setCustomSubject('') }}
                className={`px-3 py-1.5 rounded-full text-sm border ${preferredSubject===s ? 'bg-[#2f332f] text-[#2ce477] border-[#2f332f]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="직접 입력"
              value={customSubject}
              onChange={(e)=>{ setCustomSubject(e.target.value); setPreferredSubject('') }}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStep('survey2')} className="px-4 py-2 bg-[#2f332f] text-[#2ce477] rounded-lg">다음</button>
            </div>
          </div>
        </div>
      )}
      {step === 'survey2' && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">Commit을 어떤 용도로 사용하시나요?</h1>
          <p className="text-sm text-gray-600 mb-5 text-center">목적에 맞춰 평가/가이드를 최적화해 드립니다.</p>
          <div className="flex flex-col gap-2">
            {USAGE_PURPOSE_OPTIONS.map(o => (
              <label key={o.value} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer ${usagePurpose===o.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}>
                <input type="radio" name="purpose" checked={usagePurpose===o.value} onChange={()=>setUsagePurpose(o.value)} />
                <span className="text-sm text-gray-800">{o.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button type="button" onClick={()=>setStep('survey1')} className="px-4 py-2 border rounded-lg">이전</button>
            <button type="button" disabled={!usagePurpose} onClick={()=>setStep('survey3')} className="px-4 py-2 bg-[#2f332f] text-[#2ce477] rounded-lg disabled:opacity-50">다음</button>
          </div>
        </div>
      )}
      {step === 'survey3' && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">주로 어떠한 형태의 자료를 업로드하시나요?</h1>
          <p className="text-sm text-gray-600 mb-5 text-center">첫 업로드를 빠르게 시작할 수 있도록 준비할게요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MATERIAL_OPTIONS.map(m => (
              <button
                type="button"
                key={m.value}
                onClick={()=>setPreferredMaterial(m.value)}
                className={`px-4 py-6 border rounded-xl text-sm ${preferredMaterial===m.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
              >{m.label}</button>
            ))}
          </div>
          {saveError && <div className="mt-4 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg">{saveError}</div>}
          <div className="mt-6 flex justify-between">
            <button type="button" onClick={()=>setStep('survey2')} className="px-4 py-2 border rounded-lg">이전</button>
            <button type="button" disabled={!preferredMaterial || !usagePurpose || savingAnswers} onClick={handleSaveAnswers} className="px-4 py-2 bg-[#2f332f] text-[#2ce477] rounded-lg disabled:opacity-50">{savingAnswers ? '저장 중...' : '계속'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
