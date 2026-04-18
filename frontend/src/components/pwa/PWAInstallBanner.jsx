import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Wifi, WifiOff, Bell } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Detecter si deja installe
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    // Detecter connexion
    window.addEventListener("online", () => setIsOffline(false));
    window.addEventListener("offline", () => setIsOffline(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (isInstalled) return null;

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-xs font-bold text-white" style={{background:"#c2410c"}}>
          <WifiOff className="w-3.5 h-3.5" />
          Mode hors-ligne — Certaines fonctions indisponibles
        </div>
      )}

      {showBanner && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-[9998] bg-white border border-neutral-200 rounded-xl p-4 shadow-2xl border border-brand-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-neutral-500 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-100">Installer le CRM</p>
              <p className="text-xs text-neutral-500 mt-0.5">Acces rapide depuis votre ecran d accueil</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-all">
                  <Download className="w-3.5 h-3.5" /> Installer
                </button>
                <button onClick={handleDismiss}
                  className="px-3 py-1.5 bg-white text-neutral-400 text-xs rounded-lg hover:bg-neutral-50 transition-all">
                  Plus tard
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-neutral-600 hover:text-neutral-400 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    window.addEventListener("online", () => setIsOffline(false));
    window.addEventListener("offline", () => setIsOffline(true));
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:"rgba(194,65,12,0.1)",color:"#c2410c",border:"1px solid rgba(194,65,12,0.2)"}}>
      <WifiOff className="w-3.5 h-3.5" />
      Hors-ligne
    </div>
  );
}

export default PWAInstallBanner;
