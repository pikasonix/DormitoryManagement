import { z } from 'zod'

export const createRoomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  type: z.enum(['SINGLE', 'DOUBLE', 'WARD']),
  capacity: z.number().min(1),
  occupied: z.number().default(0),
  floor: z.number().optional(),
  description: z.string().optional()
})

export const updateRoomSchema = createRoomSchema.partial()

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema> 