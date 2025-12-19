import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import { db, functions, storage } from '@/config/firebase'

type ServerExportJobStatus = 'queued' | 'running' | 'completed' | 'failed'

type ServerExportJobStage =
  | 'queued'
  | 'starting'
  | 'load_project'
  | 'prepare_data'
  | 'render_pdf'
  | 'upload'
  | 'finalize'
  | 'completed'
  | 'failed'

interface ServerExportJobDoc {
  userId: string
  projectId: string
  format: 'pdf' | 'png' | 'jpg'
  status: ServerExportJobStatus
  progress: number
  attempts?: number
  stage?: ServerExportJobStage
  processingEventId?: string
  output?: {
    storagePath: string
    contentType: string
  }
  error?: {
    message: string
  }
}

interface CreateExportJobResponse {
  jobId: string
}

interface WaitForJobOptions {
  timeoutMs?: number
  onProgress?: (progress: number, status: ServerExportJobStatus, stage?: ServerExportJobStage) => void
}

interface RetryExportJobResponse {
  ok: boolean
}

export class ExportJobsService {
  async createPdfExportJob(projectId: string): Promise<string> {
    const callable = httpsCallable(functions, 'createExportJob')
    const result = await callable({ projectId, format: 'pdf' })
    const data = result.data as Partial<CreateExportJobResponse> | undefined
    const jobId = String(data?.jobId || '').trim()

    if (!jobId) {
      throw new Error('Failed to start PDF export job')
    }

    return jobId
  }

  async createPngExportJob(projectId: string): Promise<string> {
    const callable = httpsCallable(functions, 'createExportJob')
    const result = await callable({ projectId, format: 'png' })
    const data = result.data as Partial<CreateExportJobResponse> | undefined
    const jobId = String(data?.jobId || '').trim()

    if (!jobId) {
      throw new Error('Failed to start PNG export job')
    }

    return jobId
  }

  async createJpgExportJob(projectId: string): Promise<string> {
    const callable = httpsCallable(functions, 'createExportJob')
    const result = await callable({ projectId, format: 'jpg' })
    const data = result.data as Partial<CreateExportJobResponse> | undefined
    const jobId = String(data?.jobId || '').trim()

    if (!jobId) {
      throw new Error('Failed to start JPG export job')
    }

    return jobId
  }

  async retryExportJob(jobId: string): Promise<boolean> {
    const id = String(jobId || '').trim()
    if (!id) {
      throw new Error('jobId is required')
    }

    const callable = httpsCallable(functions, 'retryExportJob')
    const result = await callable({ jobId: id })
    const data = (result.data || {}) as Partial<RetryExportJobResponse>
    return Boolean(data.ok)
  }

  watchJob(jobId: string, cb: (job: ServerExportJobDoc | null) => void): () => void {
    const jobRef = doc(db, 'exportJobs', jobId)
    return onSnapshot(jobRef, (snap) => {
      if (!snap.exists()) {
        cb(null)
        return
      }
      cb(snap.data() as ServerExportJobDoc)
    })
  }

  async waitForJobCompletion(jobId: string, options: WaitForJobOptions = {}): Promise<{ storagePath: string; downloadUrl: string }> {
    const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000

    return new Promise((resolve, reject) => {
      let done = false

      const stop = (fn?: () => void) => {
        if (done) return
        done = true
        if (fn) fn()
      }

      const timer = setTimeout(() => {
        stop(unsubscribe)
        reject(new Error('Export timed out'))
      }, timeoutMs)

      const unsubscribe = this.watchJob(jobId, async (job) => {
        if (!job) return

        options.onProgress?.(Number(job.progress || 0), job.status, job.stage)

        if (job.status === 'failed') {
          clearTimeout(timer)
          stop(unsubscribe)
          reject(new Error(job.error?.message || 'Export failed'))
          return
        }

        if (job.status === 'completed') {
          const storagePath = String(job.output?.storagePath || '').trim()
          if (!storagePath) {
            clearTimeout(timer)
            stop(unsubscribe)
            reject(new Error('Export completed but no output was provided'))
            return
          }

          try {
            const url = await getDownloadURL(storageRef(storage, storagePath))
            clearTimeout(timer)
            stop(unsubscribe)
            resolve({ storagePath, downloadUrl: url })
          } catch (e: any) {
            clearTimeout(timer)
            stop(unsubscribe)
            reject(new Error(e?.message || 'Failed to resolve export download URL'))
          }
        }
      })
    })
  }

  async createAndWaitForPdfExport(projectId: string, options: WaitForJobOptions = {}): Promise<{ jobId: string; storagePath: string; downloadUrl: string }> {
    const jobId = await this.createPdfExportJob(projectId)
    const result = await this.waitForJobCompletion(jobId, options)
    return { jobId, ...result }
  }
}

export const exportJobsService = new ExportJobsService()
