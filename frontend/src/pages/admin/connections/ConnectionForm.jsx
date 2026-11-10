import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import { getCustomers } from '../../../api/customers';
import { createConnection, getConnection, updateConnection } from '../../../api/connections';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import FormError from '../../../components/common/FormError';
import ErrorState from '../../../components/common/ErrorState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Input, Select, Textarea } from '../../../components/common/FormField';
import { CONNECTION_STATUSES, CONNECTION_TYPES } from '../../../utils/options';
import { todayISO } from '../../../utils/format';

/** "New connection" (/new, optional ?customer=<id>) and "Edit connection" (/:id/edit). */
export default function ConnectionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    customer_id: searchParams.get('customer') || '',
    meter_number: '',
    connection_type: 'Single Phase',
    installation_date: todayISO(),
    status: 'Active',
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = isEdit
      ? getConnection(id).then((co) => {
          if (!active) return;
          setForm({
            customer_id: co.customer_id,
            meter_number: co.meter_number,
            connection_type: co.connection_type,
            installation_date: co.installation_date,
            status: co.status,
            notes: co.notes || '',
          });
          setCustomerName(`${co.customer_name} (${co.customer_number})`);
        })
      : getCustomers({ status: 'Active' }).then((list) => active && setCustomers(list));
    load.catch((err) => active && setLoadError(err.message)).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isEdit && !form.customer_id) return setError('Please choose a customer.');
    if (!form.installation_date) return setError('Please choose the installation date.');
    if (isEdit && !form.meter_number.trim()) return setError('Meter number cannot be empty.');

    setSaving(true);
    try {
      const saved = isEdit
        ? await updateConnection(id, {
            meter_number: form.meter_number,
            connection_type: form.connection_type,
            installation_date: form.installation_date,
            status: form.status,
            notes: form.notes,
          })
        : await createConnection(form);
      toast.success(isEdit ? 'Connection updated' : `Connection created with meter ${saved.meter_number}`);
      navigate(`/admin/connections/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <ErrorState message={loadError} />;

  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.full_name} (${c.customer_number})` }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={isEdit ? `/admin/connections/${id}` : '/admin/connections'}
        title={isEdit ? 'Edit connection' : 'New electricity connection'}
        subtitle={isEdit ? customerName : 'Create a service and register its meter.'}
      />
      <form onSubmit={handleSubmit} noValidate>
        <Card className="animate-fade-up" style={{ animationDelay: '60ms' }} title="Service & meter information">
          <div className="grid gap-5 sm:grid-cols-2">
            {!isEdit && (
              <Field label="Customer" required className="sm:col-span-2" hint="Only active customers are listed.">
                <Select
                  value={form.customer_id}
                  onChange={set('customer_id')}
                  options={customerOptions}
                  placeholder="Choose a customer..."
                />
              </Field>
            )}
            <Field
              label="Meter number"
              required={isEdit}
              hint={isEdit ? undefined : 'Leave empty to create one automatically (MET-....)'}
            >
              <Input
                value={form.meter_number}
                onChange={set('meter_number')}
                placeholder="MET-0001"
                maxLength={20}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Connection type" required>
              <Select value={form.connection_type} onChange={set('connection_type')} options={CONNECTION_TYPES} />
            </Field>
            <Field label="Installation date" required>
              <Input type="date" value={form.installation_date} onChange={set('installation_date')} />
            </Field>
            <Field label="Meter / service status" required>
              <Select value={form.status} onChange={set('status')} options={CONNECTION_STATUSES} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="e.g. Meter on the outside wall" />
            </Field>
          </div>
        </Card>
        <div className="mt-6 space-y-4">
          <FormError message={error} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" icon="check" loading={saving}>
              {isEdit ? 'Save changes' : 'Create connection'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
