import { useState } from 'react';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

/**
 * "▶ Watch demo" button. Opens a pop-up with a short screen recording of the website.
 * The video file lives in frontend/public/videos/. `dark` = white button for the dark "How it works" band.
 */
export default function WatchDemoButton({ dark = false }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${
          dark
            ? 'bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20'
            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-orange-300'
        }`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white">
          <Icon name="play" className="h-3 w-3 translate-x-px" />
        </span>
        Watch demo
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Power Utility Management System in 1 minute" size="lg">
        {/* controls = play / pause / full screen. The poster shows while the video loads. */}
        <video
          className="w-full rounded-2xl bg-slate-900 ring-1 ring-slate-200"
          src="/videos/demo.mp4"
          poster="/videos/demo-poster.jpg"
          controls
          autoPlay
          muted
          playsInline
        />
        <p className="mt-3 text-xs font-semibold text-slate-500">
          A quick tour: the first page, the Customer portal and the Admin panel (sample data).
        </p>
      </Modal>
    </>
  );
}
