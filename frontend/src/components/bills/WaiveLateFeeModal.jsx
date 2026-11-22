import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { Field, Textarea } from '../common/FormField';
import { waiveLateFee } from '../../api/bills';
import { formatMoney } from '../../utils/format';

/**
 * "Waive late fee": the office cancels a bill's late fee (e.g. the customer paid late
 * because of a bank problem). The database keeps both rows (late fee + waiver) as history.
 */
export default function WaiveLateFeeModal({ bill, onClose, onWaived }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await waiveLateFee(bill.id, reason);
      onWaived(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={`Waive the late fee of ${bill.bill_number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={handleSave} disabled={!reason.trim()}>
            Waive late fee
          </Button>
        </>
      }
    >
      <div className="mb-5 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
        <span className="text-sm font-semibold text-rose-800">Late fee to remove</span>
        <span className="text-xl font-extrabold text-rose-700">{formatMoney(bill.late_fee)}</span>
      </div>
      <Field label="Reason" required hint="Saved with the bill and shown in the activity log">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
      </Field>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}
