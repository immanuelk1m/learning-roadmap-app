// In-memory store for progress tracking
// In production, you might want to use Redis or similar
const progressStore = new Map<string, any>()

export function updateProgress(userId: string, documentId: string, progress: any) {
  const key = `${userId}:${documentId}`
  progressStore.set(key, {
    ...progress,
    timestamp: new Date().toISOString()
  })
}

export function clearProgress(userId: string, documentId: string) {
  const key = `${userId}:${documentId}`
  progressStore.delete(key)
}

export function getProgress(userId: string, documentId: string) {
  const key = `${userId}:${documentId}`
  return progressStore.get(key)
}