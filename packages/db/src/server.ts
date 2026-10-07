import { getApps, cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createClient } from '@supabase/supabase-js'
import type { HandlerEvent } from '@netlify/functions'

function firebaseAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw Object.assign(new Error('Firebase Admin is not configured'), { statusCode: 500 })
  try {
    const serviceAccount = JSON.parse(raw)
    const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) })
    return getAuth(app)
  } catch {
    throw Object.assign(new Error('Firebase Admin service account JSON is invalid'), { statusCode: 500 })
  }
}
export async function requireUid(event: HandlerEvent) {
  const match = event.headers.authorization?.match(/^Bearer (.+)$/)
  if (!match?.[1]) throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
  const admin = firebaseAdmin()
  try { return (await admin.verifyIdToken(match[1])).uid }
  catch { throw Object.assign(new Error('Invalid or expired authentication token'), { statusCode: 401 }) }
}
export function database() {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Database is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function response(statusCode: number, body?: unknown) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: body === undefined ? '' : JSON.stringify(body) } }
export function failure(error: unknown) { const value = error as { message?: string; statusCode?: number }; return response(value.statusCode ?? 500, { error: value.statusCode ? value.message : 'Internal server error' }) }
