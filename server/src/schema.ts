import { z } from 'zod';

// Buyer schemas
export const buyerSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_banned: z.boolean(),
  ban_reason: z.string().nullable(),
  mode: z.string(),
  chat_id: z.string(),
  max_numbers_per_branch: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Buyer = z.infer<typeof buyerSchema>;

// Input schema for creating buyers
export const createBuyerInputSchema = z.object({
  name: z.string().min(1),
  mode: z.string(),
  chat_id: z.string().min(1),
  max_numbers_per_branch: z.number().int().positive().default(10)
});

export type CreateBuyerInput = z.infer<typeof createBuyerInputSchema>;

// Input schema for updating buyers
export const updateBuyerInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  mode: z.string().optional(),
  max_numbers_per_branch: z.number().int().positive().optional()
});

export type UpdateBuyerInput = z.infer<typeof updateBuyerInputSchema>;

// Input schema for banning buyers
export const banBuyerInputSchema = z.object({
  id: z.number(),
  ban_reason: z.string().min(1)
});

export type BanBuyerInput = z.infer<typeof banBuyerInputSchema>;

// Input schema for stopwork action
export const stopworkBuyerInputSchema = z.object({
  id: z.number()
});

export type StopworkBuyerInput = z.infer<typeof stopworkBuyerInputSchema>;

// Seller schemas
export const sellerSchema = z.object({
  id: z.number(),
  telegram_id: z.string(),
  status: z.enum(['active', 'inactive', 'banned']),
  status_comment: z.string().nullable(),
  permanent_rounding_bonus: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Seller = z.infer<typeof sellerSchema>;

// Input schema for creating sellers
export const createSellerInputSchema = z.object({
  telegram_id: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
  status_comment: z.string().nullable().optional(),
  permanent_rounding_bonus: z.number().default(0)
});

export type CreateSellerInput = z.infer<typeof createSellerInputSchema>;

// Input schema for updating sellers
export const updateSellerInputSchema = z.object({
  id: z.number(),
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  status_comment: z.string().nullable().optional(),
  permanent_rounding_bonus: z.number().optional()
});

export type UpdateSellerInput = z.infer<typeof updateSellerInputSchema>;

// Input schema for banning sellers
export const banSellerInputSchema = z.object({
  id: z.number(),
  status_comment: z.string().optional()
});

export type BanSellerInput = z.infer<typeof banSellerInputSchema>;

// Number schemas
export const numberSchema = z.object({
  id: z.number(),
  phone_number: z.string(),
  country: z.string(),
  type: z.string(),
  status: z.enum(['available', 'rented', 'accepted', 'completed', 'cancelled', 'returned_to_queue']),
  buyer_id: z.number().nullable(),
  seller_id: z.number().nullable(),
  rented_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Number = z.infer<typeof numberSchema>;

// Input schema for updating number status
export const updateNumberStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['available', 'rented', 'accepted', 'completed', 'cancelled', 'returned_to_queue'])
});

export type UpdateNumberStatusInput = z.infer<typeof updateNumberStatusInputSchema>;

// Input schema for filtering numbers
export const filterNumbersInputSchema = z.object({
  country: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['available', 'rented', 'accepted', 'completed', 'cancelled', 'returned_to_queue']).optional(),
  buyer_id: z.number().optional(),
  seller_id: z.number().optional(),
  phone_number: z.string().optional()
});

export type FilterNumbersInput = z.infer<typeof filterNumbersInputSchema>;

// Billing schemas
export const billingRecordSchema = z.object({
  id: z.number(),
  buyer_id: z.number(),
  amount: z.number(),
  description: z.string(),
  billing_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type BillingRecord = z.infer<typeof billingRecordSchema>;

// Input schema for generating daily invoice
export const generateDailyInvoiceInputSchema = z.object({
  buyer_id: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
});

export type GenerateDailyInvoiceInput = z.infer<typeof generateDailyInvoiceInputSchema>;

// Daily invoice response schema
export const dailyInvoiceSchema = z.object({
  buyer_id: z.number(),
  buyer_name: z.string(),
  date: z.string(),
  total_numbers_rented: z.number().int(),
  total_amount: z.number(),
  numbers: z.array(z.object({
    id: z.number(),
    phone_number: z.string(),
    country: z.string(),
    type: z.string(),
    price: z.number(),
    rented_at: z.coerce.date(),
    completed_at: z.coerce.date().nullable()
  }))
});

export type DailyInvoice = z.infer<typeof dailyInvoiceSchema>;

// Payment history input schema
export const getPaymentHistoryInputSchema = z.object({
  buyer_id: z.number(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetPaymentHistoryInput = z.infer<typeof getPaymentHistoryInputSchema>;