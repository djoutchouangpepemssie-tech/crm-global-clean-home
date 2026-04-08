importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAU845opATFO-Bw5rm69Hq6N_fBXt8tko4",
  authDomain: "crm-global-clean-home.firebaseapp.com",
  projectId: "crm-global-clean-home",
  storageBucket: "crm-global-clean-home.firebasestorage.app",
  messagingSenderId: "737152396042",
  appId: "1:737152396042:web:8d2d91b42808b4db23a8f3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});
