import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'

const inputSchema = z.object({ sessionId: z.string().uuid() })

export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event)
    if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' })
    const { sessionId } = inputSchema.parse(JSON.parse(event.body ?? '{}'))
    const db = database()
    const { data: session } = await db.from('tension_sessions').select('id').eq('id', sessionId).eq('owner_uid', uid).maybeSingle()
    if (!session) return response(404, { error: 'Session not found' })
    const { data: existing, error: existingError } = await db.from('session_shares').select('token').eq('session_id', sessionId).eq('owner_uid', uid).is('revoked_at', null).maybeSingle()
    if (existingError) throw existingError
    if (existing) return response(200, { token: existing.token })
    const { data, error } = await db.from('session_shares').upsert({ session_id: sessionId, owner_uid: uid, revoked_at: null }, { onConflict: 'session_id' }).select('token').single()
    if (error) throw error
    return response(201, { token: data.token })
  } catch (error) { return failure(error) }
}
