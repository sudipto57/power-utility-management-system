import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import FormError from './FormError';
import { Field, Input } from './FormField';

/**
 * "Delete permanently" pop-up for a customer. The admin must type the customer number,
 * so nobody deletes a customer by mistake.
 * onDelete(typedNumber) returns a promise; an error message is shown in the pop-up.
 */
export default function DeleteForeverDialog({ open, customer, onCancel, onDelete }) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toUpperCase() === customer?.customer_number;

  const close = () => {
    if (deleting) return;
    setTyped('');
    setError('');
    onCancel();
  };

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await onDelete(typed.trim());
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Delete this customer for ever?"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" icon="trash" onClick={handleDelete} loading={deleting} disabled={!matches}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm leading-6 text-sand-600">
        <p className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 font-semibold text-rose-700 ring-1 ring-rose-200">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          This cannot be undone.
        </p>
        <p>
          <b className="text-sand-900">{customer?.full_name}</b> ({customer?.customer_number}) will be removed everywhere: the
          profile, the login, every meter, reading, bill, payment, request and inbox message, the activity history, and the copy
          in the SQL files.
        </p>
        <p>If you only want to stop the account, use Edit and set the status to Inactive instead.</p>
        <Field label={`Type ${customer?.customer_number} to confirm`}>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={customer?.customer_number}
            autoComplete="off"
            className="font-mono uppercase"
          />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
