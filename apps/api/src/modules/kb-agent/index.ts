/**
 * Health Chat Module (KB Agent)
 *
 * AI-powered health assistant that answers questions about
 * the user's biomarkers, supplements, routines, and goals.
 */

export { healthChatService } from './services/healthChatService';
export { healthChatController } from './controllers/healthChatController';
export { default as healthChatRoutes } from './routes';
export * from './types';
