import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import './Toast.css';

/**
 * Small toast system used instead of window.alert().
 *   const toast = useToast(); toast.success('Saved'); toast.error('Could not save');
 * Outside React components, `import { toast } from '../components/Toast'` works too once the
 * provider is mounted (it is, in App.jsx).
 */
const ToastContext = createContext(null);
let external = null;

export const toast = {
  show: (msg, opts) => external?.show(msg, opts),
  success: (msg, opts) => external?.show(msg, { ...opts, tone: 'success' }),
  error: (msg, opts) => external?.show(msg, { ...opts, tone: 'error' }),
  info: (msg, opts) => external?.show(msg, { ...opts, tone: 'info' }),
};

const ICONS = { success: 'check-circle', error: 'alert-triangle', info: 'info' };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((message, { tone = 'info', duration } = {}) => {
    const id = ++idRef.current;
    setItems((list) => [...list.slice(-3), { id, message: String(message || ''), tone }]);
    const ms = duration ?? (tone === 'error' ? 7000 : 4000);
    if (ms > 0) setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);
  const api = useMemo(() => ({
    show,
    dismiss,
    success: (m, o) => show(m, { ...o, tone: 'success' }),
    error: (m, o) => show(m, { ...o, tone: 'error' }),
    info: (m, o) => show(m, { ...o, tone: 'info' }),
  }), [show, dismiss]);

  useEffect(() => {
    external = api;
    return () => { if (external === api) external = null; };
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="wt-toasts" role="region" aria-label="Notifications">
        {items.map((t) => (
          <div key={t.id} className={`wt-toast wt-toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'} aria-live={t.tone === 'error' ? 'assertive' : 'polite'}>
            <Icon name={ICONS[t.tone] || 'info'} size={18} />
            <span className="wt-toast__msg">{t.message}</span>
            <button type="button" className="wt-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) || toast;
}
