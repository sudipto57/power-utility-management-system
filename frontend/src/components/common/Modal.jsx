import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

/** Pop-up window. Closes with the X button, the Escape key, or a click outside. */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  // createPortal puts the pop-up straight into <body>, so it always covers the whole screen
  // (even when the button that opened it sits inside an animated box)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 bg-slate-50 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
