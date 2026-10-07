import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'

const wheelInput = z.object({ name: z.string().trim().max(100).nullable().optional(), position: z.enum(['front', 'rear']).nullable().optional(), spokeCount: z.number().int().min(3).max(100), rim: z.string().trim().max(100).nullable().optional(), hub: z.string().trim().max(100).nullable().optional(), targetLeft: z.number().positive().max(500).nullable().optional(), targetRight: z.number().positive().max(500).nullable().optional() })
const toWheel = (row: Record<string, unknown>) => ({ id: row.id, name: row.name, position: row.position, spokeCount: row.spoke_count, rim: row.rim, hub: row.hub, targetLeft: row.target_left, targetRight: row.target_right, tensionUnit: row.tension_unit, createdAt: row.created_at, updatedAt: row.updated_at })

export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event); const db = database()
    if (event.httpMethod === 'GET') {
      const { data, error } = await db.from('wheels').select('*').eq('owner_uid', uid).order('updated_at', { ascending: false })
      if (error) throw error
      return response(200, data.map(toWheel))
    }
    if (event.httpMethod === 'POST') {
      const input = wheelInput.parse(JSON.parse(event.body ?? '{}'))
      const { data, error } = await db.from('wheels').insert({ owner_uid: uid, name: input.name || null, position: input.position || null, spoke_count: input.spokeCount, rim: input.rim || null, hub: input.hub || null, target_left: input.targetLeft, target_right: input.targetRight }).select().single()
      if (error) throw error
      return response(201, toWheel(data))
    }
    return response(405, { error: 'Method not allowed' })
  } catch (error) { return failure(error) }
}
