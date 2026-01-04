#!/usr/bin/env node
import admin from 'firebase-admin'
import { readFile } from 'node:fs/promises'
import process from 'node:process'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = Number(process.env.BRAND_KIT_MIGRATION_BATCH ?? 50)

async function initializeFirebase() {
  if (admin.apps.length) return

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    return
  }

  admin.initializeApp()
}

function sanitizeBrandKits(rawKits = [], userId) {
  const seen = new Set()
  const normalized = []
  const now = new Date().toISOString()

  rawKits.filter(Boolean).forEach((kit, index) => {
    const baseId = typeof kit.id === 'string' && kit.id.trim()
      ? kit.id.trim()
      : `${userId}-legacy-${index + 1}`
    if (seen.has(baseId)) return

    normalized.push({
      ...kit,
      id: baseId,
      name: typeof kit.name === 'string' && kit.name.trim() ? kit.name : 'Brand Kit',
      createdAt: typeof kit.createdAt === 'string' ? kit.createdAt : now,
      updatedAt: typeof kit.updatedAt === 'string' ? kit.updatedAt : now,
    })
    seen.add(baseId)
  })

  return normalized
}

function resolveDefaultBrandKitId(kits, preferredId) {
  if (!kits.length) return null
  if (preferredId && kits.some((kit) => kit.id === preferredId)) {
    return preferredId
  }
  return kits[0]?.id ?? null
}

function kitsEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

async function migrateBatch(query, stats) {
  const snapshot = await query.get()
  if (snapshot.empty) {
    stats.finished = true
    return
  }

  for (const doc of snapshot.docs) {
    stats.processed += 1
    const data = doc.data() || {}

    try {
      const combined = [
        ...(Array.isArray(data.brandKits) ? data.brandKits : []),
        ...(data.brandKit ? [data.brandKit] : []),
      ]
      const sanitized = sanitizeBrandKits(combined, doc.id)
      const defaultId = resolveDefaultBrandKitId(sanitized, data.defaultBrandKitId ?? null)
      const defaultKit = sanitized.find((kit) => kit.id === defaultId) ?? null

      const needsBrandKitsUpdate = !kitsEqual(data.brandKits, sanitized)
      const needsDefaultUpdate = (data.defaultBrandKitId ?? null) !== defaultId
      const needsLegacyUpdate = !kitsEqual(data.brandKit, defaultKit)

      if (!needsBrandKitsUpdate && !needsDefaultUpdate && !needsLegacyUpdate) {
        continue
      }

      stats.mutated += 1

      const updatePayload = {
        brandKits: sanitized,
        defaultBrandKitId: defaultId,
        brandKit: defaultKit,
        updatedAt: new Date().toISOString(),
      }

      if (DRY_RUN) {
        console.info('[DRY-RUN] Would update user', doc.id, 'changes:', {
          needsBrandKitsUpdate,
          needsDefaultUpdate,
          needsLegacyUpdate,
        })
      } else {
        await doc.ref.set(updatePayload, { merge: true })
        console.info('Updated user', doc.id, 'changes:', {
          needsBrandKitsUpdate,
          needsDefaultUpdate,
          needsLegacyUpdate,
        })
      }
    } catch (error) {
      stats.errors += 1
      console.error('Failed to migrate user', doc.id, error)
    }
  }

  const lastDoc = snapshot.docs[snapshot.docs.length - 1]
  stats.nextQuery = query.startAfter(lastDoc)
}

async function main() {
  await initializeFirebase()
  const db = admin.firestore()

  const stats = {
    processed: 0,
    mutated: 0,
    errors: 0,
    finished: false,
    nextQuery: null,
  }

  let query = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(BATCH_SIZE)

  while (!stats.finished) {
    const activeQuery = stats.nextQuery ?? query
    stats.nextQuery = null
    await migrateBatch(activeQuery, stats)
  }

  console.log('Migration complete', stats)
  if (stats.errors > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Migration failed', error)
  process.exit(1)
})
