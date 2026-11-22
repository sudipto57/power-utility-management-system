import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { formatNumber } from '../../utils/format';

// Typical power (watts) and hours a day for common appliances in a Bangladeshi home.
// Units (kWh) a month = watts x how many x hours a day x 30 days / 1000
const APPLIANCES = [
  { name: 'Ceiling fan', icon: '🌀', watts: 75, count: 3, hours: 10 },
  { name: 'LED bulb', icon: '💡', watts: 10, count: 6, hours: 6 },
  { name: 'Refrigerator', icon: '🧊', watts: 150, count: 1, hours: 12 }, // the motor runs about half the day
  { name: 'Television', icon: '📺', watts: 100, count: 1, hours: 5 },
  {
    name: 'Air conditioner (1.5 ton)',
    icon: '❄️',
    watts: 1500,
    count: 0,
    hours: 6,
  },
  { name: 'Water pump', icon: '🚰', watts: 750, count: 0, hours: 1 },
  { name: 'Iron', icon: '👔', watts: 1000, count: 1, hours: 0.5 },
  { name: 'Rice cooker', icon: '🍚', watts: 700, count: 1, hours: 1 },
  { name: 'Computer or laptop', icon: '💻', watts: 60, count: 1, hours: 6 },
  { name: 'Washing machine', icon: '🫧', watts: 500, count: 0, hours: 1 },
];

function monthlyUnits(item) {
  return (item.watts * item.count * item.hours * 30) / 1000;
}

// Small "-  3  +" control
function Stepper({ value, onChange, step = 1, max, label }) {
  const change = (amount) => onChange(Math.min(max, Math.max(0, Math.round((value + amount) * 10) / 10)));
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => change(-step)}
        className="h-7 w-7 rounded-lg bg-slate-100 font-extrabold text-slate-600 hover:bg-slate-200"
        aria-label={`Less ${label}`}
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-extrabold text-slate-900">{value}</span>
      <button
        type="button"
        onClick={() => change(step)}
        className="h-7 w-7 rounded-lg bg-slate-100 font-extrabold text-slate-600 hover:bg-slate-200"
        aria-label={`More ${label}`}
      >
        +
      </button>
    </div>
  );
}

/**
 * "Not sure how many units you use?" pop-up.
 * The customer counts their appliances and hours; onUse(units) sends the total back to the calculator.
 */
export default function ApplianceHelper({ open, onClose, onUse }) {
  const [items, setItems] = useState(APPLIANCES);

  const update = (index, field, value) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const total = Math.round(items.reduce((sum, item) => sum + monthlyUnits(item), 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Count your appliances"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => setItems(APPLIANCES)}>
            Start again
          </Button>
          <Button variant="accent" icon="check" onClick={() => onUse(total)}>
            Use {formatNumber(total)} kWh
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-500">How many of each do you have, and for how many hours a day are they on?</p>
      <div className="mt-4 max-h-[50vh] divide-y divide-slate-100 overflow-y-auto pr-1">
        {items.map((item, index) => (
          <div key={item.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
            <span className="text-xl" aria-hidden="true">
              {item.icon}
            </span>
            <div className="min-w-36 flex-1">
              <p className="text-sm font-bold text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{formatNumber(item.watts)} W each</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">How many</p>
              <Stepper value={item.count} max={20} label={`${item.name} count`} onChange={(v) => update(index, 'count', v)} />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Hours a day</p>
              <Stepper
                value={item.hours}
                step={0.5}
                max={24}
                label={`${item.name} hours`}
                onChange={(v) => update(index, 'hours', v)}
              />
            </div>
            <p className="w-20 text-right text-sm font-extrabold text-slate-900">
              {formatNumber(Math.round(monthlyUnits(item)))} kWh
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
        <span className="text-sm font-bold text-slate-600">About this much a month</span>
        <span className="font-display text-2xl font-extrabold text-slate-900">{formatNumber(total)} kWh</span>
      </div>
    </Modal>
  );
}
