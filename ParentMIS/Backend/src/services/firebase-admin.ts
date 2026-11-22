import { getApp, getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function getFirebaseAdmin(): App | null {
  try {
    if (!getApps().length) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
      const serviceAccount = parseServiceAccount();

      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({
          projectId,
        });
      } else {
        return null;
      }
    }

    return getApp();
  } catch {
    return null;
  }
}

export async function sendFirebaseNotification({
  tokens,
  title,
  body,
  data,
}: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const app = getFirebaseAdmin();
  if (!app || tokens.length === 0) return { success: 0, failure: 0, invalid: 0, invalidTokens: [] as string[] };

  const validTokens = tokens.filter((token) => Boolean(token && token.trim()));
  if (!validTokens.length) return { success: 0, failure: 0, invalid: 0, invalidTokens: [] as string[] };

  const message = {
    notification: { title, body },
    data: data ?? {},
    tokens: validTokens,
  };

  try {
    const result = await getMessaging(app).sendEachForMulticast(message);
    const invalidTokens: string[] = [];
    result.responses.forEach((response, idx) => {
      const code = response.error?.code;
      if (
        !response.success &&
        (code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered')
      ) {
        invalidTokens.push(validTokens[idx]);
      }
    });

    return {
      success: result.successCount,
      failure: result.failureCount,
      invalid: invalidTokens.length,
      invalidTokens,
    };
  } catch (error) {
    console.warn('[fcm] sendEachForMulticast failed', error);
    return { success: 0, failure: validTokens.length, invalid: 0, invalidTokens: [] as string[] };
  }
}
