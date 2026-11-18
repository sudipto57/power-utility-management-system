import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import { getReadings } from '../../../api/readings';
import { generateBill, previewBill } from '../../../api/bills';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import FormError from '../../../components/common/FormError';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import Skeleton, { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Input, Select } from '../../../components/common/FormField';
import { addDaysISO, formatDate, formatMoney, formatNumber, todayISO } from '../../../utils/format';

/** Feature 9: pick a reading -> see the calculated amounts -> save the bill. */
export default function GenerateBill() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [readingId, setReadingId] = useState(searchParams.get('reading') || '');
  const [dueDate, setDueDate] = useState(addDaysISO(20));
  // Result of the last preview: which reading it was for + the amounts (or an error)
  const [previewResult, setPreviewResult] = useState({ readingId: '', data: null, error: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isCurrent = readingId !== '' && previewResult.readingId === readingId;
  const preview = isCurrent ? previewResult.data : null;
  const previewing = readingId !== '' && !isCurrent;
  const error = saveError || (isCurrent ? previewResult.error : '');

  // Readings that do not have a bill yet
  useEffect(() => {
    let active = true;
    getReadings({ billed: 'no' })
      .then((list) => active && setReadings(list))
      .catch((err) => active && setLoadError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Calculate the bill as soon as a reading is chosen (nothing is saved yet)
  useEffect(() => {
    if (!readingId) return undefined;
    let active = true;
    previewBill(readingId)
      .then((data) => active && setPreviewResult({ readingId, data, error: '' }))
      .catch((err) => active && setPreviewResult({ readingId, data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, [readingId]);

  const chooseReading = (id) => {
    setSaveError('');
    setReadingId(id);
  };

  const handleGenerate = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const bill = await generateBill({ reading_id: readingId, due_date: dueDate });
      toast.success(
        `Bill ${bill.bill_number} created: ${formatMoney(bill.total_amount)}` +
          (bill.email_sent ? ` · emailed to ${bill.customer_email}` : bill.customer_email ? ' · email could not be sent' : ' · no email on file')
      );
      navigate(`/admin/bills/${bill.id}`);
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <ErrorState message={loadError} />;

  const options = readings.map((r) => ({
    value: r.id,
    label: `${r.meter_number} · ${r.customer_name} · ${formatDate(r.reading_date)} · ${formatNumber(r.consumption)} kWh`,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back="/admin/bills"
        title="Generate bill"
        subtitle="Bills are calculated from the tariff slabs in the database (calculate_bill_amount)."
      />

      {readings.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt"
            title="Every reading already has a bill"
            text="Enter a new meter reading first, then come back here."
            action={
              <Button variant="accent" icon="gauge" to="/admin/readings/new">
                Enter reading
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="animate-fade-up lg:col-span-2" title="1. Choose a reading" style={{ animationDelay: '60ms' }}>
            <div className="space-y-5">
              <Field label="Reading waiting for a bill" required>
                <Select
                  value={readingId}
                  onChange={(e) => chooseReading(e.target.value)}
                  options={options}
                  placeholder="Choose..."
                />
              </Field>
              <Field label="Due date" required hint="Default: 20 days from today">
                <Input type="date" value={dueDate} min={todayISO()} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="animate-fade-up lg:col-span-3" title="2. Check the amounts" style={{ animationDelay: '120ms' }}>
            {!readingId && (
              <EmptyState icon="info" title="Choose a reading" text="The bill amounts appear here before anything is saved." />
            )}
            {previewing && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            )}
            {preview && !previewing && (
              <div className="animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="font-bold text-slate-900">{preview.reading.customer_name}</p>
                    <p className="text-xs text-slate-500">
                      {preview.reading.customer_type} · {preview.reading.meter_number} ({preview.reading.connection_type})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Billing period</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(preview.billing_period_start)} – {formatDate(preview.billing_period_end)}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Units used</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatNumber(preview.reading.previous_reading)} → {formatNumber(preview.reading.current_reading)} ={' '}
                      {formatNumber(preview.reading.consumption)} kWh
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Fixed charge</dt>
                    <dd className="text-slate-800">{formatMoney(preview.fixed_charge)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Energy charge (slabs)</dt>
                    <dd className="text-slate-800">{formatMoney(preview.variable_charge)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">VAT</dt>
                    <dd className="text-slate-800">{formatMoney(preview.tax_amount)}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-white">
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon name="bolt" className="h-5 w-5 text-amber-300" /> Total
                  </span>
                  <span className="animate-scale-in text-2xl font-extrabold">{formatMoney(preview.total_amount)}</span>
                </div>
              </div>
            )}
            <div className="mt-5 space-y-4">
              <FormError message={error} />
              <div className="flex justify-end">
                <Button
                  variant="accent"
                  icon="receipt"
                  onClick={handleGenerate}
                  loading={saving}
                  disabled={!preview || previewing}
                >
                  Save bill
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
