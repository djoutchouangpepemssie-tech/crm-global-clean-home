import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAU845opATFO-Bw5rm69Hq6N_fBXt8tko4",
  authDomain: "crm-global-clean-home.firebaseapp.com",
  projectId: "crm-global-clean-home",
  storageBucket: "crm-global-clean-home.firebasestorage.app",
  messagingSenderId: "737152396042",
  appId: "1:737152396042:web:8d2d91b42808b4db23a8f3"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BPRzgpdBSA4TPc6anT7-MPxJpiIAi6dEnWppLsJ6jmMJUpAg8xqE0S2sga2_DqavcLh29dgpcx_a1P24h9iZ_wA'
      });
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Notification permission error:', error);
    return null;
  }
};

/**
 * Écouter les messages FCM de manière continue.
 * Retourne une fonction unsubscribe.
 *
 * Ancienne version (bugguée) retournait une Promise qui ne résolvait qu'UNE
 * fois, donc seule la première notification déclenchait l'invalidation
 * React Query. Toutes les suivantes étaient perdues.
 */
export const onForegroundMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    try { callback(payload); } catch (e) { console.error('FCM handler error:', e); }
  });
};

// Compat : ancienne API Promise-based, gardée pour ne rien casser ailleurs.
// NE PAS UTILISER pour les nouvelles intégrations.
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export default messaging;
