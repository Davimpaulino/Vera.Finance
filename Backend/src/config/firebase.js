import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { env, hasFirebaseCredentials } from './env.js';
import { MemoryFirestore } from './memoryStore.js';

export const demoMode = !hasFirebaseCredentials;

let db;
let auth = null;

if (demoMode) {
  db = new MemoryFirestore();
} else {
  const credential = env.firebase.privateKey
    ? cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey
      })
    : applicationDefault();
  const app = initializeApp({ credential, projectId: env.firebase.projectId || undefined });
  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  auth = getAuth(app);
}

export { db, auth };
