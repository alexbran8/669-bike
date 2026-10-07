import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { database, failure, requireUid, response } from '@bike-tools/db/server'
const idSchema = z.string().uuid()
const updateSchema = z.object({ id: idSchema, name: z.string().trim().max(100).nullable().optional(), position: z.enum(['front', 'rear']).nullable().optional(), spokeCount: z.number().int().min(3).max(100).optional(), rim: z.string().trim().max(100).nullable().optional(), hub: z.string().trim().max(100).nullable().optional(), targetLeft: z.number().positive().max(500).nullable().optional(), targetRight: z.number().positive().max(500).nullable().optional() })
export const handler: Handler = async (event) => {
  try {
    const uid = await requireUid(event); const db = database()
    if (event.httpMethod === 'DELETE') {
      const id = idSchema.parse(event.queryStringParameters?.id)
      const { error, count } = await db.from('wheels').delete({ count: 'exact' }).eq('id', id).eq('owner_uid', uid)
      if (error) throw error
      return count ? response(204) : response(404, { error: 'Wheel not found' })
    }
    if (event.httpMethod === 'PUT') {
      const input = updateSchema.parse(JSON.parse(event.body ?? '{}'))
      const values: Record<string, unknown> = { updated_at: new Date().toISOString() }
      const map = { name: 'name', position: 'position', spokeCount: 'spoke_count', rim: 'rim', hub: 'hub', targetLeft: 'target_left', targetRight: 'target_right' } as const
      for (const [key, column] of Object.entries(map)) if (key in input) values[column] = input[key as keyof typeof input] || null
      const { data, error } = await db.from('wheels').update(values).eq('id', input.id).eq('owner_uid', uid).select().maybeSingle()
      if (error) throw error
      return data ? response(200, data) : response(404, { error: 'Wheel not found' })
    }
    return response(405, { error: 'Method not allowed' })
  } catch (error) { return failure(error) }
}
