import { useRef, useState } from 'react';
import Icon from './Icon';
import useToast from '../../hooks/useToast';
import { initials } from '../../utils/format';

const SIZE = 320; // pictures are saved as a 320 x 320 JPEG (about 30-80 KB)

const SHAPES = {
  md: 'h-16 w-16 rounded-2xl text-xl', // customer profile header (admin)
  lg: 'h-24 w-24 rounded-3xl text-3xl', // My profile card (customer)
};

/**
 * Makes a small square JPEG (as a data URL) from the chosen file:
 * cuts the middle square out of the picture and shrinks it to 320 x 320.
 */
async function shrinkPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // fails when the file is not a picture the browser can read
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // see-through PNG parts become white, not black
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Profile picture with a camera button to add or change it (initials when there is no picture).
 * <ProfilePhoto name="Deep Kumar" photo={c.photo} onSave={(dataUrl) => api(...)} onRemove={() => api(...)} />
 * onSave / onRemove return the backend answer: { photo } (the saved picture, or null).
 */
export default function ProfilePhoto({ name, photo, onSave, onRemove, size = 'md', dark = false }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [current, setCurrent] = useState(photo || null);
  const [busy, setBusy] = useState(false);

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still works
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Please choose a JPG, PNG or WebP picture');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('The picture is too large (10 MB at most)');
      return;
    }
    setBusy(true);
    try {
      const result = await onSave(await shrinkPicture(file));
      setCurrent(result.photo);
      toast.success('Profile picture saved');
    } catch (err) {
      toast.error(err.message || 'This picture could not be read. Please try another one');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onRemove();
      setCurrent(null);
      toast.success('Profile picture removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative">
        {current ? (
          <img
            src={current}
            alt={`Profile picture of ${name}`}
            className={`${SHAPES[size]} keep-dark object-cover shadow-lg ring-2 ring-white/80`}
          />
        ) : (
          <span
            className={`${SHAPES[size]} keep-dark flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500 font-extrabold text-sand-900 shadow-lg shadow-amber-500/30`}
          >
            {initials(name)}
          </span>
        )}
        {busy && (
          <span className={`${SHAPES[size]} absolute inset-0 flex items-center justify-center bg-sand-950/60 text-[11px] font-bold text-white`}>
            Saving...
          </span>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sand-800 shadow-md ring-1 ring-sand-200 transition hover:scale-105 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
          aria-label={current ? 'Change profile picture' : 'Add a profile picture'}
          title={current ? 'Change profile picture' : 'Add a profile picture'}
        >
          <Icon name="camera" className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="hidden" />
      </div>
      {current && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={`mt-1 text-[11px] font-bold hover:underline disabled:opacity-60 ${dark ? 'text-sand-400 hover:text-white' : 'text-sand-500 hover:text-rose-600'}`}
        >
          Remove picture
        </button>
      )}
    </div>
  );
}
