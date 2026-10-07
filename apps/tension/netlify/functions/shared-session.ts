import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'

export const handler: Handler = async (event) => {
  try {
    await requireUid(event)
    if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' })
    const token = z.string().uuid().parse(event.queryStringParameters?.token)
    const db = database()
    const { data: share, error: shareError } = await db.from('session_shares').select('session_id').eq('token', token).is('revoked_at', null).maybeSingle()
    if (shareError) throw shareError
    if (!share) return response(404, { error: 'Shared session not found or no longer available' })
    const { data, error } = await db.from('tension_sessions').select('id,wheel_id,notes,created_at,wheels(id,name,position,spoke_count,rim,hub,target_left,target_right,tension_unit,created_at,updated_at),spoke_measurements(id,spoke_number,side,position_index,tension)').eq('id', share.session_id).maybeSingle()
    if (error) throw error
    if (!data) return response(404, { error: 'Shared session not found' })
    return response(200, data)
  } catch (error) { return failure(error) }
}
