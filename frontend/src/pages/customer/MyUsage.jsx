// Meter & Usage: the customer sends their own meter reading (it waits as Pending until the office
// checks it), sees how much they used this month so far, the bill it is heading for, a price warning
// before the next tariff band, and a bill calculator with the appliance helper.
import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useToast from '../../hooks/useToast';
import { getMyUsage, sendMyReading } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import StatusBadge from '../../components/common/StatusBadge';
import MeterDigits from '../../components/common/MeterDigits';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import BillCalculator from '../../components/common/BillCalculator';
import { PageSkeleton } from '../../components/common/Skeleton';
import { Field, Input } from '../../components/common/FormField';
import { formatDate, formatMoney, formatNumber, todayISO } from '../../utils/format';

/** "Send today's reading" form for one meter */
function ReadingForm({ meter, onSent }) {
  const toast = useToast();
  const [reading, setReading] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const official = meter.official_reading;

  const send = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await sendMyReading({ connection_id: meter.id, current_reading: reading, reading_date: date });
      toast.success('Reading sent. The office will check it');
      setReading('');
      onSent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!official) {
    return <p className="text-sm text-sand-500">You can send readings after the office takes the first reading of this meter.</p>;
  }
  if (meter.status !== 'Active') {
    return <p className="text-sm text-sand-500">This meter is {meter.status.toLowerCase()}, so no readings are needed.</p>;
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Number on your meter (kWh)" hint={`Last official: ${formatNumber(official.current_reading)} kWh`}>
          <Input
            type="number"
            min={official.current_reading}
            value={reading}
            onChange={(event) => setReading(event.target.value)}
            placeholder={String(official.current_reading)}
            required
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={date}
            min={official.reading_date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" variant="accent" icon="send" loading={saving} disabled={!reading}>
        Send reading
      </Button>
    </form>
  );
}

/** Units so far, projection and the price warning */
function MonthSoFar({ meter }) {
  if (meter.units_so_far === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-sand-50 p-5 text-center ring-1 ring-sand-200">
        <Icon name="gauge" className="h-8 w-8 text-orange-500" />
        <p className="mt-2 font-bold text-sand-800">Send today's reading to see this month so far</p>
        {meter.last_month_units !== null && (
          <p className="mt-1 text-sm text-sand-500">Your last bill was for {formatNumber(meter.last_month_units)} kWh.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="keep-dark rounded-2xl bg-gradient-to-br from-sand-900 to-indigo-950 p-5 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">This month so far</p>
        <p className="mt-1 font-display text-4xl font-extrabold">
          {formatNumber(meter.units_so_far)} <span className="text-lg text-sand-300">kWh</span>
        </p>
        <p className="text-sm text-sand-300">
          in {meter.days_so_far} day{meter.days_so_far === 1 ? '' : 's'}, since {formatDate(meter.official_reading.reading_date)}
        </p>
      </div>
      <div className="rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
        <p className="text-xs font-bold text-sand-500">At this pace, a full month (30 days) is about</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <span className="font-display text-2xl font-extrabold text-sand-900">{formatNumber(meter.projected_units)} kWh</span>
          <span className="text-sm font-bold text-sand-600">
            Bill ≈ <b className="font-display text-xl text-orange-700">{formatMoney(meter.projected_bill.total_amount)}</b>
          </span>
        </div>
      </div>
      {meter.warning && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{meter.warning}</span>
        </div>
      )}
    </div>
  );
}

/** Last readings of one meter (official and the customer's own) */
function ReadingHistory({ readings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-sand-500">
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3 text-right">Reading</th>
            <th className="py-2 pr-3 text-right">Used</th>
            <th className="py-2 pr-3">Sent by</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-100">
          {readings.map((r) => (
            <tr key={r.id}>
              <td className="py-2 pr-3 font-semibold text-sand-800">{formatDate(r.reading_date)}</td>
              <td className="py-2 pr-3 text-right font-mono font-bold text-sand-900">{formatNumber(r.current_reading)}</td>
              <td className="py-2 pr-3 text-right text-sand-600">{formatNumber(r.consumption)} kWh</td>
              <td className="py-2 pr-3 text-sand-600">{r.recorded_by_role === 'customer' ? 'You' : 'Office'}</td>
              <td className="py-2">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MyUsage() {
  const { data: meters, loading, error, reload } = useFetch(getMyUsage);

  if (loading && !meters) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const first = meters[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Meter & usage" subtitle="Send your meter reading, see this month so far and work out a bill." />

      {meters.length === 0 && (
        <Card>
          <EmptyState icon="plug" title="No meters yet" text="Your meters appear here after the office connects your service." />
        </Card>
      )}

      {meters.map((meter, index) => (
        <Card
          key={meter.id}
          title={`Meter ${meter.meter_number}`}
          subtitle={`${meter.connection_type} · ${meter.customer_type}`}
          actions={<StatusBadge status={meter.status} />}
          className="animate-fade-up"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              {meter.official_reading && (
                <div>
                  <p className="text-xs font-bold text-sand-500">
                    Last official reading · {formatDate(meter.official_reading.reading_date)}
                  </p>
                  <div className="mt-2">
                    <MeterDigits value={meter.official_reading.current_reading} />
                  </div>
                </div>
              )}
              {meter.own_reading && (
                <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm ring-1 ring-sky-100">
                  <Icon name="clock" className="h-4 w-4 shrink-0 text-sky-700" />
                  <span className="text-sand-700">
                    You sent <b>{formatNumber(meter.own_reading.current_reading)} kWh</b> on{' '}
                    {formatDate(meter.own_reading.reading_date)}. The office will check it.
                  </span>
                </div>
              )}
              <ReadingForm meter={meter} onSent={reload} />
            </div>
            <MonthSoFar meter={meter} />
          </div>

          {meter.readings.length > 0 && (
            <div className="mt-6 border-t border-sand-100 pt-4">
              <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-sand-500">Recent readings</p>
              <ReadingHistory readings={meter.readings} />
            </div>
          )}
        </Card>
      ))}

      {/* The calculator has its own boxes, so it is not put inside a Card */}
      <section className="animate-fade-up">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="mt-1 h-4 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-rose-500" />
          <div>
            <h2 className="text-[15px] font-extrabold text-sand-900">Bill calculator</h2>
            <p className="mt-0.5 text-xs font-medium text-sand-500">Try other amounts, or count your appliances</p>
          </div>
        </div>
        <BillCalculator
          key={first?.id}
          initialCustomerType={first?.customer_type || 'Residential'}
          initialConnectionType={first?.connection_type || 'Single Phase'}
          initialUnits={first?.projected_units ?? first?.last_month_units ?? 250}
        />
      </section>
    </div>
  );
}
