import type { Handler } from '@netlify/functions'
import { database, failure, requireUid, response } from '@bike-tools/db/server'
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'DELETE') return response(405, { error: 'Method not allowed' })
    const uid = await requireUid(event); const db = database()
    const { error } = await db.from('wheels').delete().eq('owner_uid', uid)
    if (error) throw error
    return response(204)
  } catch (error) { return failure(error) }
}
