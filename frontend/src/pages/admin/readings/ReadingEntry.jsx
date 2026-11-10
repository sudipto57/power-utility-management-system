import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import { getConnections } from '../../../api/connections';
import { createReading, getLastReading } from '../../../api/readings';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import FormError from '../../../components/common/FormError';
import ErrorState from '../../../components/common/ErrorState';
import Skeleton, { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Input, Select } from '../../../components/common/FormField';
import { formatDate, formatNumber, todayISO } from '../../../utils/format';

/** Feature 8: enter previous/current meter reading (previous is filled automatically). */
export default function ReadingEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [connectionId, setConnectionId] = useState(searchParams.get('connection') || '');
  // Last reading of the chosen meter: { connectionId, info: { previous_reading, last_reading_date, is_first_reading } }
  const [lastResult, setLastResult] = useState({ connectionId: '', info: null });
  const last = connectionId && lastResult.connectionId === connectionId ? lastResult.info : null;
  const lastLoading = Boolean(connectionId) && lastResult.connectionId !== connectionId;

  const [form, setForm] = useState({ previous_reading: '0', current_reading: '', reading_date: todayISO(), notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  // Active connections for the dropdown
  useEffect(() => {
    let active = true;
    getConnections({ status: 'Active' })
      .then((list) => active && setConnections(list))
      .catch((err) => active && setLoadError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // When a meter is chosen, ask the backend for its last reading
  useEffect(() => {
    if (!connectionId) return undefined;
    let active = true;
    getLastReading(connectionId)
      .then((info) => {
        if (!active) return;
        setLastResult({ connectionId, info });
        setForm((f) => ({ ...f, previous_reading: String(info.previous_reading) }));
      })
      .catch((err) => {
        if (!active) return;
        setLastResult({ connectionId, info: null });
        setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [connectionId]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const previous = Number(form.previous_reading) || 0;
  const current = form.current_reading === '' ? null : Number(form.current_reading);
  const consumption = current === null ? null : current - previous;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!connectionId) return setError('Please choose a meter.');
    if (current === null || !Number.isInteger(current) || current < 0) return setError('Current reading must be a whole number.');
    if (current < previous)
      return setError(`Current reading cannot be lower than the previous reading (${formatNumber(previous)}).`);
    if (!form.reading_date) return setError('Please choose the reading date.');

    setSaving(true);
    try {
      const reading = await createReading({
        connection_id: connectionId,
        previous_reading: last?.is_first_reading ? previous : undefined,
        current_reading: current,
        reading_date: form.reading_date,
        notes: form.notes,
      });
      toast.success(`Reading saved: ${formatNumber(reading.consumption)} kWh used`);
      setSaved(reading);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForAnother = () => {
    setSaved(null);
    setConnectionId('');
    setForm({ previous_reading: '0', current_reading: '', reading_date: todayISO(), notes: '' });
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <ErrorState message={loadError} />;

  // ---------- Success screen ----------
  if (saved) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <div className="animate-scale-in rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="check" className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">Reading saved</h2>
          <p className="mt-1 text-sm text-slate-500">
            {saved.meter_number} · {saved.customer_name} · {formatDate(saved.reading_date)}
          </p>
          <p className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900">
            {formatNumber(saved.consumption)}
            <span className="ml-2 text-lg font-bold text-slate-400">kWh used</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {formatNumber(saved.previous_reading)} → {formatNumber(saved.current_reading)}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" icon="plus" onClick={resetForAnother}>
              Enter another
            </Button>
            <Button variant="accent" icon="receipt" onClick={() => navigate(`/admin/bills/generate?reading=${saved.id}`)}>
              Generate bill now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const options = connections.map((co) => ({ value: co.id, label: `${co.meter_number} · ${co.customer_name}` }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back="/admin/readings"
        title="Enter meter reading"
        subtitle="The previous reading is filled in from the last saved reading."
      />
      <form onSubmit={handleSubmit} noValidate>
        <Card className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Meter" required className="sm:col-span-2" hint="Only Active connections are listed.">
              <Select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                options={options}
                placeholder="Choose a meter..."
              />
            </Field>

            <Field
              label="Previous reading (kWh)"
              hint={
                last
                  ? last.is_first_reading
                    ? 'First reading for this meter: type the starting value (usually 0).'
                    : `Last reading on ${formatDate(last.last_reading_date)}`
                  : undefined
              }
            >
              {lastLoading ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <Input
                  type="number"
                  min="0"
                  value={form.previous_reading}
                  onChange={set('previous_reading')}
                  disabled={!last || !last.is_first_reading}
                />
              )}
            </Field>
            <Field label="Current reading (kWh)" required>
              <Input
                type="number"
                min="0"
                value={form.current_reading}
                onChange={set('current_reading')}
                placeholder="e.g. 2950"
                disabled={!connectionId}
              />
            </Field>
            <Field label="Reading date" required>
              <Input type="date" value={form.reading_date} onChange={set('reading_date')} max={todayISO()} />
            </Field>
            <Field label="Notes">
              <Input value={form.notes} onChange={set('notes')} placeholder="Optional" />
            </Field>
          </div>

          {/* Live consumption preview */}
          <div
            className={`mt-6 flex items-center justify-between rounded-2xl px-5 py-4 transition-colors ${
              consumption !== null && consumption < 0 ? 'bg-rose-50 ring-1 ring-rose-100' : 'bg-slate-950 text-white'
            }`}
          >
            <span className="flex items-center gap-3 text-sm font-semibold">
              <Icon
                name="bolt"
                className={`h-5 w-5 ${consumption !== null && consumption < 0 ? 'text-rose-500' : 'text-amber-300'}`}
              />
              Consumption
            </span>
            <span className={`text-2xl font-extrabold ${consumption !== null && consumption < 0 ? 'text-rose-600' : ''}`}>
              {consumption === null ? '—' : `${formatNumber(consumption)} kWh`}
            </span>
          </div>
        </Card>

        <div className="mt-6 space-y-4">
          <FormError message={error} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" icon="check" loading={saving} disabled={!connectionId}>
              Save reading
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
