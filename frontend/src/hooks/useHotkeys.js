/**
 * useHotkeys — raccourcis clavier globaux pour le CRM.
 *
 * Convention :
 *   - Une touche simple = action (pas de modifier)
 *   - Combos préfixés par "g" (go) pour la navigation : g+l = leads, g+d = dashboard
 *   - ⌘K / Ctrl+K = palette de commande (déjà gérée par cmdk)
 *   - "c" = action de création contextuelle
 *   - "/" = focus recherche
 *   - "?" = ouvrir la liste des raccourcis
 *
 * Conçu pour être utilisé au niveau global (App.jsx) avec un dispatcher.
 */
import { useEffect, useRef } from 'react';

/**
 * Bindings globaux : {sequence: action}
 *
 * @param {Object} bindings - mapping touche → callback
 * @param {boolean} enabled - activer/désactiver
 *
 * Exemples de sequence :
 *   "mod+k"      → Cmd+K ou Ctrl+K
 *   "g l"        → g puis l (navigation)
 *   "/"          → slash
 *   "shift+?"    → Shift + ?
 *   "escape"     → touche Echap
 */
export function useHotkeys(bindings, enabled = true) {
  const bindingsRef = useRef(bindings);
  const sequenceRef = useRef('');
  const sequenceTimerRef = useRef(null);

  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;

    const isTypingInField = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e) => {
      // On laisse toujours passer Echap et Cmd/Ctrl+K même en saisie
      const isEscape = e.key === 'Escape';
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';

      if (isTypingInField(e.target) && !isEscape && !isModK) {
        return;
      }

      // Construction de la clé de binding
      const mod = e.metaKey || e.ctrlKey ? 'mod+' : '';
      const shift = e.shiftKey ? 'shift+' : '';
      const alt = e.altKey ? 'alt+' : '';
      const key = e.key.toLowerCase();

      const directKey = `${mod}${shift}${alt}${key}`;

      // Match direct (ex: "mod+k")
      if (bindingsRef.current[directKey]) {
        e.preventDefault();
        bindingsRef.current[directKey](e);
        sequenceRef.current = '';
        return;
      }

      // Séquence multi-touches (ex: "g l")
      if (!mod && !alt) {
        const prev = sequenceRef.current;
        const sequence = prev ? `${prev} ${key}` : key;

        if (bindingsRef.current[sequence]) {
          e.preventDefault();
          bindingsRef.current[sequence](e);
          sequenceRef.current = '';
          if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
          return;
        }

        // Début potentiel de séquence (ex: on vient de presser "g")
        const hasSequenceStart = Object.keys(bindingsRef.current).some(
          (b) => b.startsWith(`${key} `)
        );
        if (hasSequenceStart) {
          sequenceRef.current = key;
          if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
          sequenceTimerRef.current = setTimeout(() => {
            sequenceRef.current = '';
          }, 1000);
          return;
        }
      }

      // Aucun match : reset
      sequenceRef.current = '';
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    };
  }, [enabled]);
}

export default useHotkeys;
