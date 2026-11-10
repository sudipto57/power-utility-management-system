import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { Field, Input, Select } from '../common/FormField';
import { markBillPaid } from '../../api/bills';
import { PAYMENT_METHODS } from '../../utils/options';
import { formatMoney, todayISO } from '../../utils/format';

/**
 * Feature 11: "Mark as Paid". Records one payment for the remaining balance.
 * The database trigger then changes the bill status to Paid.
 * Render it with key={bill.id} so the form starts fresh for each bill.
 */
export default function MarkPaidModal({ bill, onClose, onPaid }) {
  const [form, setForm] = useState({ method: 'Cash', reference: '', payment_date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await markBillPaid(bill.id, form);
      onPaid(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={`Mark ${bill.bill_number} as paid`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="success" icon="check" loading={saving} onClick={handleSave}>
            Confirm payment
          </Button>
        </>
      }
    >
      <div className="mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <span className="text-sm font-semibold text-emerald-800">Amount to record</span>
        <span className="text-xl font-extrabold text-emerald-700">{formatMoney(bill.balance)}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment method">
          <Select value={form.method} onChange={set('method')} options={PAYMENT_METHODS} />
        </Field>
        <Field label="Payment date">
          <Input type="date" value={form.payment_date} onChange={set('payment_date')} max={todayISO()} />
        </Field>
        <Field label="Reference (optional)" className="sm:col-span-2" hint="e.g. receipt or transaction number">
          <Input value={form.reference} onChange={set('reference')} maxLength={100} />
        </Field>
      </div>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}
