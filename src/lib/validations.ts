import { z } from 'zod'

export const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
})

export const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contact_id: z.string().uuid('Invalid contact ID'),
  amount: z.number().min(0, 'Amount must be positive'),
  stage: z.string(),
  probability: z.number().min(0).max(100),
  expected_close_date: z.string().optional(),
})

export const activitySchema = z.object({
  type: z.string(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type ContactFormData = z.infer<typeof contactSchema>
export type DealFormData = z.infer<typeof dealSchema>
export type ActivityFormData = z.infer<typeof activitySchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
