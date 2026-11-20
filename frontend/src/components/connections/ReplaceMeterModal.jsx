import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import { Field, Input, Textarea } from '../common/FormField';
import { replaceMeter } from '../../api/connections';
import { formatNumber, todayISO } from '../../utils/format';

/**
 * "Replace meter": a broken meter is swapped for a new one on the same connection.
 * The database function replace_meter() saves the old meter's final reading (billed as usual),
 * keeps a history row and puts the new meter number on the connection.
 */
export default function ReplaceMeterModal({ connection, onClose, onReplaced }) {
  const [form, setForm] = useState({
    new_meter_number: '',
    old_meter_final_reading: '',
    new_meter_start_reading: '0',
    replaced_on: todayISO(),
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await replaceMeter(connection.id, form);
      onReplaced(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={saving ? undefined : onClose}
      title={`Replace meter ${connection.meter_number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="accent" icon="refresh" loading={saving} onClick={handleSave}>
            Replace meter
          </Button>
        </>
      }
    >
      <p className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
        The old meter&apos;s last reading is saved as a normal reading, so those units are still billed. Readings after
        today start from the new meter&apos;s start reading.
        {connection.last_reading !== null && connection.last_reading !== undefined && (
          <span className="mt-1 block font-semibold text-slate-800">
            Last reading of the old meter: {formatNumber(connection.last_reading)} kWh
          </span>
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Old meter's final reading" required>
          <Input type="number" min="0" value={form.old_meter_final_reading} onChange={set('old_meter_final_reading')} />
        </Field>
        <Field label="Replacement date" required>
          <Input type="date" value={form.replaced_on} onChange={set('replaced_on')} max={todayISO()} />
        </Field>
        <Field label="New meter number" hint="Leave empty to get the next number automatically">
          <Input value={form.new_meter_number} onChange={set('new_meter_number')} maxLength={20} />
        </Field>
        <Field label="New meter's start reading" hint="Usually 0 for a brand-new meter">
          <Input type="number" min="0" value={form.new_meter_start_reading} onChange={set('new_meter_start_reading')} />
        </Field>
        <Field label="Reason (optional)" className="sm:col-span-2">
          <Textarea value={form.reason} onChange={set('reason')} rows={2} maxLength={500} />
        </Field>
      </div>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </Modal>
  );
}
