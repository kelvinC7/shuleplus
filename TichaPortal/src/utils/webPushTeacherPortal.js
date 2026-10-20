import { kazi } from "../services/kaziApi";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushEnvironmentSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getTeacherPortalPushState() {
  if (!isWebPushEnvironmentSupported()) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }
  const perm = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return { supported: true, permission: perm, subscribed: false };
    }
    const sub = await reg.pushManager.getSubscription();
    return { supported: true, permission: perm, subscribed: !!sub };
  } catch {
    return { supported: true, permission: perm, subscribed: false };
  }
}

export async function subscribeTeacherPortalPush() {
  if (!isWebPushEnvironmentSupported()) {
    throw new Error("This browser does not support Web Push.");
  }
  const res = await kazi.get("/api/employee/push/vapid-key");
  if (!res.data?.success || !res.data?.publicKey) {
    throw new Error(res.data?.message || "Web Push is not enabled on the server.");
  }
  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked. Enable them in your browser settings for this site.");
  }
  if (Notification.permission === "default") {
    const p = await Notification.requestPermission();
    if (p !== "granted") {
      throw new Error("Permission was not granted for notifications.");
    }
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(res.data.publicKey),
  });
  await kazi.post("/api/employee/push/subscribe", sub.toJSON());
  return sub;
}

export async function unsubscribeTeacherPortalPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  try {
    await kazi.post("/api/employee/push/unsubscribe", { endpoint: json.endpoint });
  } finally {
    await sub.unsubscribe();
  }
}
