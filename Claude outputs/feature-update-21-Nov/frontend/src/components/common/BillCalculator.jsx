// Bill calculator: units -> bill, slab by slab, from the real tariff (GET /api/tariffs/estimate).
// Used on the first page (bill estimator) and on the customer's Meter & Usage page.
// "Count my appliances" opens ApplianceHelper, which works out the units for you.
import { useState } from 'react';
import Icon from './Icon';
import ApplianceHelper from './ApplianceHelper';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import useCountUp from '../../hooks/useCountUp';
import { estimateBill } from '../../api/tariffs';
import { formatMoney, formatNumber } from '../../utils/format';

// One pill button of a two-choice switch (Residential / Commercial ...)
function Choice({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-xl py-2 text-sm font-bold transition ${
            value === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const QUICK_UNITS = [100, 250, 500, 1000];

export default function BillCalculator({
  initialCustomerType = 'Residential',
  initialConnectionType = 'Single Phase',
  initialUnits = 250,
}) {
  const [customerType, setCustomerType] = useState(initialCustomerType);
  const [connectionType, setConnectionType] = useState(initialConnectionType);
  const [units, setUnits] = useState(initialUnits);
  const [helperOpen, setHelperOpen] = useState(false);
  const debouncedUnits = useDebounce(units, 300); // ask the server only after the user stops typing

  // The numbers come from the database bill function (same as a real bill)
  const { data, loading, error } = useFetch(
    () => estimateBill({ customer_type: customerType, connection_type: connectionType, units: debouncedUnits }),
    [customerType, connectionType, debouncedUnits]
  );
  const total = useCountUp(data?.total_amount ?? 0, 700);

  const setUnitsFromInput = (text) => {
    const number = Math.round(Number(text));
    setUnits(Number.isFinite(number) ? Math.min(Math.max(number, 0), 100000) : 0);
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Inputs */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Customer type</p>
          <div className="mt-2">
            <Choice options={['Residential', 'Commercial']} value={customerType} onChange={setCustomerType} />
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Connection</p>
          <div className="mt-2">
            <Choice options={['Single Phase', 'Three Phase']} value={connectionType} onChange={setConnectionType} />
          </div>

          <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-500">Units used this month</p>
          <div className="mt-2 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-orange-400">
            <Icon name="bolt" className="h-5 w-5 text-orange-500" />
            <input
              type="number"
              min="0"
              max="100000"
              value={units}
              onChange={(event) => setUnitsFromInput(event.target.value)}
              className="w-full bg-transparent font-display text-2xl font-extrabold text-slate-900 focus:outline-none"
              aria-label="Units used (kWh)"
            />
            <span className="font-bold text-slate-400">kWh</span>
          </div>
          <input
            type="range"
            min="0"
            max="1500"
            step="10"
            value={Math.min(units, 1500)}
            onChange={(event) => setUnits(Number(event.target.value))}
            className="mt-4 w-full accent-orange-500"
            aria-label="Units slider"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_UNITS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setUnits(value)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  units === value
                    ? 'bg-slate-900 text-white dark:bg-orange-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value} kWh
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-orange-100">
            <div className="flex items-start gap-3">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>
                Not sure how many units you use? Look for <b className="text-slate-800">Units used</b> on any of your bills, or
                count your fans, lights and other appliances.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHelperOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-orange-700 shadow-sm ring-1 ring-orange-200 transition hover:ring-orange-400"
            >
              <Icon name="calculator" className="h-3.5 w-3.5" /> Count my appliances
            </button>
          </div>
        </div>

        {/* Result */}
        <div
          className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 transition-opacity lg:col-span-3 ${loading ? 'opacity-70' : ''}`}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Estimated bill</p>
              <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(total)}</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-100">
              {formatNumber(units)} kWh · {customerType} · {connectionType}
            </span>
          </div>

          {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

          {data && (
            <>
              {/* Slab by slab: each bar shows how many of the units fall in that slab */}
              <div className="mt-6 space-y-3">
                {data.slabs.map((slab) => (
                  <div key={slab.slab_order}>
                    <div className="flex justify-between text-xs font-bold">
                      <span className={slab.units > 0 ? 'text-slate-700' : 'text-slate-400'}>
                        {/* a one-band tariff (Commercial) starts at 0 and has no end: every unit costs the same */}
                        {slab.end_unit === null && slab.start_unit <= 1
                          ? 'Every'
                          : slab.end_unit === null
                            ? `Above ${formatNumber(slab.start_unit - 1)}`
                            : `${formatNumber(slab.start_unit)}–${formatNumber(slab.end_unit)}`}{' '}
                        kWh · {formatMoney(slab.rate_per_unit)} each
                      </span>
                      <span className={slab.units > 0 ? 'text-slate-900' : 'text-slate-400'}>
                        {formatNumber(slab.units)} kWh = {formatMoney(slab.amount)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      {slab.units > 0 && (
                        <div
                          key={`${data.units}-${data.customer_type}-${data.connection_type}`} // replay the animation for every new estimate
                          className="h-full origin-left animate-grow rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                          style={{
                            width: `${(slab.units / Math.max(data.units, 1)) * 100}%`,
                            animationDelay: `${slab.slab_order * 80}ms`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Fixed monthly charge</dt>
                  <dd className="font-bold text-slate-800">{formatMoney(data.fixed_charge)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Energy charge</dt>
                  <dd className="font-bold text-slate-800">{formatMoney(data.variable_charge)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">VAT</dt>
                  <dd className="font-bold text-slate-800">{formatMoney(data.tax_amount)}</dd>
                </div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base">
                  <dt className="font-extrabold text-slate-900">Total</dt>
                  <dd className="font-display font-extrabold text-slate-900">{formatMoney(data.total_amount)}</dd>
                </div>
              </dl>
            </>
          )}
          <p className="mt-4 text-xs font-semibold text-slate-400">
            An estimate from today's tariff. Your real bill uses your own meter readings.
          </p>
        </div>
      </div>
      <ApplianceHelper
        open={helperOpen}
        onClose={() => setHelperOpen(false)}
        onUse={(total) => {
          setUnits(Math.min(total, 100000));
          setHelperOpen(false);
        }}
      />
    </>
  );
}
