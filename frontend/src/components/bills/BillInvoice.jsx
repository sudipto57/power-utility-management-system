import Logo from '../common/Logo';
import StatusBadge from '../common/StatusBadge';
import useCountUp from '../../hooks/useCountUp';
import { formatDate, formatMoney, formatNumber } from '../../utils/format';

/** Printable bill. Used by the admin "Bill details" page and the customer "My bill" page. */
export default function BillInvoice({ bill }) {
  const isPaid = bill.status === 'Paid';
  const animatedTotal = useCountUp(bill.total_amount); // the total counts up when the bill opens

  return (
    <article className="print-area relative animate-fade-up overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {/* Coloured top strip */}
      <div className="h-2 bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500" />

      <div className="p-6 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <Logo />
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Electricity bill</p>
            <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">{bill.bill_number}</p>
            <div className="mt-2 flex justify-end">
              <StatusBadge status={bill.status} />
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed to</p>
            <p className="mt-2 font-bold text-slate-900">{bill.customer_name}</p>
            <p className="text-sm text-slate-600">{bill.customer_number}</p>
            <p className="mt-1 text-sm text-slate-600">{bill.customer_address}</p>
            <p className="text-sm text-slate-600">{bill.customer_phone}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Service</p>
            <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Meter</dt>
              <dd className="text-right font-mono font-bold text-slate-900">{bill.meter_number}</dd>
              <dt className="text-slate-500">Connection</dt>
              <dd className="text-right text-slate-800">{bill.connection_type}</dd>
              <dt className="text-slate-500">Period</dt>
              <dd className="text-right text-slate-800">
                {formatDate(bill.billing_period_start)} – {formatDate(bill.billing_period_end)}
              </dd>
              <dt className="text-slate-500">Due date</dt>
              <dd className={`text-right font-bold ${bill.status === 'Overdue' ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatDate(bill.due_date)}
              </dd>
            </dl>
          </div>
        </div>

        {/* Meter reading strip */}
        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {[
            ['Previous reading', bill.previous_reading],
            ['Current reading', bill.current_reading],
            ['Units used', bill.consumption],
          ].map(([label, value], i) => (
            <div key={label} className={`p-4 text-center ${i === 2 ? 'bg-slate-950 text-white' : 'bg-white'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${i === 2 ? 'text-amber-300' : 'text-slate-400'}`}>
                {label}
              </p>
              <p className="mt-1 text-xl font-extrabold">
                {value === null || value === undefined ? '-' : `${formatNumber(value)}${i === 2 ? ' kWh' : ''}`}
              </p>
            </div>
          ))}
        </div>

        {/* Charges (+ a "PAID" stamp in the empty middle when fully paid) */}
        <div className="relative">
          {isPaid && (
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rotate-[-12deg] animate-scale-in rounded-xl border-4 border-emerald-500/60 px-5 py-1 text-3xl font-black tracking-[0.25em] text-emerald-500/60">
              PAID
            </div>
          )}
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-slate-700">Fixed monthly charge</td>
                <td className="py-3 text-right text-slate-800">{formatMoney(bill.fixed_charge)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-700">
                  Energy charge
                  {bill.consumption !== null && bill.consumption !== undefined && (
                    <span className="text-slate-400"> ({formatNumber(bill.consumption)} kWh, slab tariff)</span>
                  )}
                </td>
                <td className="py-3 text-right text-slate-800">{formatMoney(bill.variable_charge)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-700">VAT</td>
                <td className="py-3 text-right text-slate-800">{formatMoney(bill.tax_amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900">
                <td className="pt-4 text-base font-extrabold text-slate-900">Total</td>
                <td className="pt-4 text-right font-display text-xl font-extrabold text-slate-900">
                  <span className="tabular-nums print:hidden">{formatMoney(animatedTotal)}</span>
                  {/* The printed copy always shows the exact amount */}
                  <span className="hidden print:inline">{formatMoney(bill.total_amount)}</span>
                </td>
              </tr>
              {/* Late fee (added by the database when the bill became Overdue) and its waiver */}
              {bill.late_fee > 0 && (
                <tr>
                  <td className="pt-2 text-slate-500">Late fee</td>
                  <td className="pt-2 text-right font-semibold text-rose-600">+ {formatMoney(bill.late_fee)}</td>
                </tr>
              )}
              {bill.waived > 0 && (
                <tr>
                  <td className="pt-1 text-slate-500">Late fee waived</td>
                  <td className="pt-1 text-right font-semibold text-emerald-600">- {formatMoney(bill.waived)}</td>
                </tr>
              )}
              <tr>
                <td className="pt-2 text-slate-500">Paid</td>
                <td className="pt-2 text-right font-semibold text-emerald-600">{formatMoney(bill.paid_amount)}</td>
              </tr>
              <tr>
                <td className="pt-1 font-bold text-slate-700">Balance due</td>
                <td className={`pt-1 text-right font-extrabold ${bill.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatMoney(bill.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {bill.payments?.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payments</p>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {bill.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-mono text-xs font-bold text-slate-500">{p.payment_number}</span>
                  <span className="text-slate-600">
                    {formatDate(p.payment_date)} · {p.method}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  {/* Online payments wait (Pending) until staff confirm them; Failed ones never count */}
                  {p.status !== 'Completed' && <StatusBadge status={p.status} />}
                  <span
                    className={`font-bold ${p.status === 'Completed' ? 'text-emerald-600' : p.status === 'Failed' ? 'text-slate-400 line-through' : 'text-amber-700'}`}
                  >
                    {formatMoney(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 border-t border-dashed border-slate-200 pt-4 text-center text-xs text-slate-400">
          {bill.notes} · Thank you for using Power Utility Management System
        </p>
      </div>
    </article>
  );
}
