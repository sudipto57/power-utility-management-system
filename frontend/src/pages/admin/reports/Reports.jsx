import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { getBillReport, getCustomerReport, getPaymentReport } from '../../../api/reports';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import StatCard from '../../../components/common/StatCard';
import StatusBadge from '../../../components/common/StatusBadge';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import BarChart from '../../../components/charts/BarChart';
import LineChart from '../../../components/charts/LineChart';
import DoughnutChart from '../../../components/charts/DoughnutChart';
import { CHART_COLORS } from '../../../components/charts/colors';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';

// Okabe-Ito order: colour-blind safe, the strongest colours first
const PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.rose,
  CHART_COLORS.emerald,
  CHART_COLORS.violet,
  CHART_COLORS.amber,
  CHART_COLORS.sky,
  CHART_COLORS.sand,
];
const BILL_COLORS = {
  Paid: CHART_COLORS.emerald,
  Unpaid: CHART_COLORS.amber,
  'Partially Paid': CHART_COLORS.sky,
  Overdue: CHART_COLORS.rose,
};

/** Feature 15: customer, bill and payment summaries. */
export default function Reports() {
  const customers = useFetch(getCustomerReport);
  const bills = useFetch(getBillReport);
  const payments = useFetch(getPaymentReport);

  const charts = useMemo(() => {
    if (!customers.data || !bills.data || !payments.data) return null;
    return {
      customerTypes: {
        labels: customers.data.by_type.map((t) => t.customer_type),
        values: customers.data.by_type.map((t) => t.count),
        colors: [CHART_COLORS.violet, CHART_COLORS.blue],
      },
      billsByMonth: {
        labels: bills.data.by_month.map((m) => m.month),
        series: [{ label: 'Billed', data: bills.data.by_month.map((m) => m.billed), color: CHART_COLORS.rose }],
      },
      billStatus: {
        labels: bills.data.by_status.map((s) => s.status),
        values: bills.data.by_status.map((s) => s.count),
        colors: bills.data.by_status.map((s) => BILL_COLORS[s.status] || CHART_COLORS.sand),
      },
      paymentsByMonth: {
        labels: payments.data.by_month.map((m) => m.month),
        series: [{ label: 'Collected', data: payments.data.by_month.map((m) => m.collected), color: CHART_COLORS.emerald }],
      },
      paymentMethods: {
        labels: payments.data.by_method.map((m) => m.method),
        values: payments.data.by_method.map((m) => m.amount),
        colors: payments.data.by_method.map((_, i) => PALETTE[i % PALETTE.length]),
      },
    };
  }, [customers.data, bills.data, payments.data]);

  const failed = customers.error || bills.error || payments.error;
  if (failed) {
    return (
      <ErrorState
        message={failed}
        onRetry={() => {
          customers.reload();
          bills.reload();
          payments.reload();
        }}
      />
    );
  }
  if (!charts) return <PageSkeleton />;

  const b = bills.data;
  const p = payments.data;
  const c = customers.data;
  const collectionRate = b.total_billed > 0 ? Math.round((b.total_collected / b.total_billed) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Simple customer, bill and payment summaries straight from the database."
        actions={
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total billed"
          value={b.total_billed}
          format="money"
          icon="receipt"
          tone="amber"
          hint={`${formatNumber(b.total_bills)} bills`}
        />
        <StatCard
          label="Collected"
          value={b.total_collected}
          format="money"
          icon="wallet"
          tone="emerald"
          hint={`${collectionRate}% of billed`}
          delay={70}
        />
        <StatCard
          label="Outstanding"
          value={b.total_outstanding}
          format="money"
          icon="alert"
          tone="rose"
          hint={b.total_late_fees > 0 ? `Still to collect, incl. ${formatMoney(b.total_late_fees)} late fees` : 'Still to collect'}
          delay={140}
        />
        <StatCard
          label="VAT billed"
          value={b.total_tax}
          format="money"
          icon="file"
          tone="sky"
          hint={`Avg payment ${formatMoney(p.average_payment)}`}
          delay={210}
        />
      </div>

      {/* ---------- Customer summary ---------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sand-500">Customer summary</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Customers by type" className="animate-fade-up">
            <DoughnutChart {...charts.customerTypes} height={240} />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {c.by_status.map((s) => (
                <span key={s.status} className="flex items-center gap-2 text-xs text-sand-600">
                  <StatusBadge status={s.status} /> {s.count}
                </span>
              ))}
            </div>
          </Card>
          <Card
            title="Top customers by amount billed"
            subtitle="From the customer_billing_summary view"
            bodyClassName="overflow-x-auto p-0"
            className="animate-fade-up lg:col-span-2"
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-sand-100 text-left text-[11px] font-bold uppercase tracking-wider text-sand-500">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 text-right">Bills</th>
                  <th className="px-5 py-3 text-right">Billed</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {c.top_customers.map((row, index) => {
                  const max = c.top_customers[0]?.total_billed || 1;
                  return (
                    <tr key={row.customer_id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-5 py-3">
                        <Link
                          to={`/admin/customers/${row.customer_id}`}
                          className="font-semibold text-sand-800 hover:text-sky-600"
                        >
                          {row.full_name}
                        </Link>
                        {/* little bar = share of the biggest customer */}
                        <div className="mt-1.5 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-sand-100">
                          <div
                            className="h-full origin-left animate-grow rounded-full bg-amber-400"
                            style={{ width: `${Math.max((row.total_billed / max) * 100, 2)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">{row.total_bills}</td>
                      <td className="px-5 py-3 text-right">{formatMoney(row.total_billed)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">{formatMoney(row.total_paid)}</td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${row.outstanding_amount > 0 ? 'text-rose-600' : 'text-sand-500'}`}
                      >
                        {formatMoney(row.outstanding_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      {/* ---------- Bill summary ---------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sand-500">Bill summary</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Amount billed per month" subtitle="By billing period" className="animate-fade-up lg:col-span-2">
            {charts.billsByMonth.labels.length ? (
              <BarChart {...charts.billsByMonth} height={260} />
            ) : (
              <EmptyState icon="receipt" title="No bills yet" />
            )}
          </Card>
          <Card title="Bills by status" className="animate-fade-up">
            {charts.billStatus.values.length ? (
              <DoughnutChart {...charts.billStatus} height={260} />
            ) : (
              <EmptyState icon="receipt" title="No bills yet" />
            )}
          </Card>
        </div>
      </section>

      {/* ---------- Payment summary ---------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sand-500">Payment summary</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Money collected per month" subtitle="By payment date" className="animate-fade-up lg:col-span-2">
            {charts.paymentsByMonth.labels.length ? (
              <LineChart {...charts.paymentsByMonth} height={260} />
            ) : (
              <EmptyState icon="wallet" title="No payments yet" />
            )}
          </Card>
          <Card title="By payment method" className="animate-fade-up">
            {charts.paymentMethods.values.length ? (
              <DoughnutChart {...charts.paymentMethods} height={260} />
            ) : (
              <EmptyState icon="wallet" title="No payments yet" />
            )}
          </Card>
        </div>
        <Card title="Latest payments" bodyClassName="p-0" className="animate-fade-up">
          {p.recent.length === 0 ? (
            <EmptyState icon="wallet" title="No payments yet" />
          ) : (
            <ul className="divide-y divide-sand-100">
              {p.recent.map((pay) => (
                <li key={pay.id}>
                  <Link
                    to={`/admin/bills/${pay.bill_id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-3 text-sm transition hover:bg-sand-50"
                  >
                    <span className="font-mono text-xs font-bold text-sand-500">{pay.payment_number}</span>
                    <span className="flex-1 font-semibold text-sand-800">{pay.customer_name}</span>
                    <span className="text-xs text-sand-500">
                      {pay.bill_number} · {pay.method} · {formatDate(pay.payment_date)}
                    </span>
                    <span className="font-bold text-emerald-600">{formatMoney(pay.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
