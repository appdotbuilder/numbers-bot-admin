import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createBuyerInputSchema,
  updateBuyerInputSchema,
  banBuyerInputSchema,
  stopworkBuyerInputSchema,
  generateDailyInvoiceInputSchema,
  getPaymentHistoryInputSchema,
  createSellerInputSchema,
  updateSellerInputSchema,
  banSellerInputSchema,
  filterNumbersInputSchema,
  updateNumberStatusInputSchema
} from './schema';

// Import all handlers
import { getBuyers } from './handlers/get_buyers';
import { createBuyer } from './handlers/create_buyer';
import { updateBuyer } from './handlers/update_buyer';
import { getBuyerById } from './handlers/get_buyer_by_id';
import { banBuyer } from './handlers/ban_buyer';
import { unbanBuyer } from './handlers/unban_buyer';
import { stopworkBuyer } from './handlers/stopwork_buyer';
import { generateDailyInvoice } from './handlers/generate_daily_invoice';
import { getPaymentHistory } from './handlers/get_payment_history';

import { getSellers } from './handlers/get_sellers';
import { createSeller } from './handlers/create_seller';
import { updateSeller } from './handlers/update_seller';
import { getSellerById } from './handlers/get_seller_by_id';
import { banSeller } from './handlers/ban_seller';

import { getNumbers } from './handlers/get_numbers';
import { filterNumbers } from './handlers/filter_numbers';
import { getNumberById } from './handlers/get_number_by_id';
import { updateNumberStatus } from './handlers/update_number_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Buyer management routes
  buyers: router({
    // Get all buyers
    getAll: publicProcedure
      .query(() => getBuyers()),
    
    // Get buyer by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getBuyerById(input.id)),
    
    // Create new buyer
    create: publicProcedure
      .input(createBuyerInputSchema)
      .mutation(({ input }) => createBuyer(input)),
    
    // Update buyer details
    update: publicProcedure
      .input(updateBuyerInputSchema)
      .mutation(({ input }) => updateBuyer(input)),
    
    // Ban a buyer
    ban: publicProcedure
      .input(banBuyerInputSchema)
      .mutation(({ input }) => banBuyer(input)),
    
    // Unban a buyer
    unban: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => unbanBuyer(input.id)),
    
    // Stopwork for a buyer
    stopwork: publicProcedure
      .input(stopworkBuyerInputSchema)
      .mutation(({ input }) => stopworkBuyer(input)),
    
    // Generate daily invoice
    generateDailyInvoice: publicProcedure
      .input(generateDailyInvoiceInputSchema)
      .query(({ input }) => generateDailyInvoice(input)),
    
    // Get payment history
    getPaymentHistory: publicProcedure
      .input(getPaymentHistoryInputSchema)
      .query(({ input }) => getPaymentHistory(input))
  }),

  // Seller management routes
  sellers: router({
    // Get all sellers
    getAll: publicProcedure
      .query(() => getSellers()),
    
    // Get seller by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getSellerById(input.id)),
    
    // Create new seller
    create: publicProcedure
      .input(createSellerInputSchema)
      .mutation(({ input }) => createSeller(input)),
    
    // Update seller details
    update: publicProcedure
      .input(updateSellerInputSchema)
      .mutation(({ input }) => updateSeller(input)),
    
    // Ban a seller
    ban: publicProcedure
      .input(banSellerInputSchema)
      .mutation(({ input }) => banSeller(input))
  }),

  // Number management routes
  numbers: router({
    // Get all numbers
    getAll: publicProcedure
      .query(() => getNumbers()),
    
    // Get number by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getNumberById(input.id)),
    
    // Filter numbers
    filter: publicProcedure
      .input(filterNumbersInputSchema)
      .query(({ input }) => filterNumbers(input)),
    
    // Update number status
    updateStatus: publicProcedure
      .input(updateNumberStatusInputSchema)
      .mutation(({ input }) => updateNumberStatus(input))
  })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();