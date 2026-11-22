import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Field, Textarea } from './FormField';

/**
 * Pop-up that asks for a short, optional note before an action (e.g. rejecting a reading).
 * onConfirm(note) runs when the button is pressed. Use a new `key` for every opening to start empty.
 */
export default function NoteDialog({
  open,
  title,
  message,
  label = 'Note for the customer (optional)',
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}) {
  const [note, setNote] = useState('');
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(note)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="mb-4 text-sm text-sand-600">{message}</p>}
      <Field label={label}>
        <Textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
    </Modal>
  );
}
