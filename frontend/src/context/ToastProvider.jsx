import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './toast-context';
import Icon from '../components/common/Icon';

// Small pop-up messages in the top-right corner ("Customer saved").
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove]
  );

  const value = useMemo(
    () => ({ success: (message) => show('success', message), error: (message) => show('error', message) }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3 print:hidden">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl shadow-slate-900/20"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            >
              <Icon name={toast.type === 'error' ? 'alert' : 'check'} className="h-3.5 w-3.5" />
            </span>
            <p className="flex-1 leading-6">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="text-slate-400 transition hover:text-white"
              aria-label="Close message"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
