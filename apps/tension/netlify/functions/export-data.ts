import type { Handler } from '@netlify/functions'
import { database, failure, requireUid, response } from '@bike-tools/db/server'
export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event); const db = database()
    const { data, error } = await db.from('wheels').select('*,tension_sessions(*,spoke_measurements(*))').eq('owner_uid', uid)
    if (error) throw error
    return response(200, { exportedAt: new Date().toISOString(), wheels: data })
  } catch (error) { return failure(error) }
}
