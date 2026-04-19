import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Auto-recovery from ChunkLoadError : après un déploiement, les anciens chunks
// référencés par le main.js cached n'existent plus → on force un reload pour
// récupérer le nouveau main.js avec les bons hashes.
const isChunkError = (err) => {
  const msg = (err?.message || err?.toString?.() || '').toLowerCase();
  return msg.includes('chunkloaderror') || msg.includes('loading chunk') || msg.includes('failed to fetch dynamically imported module');
};

const tryReload = () => {
  const KEY = 'chunk_reload_at';
  const now = Date.now();
  const last = parseInt(sessionStorage.getItem(KEY) || '0', 10);
  // Limite : 1 reload max toutes les 10 secondes (évite boucle infinie)
  if (now - last < 10000) return;
  sessionStorage.setItem(KEY, String(now));
  window.location.reload();
};

window.addEventListener('error', (event) => {
  if (isChunkError(event.error || event)) tryReload();
});
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkError(event.reason)) tryReload();
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
