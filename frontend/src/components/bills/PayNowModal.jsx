import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Icon from '../common/Icon';
import FormError from '../common/FormError';
import { Field, Input } from '../common/FormField';
import { payMyBill } from '../../api/my';
import { formatMoney } from '../../utils/format';

// The customer pays the FULL balance. Demo only: no real money moves.
// We never ask for a card number or PIN: only the transaction reference from the payment message.
const METHODS = [
  { value: 'Mobile Banking', icon: 'phone', text: 'bKash, Nagad, Rocket ...' },
  { value: 'Card', icon: 'wallet', text: 'Visa, Mastercard, Amex' },
];

/** Render with key={bill.id}. onPaid(updatedBill) runs after the payment is sent. */
export default function PayNowModal({ bill, onClose, onPaid }) {
  const [method, setMethod] = useState('Mobile Banking');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setSaving(true);
    setError('');
    try {
      onPaid(await payMyBill(bill.id, { method, reference }));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={`Pay ${bill.bill_number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" icon="send" loading={saving} onClick={handlePay} disabled={reference.trim().length < 4}>
            Send payment
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
        <span className="text-sm font-semibold text-sand-600">Amount to pay (full balance)</span>
        <span className="font-display text-2xl font-extrabold text-sand-900">{formatMoney(bill.balance)}</span>
      </div>

      <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-sand-500">1. How do you pay?</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {METHODS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMethod(item.value)}
            className={`flex items-center gap-3 rounded-2xl p-3 text-left ring-2 transition ${
              method === item.value ? 'bg-orange-50 ring-orange-400' : 'bg-white ring-sand-200 hover:ring-sand-300'
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-orange-600">
              <Icon name={item.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold text-sand-900">{item.value}</span>
              <span className="block text-xs text-sand-500">{item.text}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-sand-500">2. Pay, then type the reference</p>
      <Field label="Transaction reference" hint="The transaction ID from your payment message, e.g. TRX8K2M4P9" className="mt-2">
        <Input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={50} placeholder="TRX8K2M4P9" />
      </Field>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs font-semibold leading-relaxed text-sand-600 ring-1 ring-sky-100">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <span>
          Demo payment: no real money is taken. We never ask for your card number or PIN. The office checks the reference and
          confirms it; then the bill shows as Paid and your receipt is ready.
        </span>
      </div>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}
