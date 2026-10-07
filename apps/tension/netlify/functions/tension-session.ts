import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'
const measurement = z.object({ spokeNumber: z.number().int().positive(), side: z.enum(['left', 'right']), positionIndex: z.number().int().nonnegative(), tension: z.number().positive().max(500) })
const inputSchema = z.object({ wheelId: z.string().uuid(), notes: z.string().trim().max(2000).nullable().optional(), measurements: z.array(measurement).min(1).max(200) })
export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event); const db = database()
    if (event.httpMethod === 'GET') {
      const id = z.string().uuid().parse(event.queryStringParameters?.id)
      const { data, error } = await db.from('tension_sessions').select('id,wheel_id,notes,created_at,spoke_measurements(id,spoke_number,side,position_index,tension)').eq('id', id).eq('owner_uid', uid).maybeSingle()
      if (error) throw error
      return data ? response(200, data) : response(404, { error: 'Session not found' })
    }
    if (event.httpMethod === 'POST') {
      const input = inputSchema.parse(JSON.parse(event.body ?? '{}'))
      const { data: wheel } = await db.from('wheels').select('id,spoke_count').eq('id', input.wheelId).eq('owner_uid', uid).maybeSingle()
      if (!wheel) return response(404, { error: 'Wheel not found' })
      if (input.measurements.some((item) => item.spokeNumber > wheel.spoke_count)) return response(400, { error: 'Spoke number exceeds wheel spoke count' })
      const { data: session, error: sessionError } = await db.from('tension_sessions').insert({ wheel_id: input.wheelId, owner_uid: uid, notes: input.notes || null }).select().single()
      if (sessionError) throw sessionError
      const { error: measurementsError } = await db.from('spoke_measurements').insert(input.measurements.map((item) => ({ session_id: session.id, spoke_number: item.spokeNumber, side: item.side, position_index: item.positionIndex, tension: item.tension })))
      if (measurementsError) { await db.from('tension_sessions').delete().eq('id', session.id).eq('owner_uid', uid); throw measurementsError }
      return response(201, { id: session.id })
    }
    return response(405, { error: 'Method not allowed' })
  } catch (error) { return failure(error) }
}
