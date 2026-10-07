import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'
export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event); const wheelId = z.string().uuid().parse(event.queryStringParameters?.wheelId); const db = database()
    const { data: wheel } = await db.from('wheels').select('id').eq('id', wheelId).eq('owner_uid', uid).maybeSingle()
    if (!wheel) return response(404, { error: 'Wheel not found' })
    const { data, error } = await db.from('tension_sessions').select('id,wheel_id,notes,created_at,spoke_measurements(id,spoke_number,side,position_index,tension)').eq('wheel_id', wheelId).eq('owner_uid', uid).order('created_at', { ascending: false })
    if (error) throw error
    return response(200, data)
  } catch (error) { return failure(error) }
}
