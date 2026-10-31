import { getStorage } from 'firebase-admin/storage';
import { database } from '../lib/server.mjs';
import { createTechHandler } from '../lib/tech-handler.mjs';
export default createTechHandler({ getDatabase: () => database().db, getBucket: () => { database(); return getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_PROJECT_ID + '.firebasestorage.app'); } });
export const config = { rateLimit: { action: 'rate_limit', aggregateBy: ['ip','domain'], windowSize: 60, windowLimit: 60 } };
