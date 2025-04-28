import { z } from 'zod'

export const createResidentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalConditions: z.string().optional(),
  roomId: z.number().optional()
})

export const updateResidentSchema = createResidentSchema.partial()

export type CreateResidentInput = z.infer<typeof createResidentSchema>
export type UpdateResidentInput = z.infer<typeof updateResidentSchema> 