import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useToast from '../../../hooks/useToast';
import { createCustomer, getCustomer, updateCustomer } from '../../../api/customers';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import FormError from '../../../components/common/FormError';
import ErrorState from '../../../components/common/ErrorState';
import { PageSkeleton } from '../../../components/common/Skeleton';
import { Field, Input, Select, Textarea } from '../../../components/common/FormField';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../../../utils/options';

const EMPTY = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  customer_type: 'Residential',
  status: 'Active',
  create_login: false,
  username: '',
  password: '',
};

/** One form for both "Add customer" (/new) and "Edit customer" (/:id/edit). */
export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [hasLogin, setHasLogin] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    getCustomer(id)
      .then((c) => {
        if (!active) return;
        setForm({
          ...EMPTY,
          full_name: c.full_name,
          phone: c.phone,
          email: c.email || '',
          address: c.address,
          customer_type: c.customer_type,
          status: c.status,
        });
        setHasLogin(Boolean(c.user_id));
      })
      .catch((err) => active && setLoadError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Quick checks before we bother the server
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Name, phone and address are required.');
      return;
    }
    if (!isEdit && form.create_login) {
      if (!form.email.trim()) return setError('An email is required to create a login.');
      if (form.username.trim().length < 3) return setError('Username must be at least 3 characters.');
      // Same rule as the sign up form and the backend: 8+ characters with a letter and a number
      if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        return setError('Password needs 8+ characters with at least one letter and one number.');
      }
    }

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        customer_type: form.customer_type,
        status: form.status,
      };
      const saved = isEdit
        ? await updateCustomer(id, payload)
        : await createCustomer({ ...payload, create_login: form.create_login, username: form.username, password: form.password });
      toast.success(isEdit ? 'Customer updated' : `Customer ${saved.customer_number} created`);
      navigate(`/admin/customers/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={isEdit ? `/admin/customers/${id}` : '/admin/customers'}
        title={isEdit ? 'Edit customer' : 'Add customer'}
        subtitle={isEdit ? 'Update the customer profile.' : 'A customer ID (CUST-...) is created automatically.'}
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card className="animate-fade-up" title="Customer profile" style={{ animationDelay: '60ms' }}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required className="sm:col-span-2">
              <Input value={form.full_name} onChange={set('full_name')} placeholder="e.g. Rahim Uddin" maxLength={100} />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={set('phone')} placeholder="01712345678" maxLength={20} />
            </Field>
            <Field label="Email" required={form.create_login || hasLogin} hint={hasLogin ? 'Also used to log in.' : undefined}>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="name@email.com" />
            </Field>
            <Field label="Address" required className="sm:col-span-2">
              <Textarea rows={2} value={form.address} onChange={set('address')} placeholder="Street, city" />
            </Field>
            <Field label="Customer type" required>
              <Select value={form.customer_type} onChange={set('customer_type')} options={CUSTOMER_TYPES} />
            </Field>
            <Field label="Account status" required>
              <Select value={form.status} onChange={set('status')} options={CUSTOMER_STATUSES} />
            </Field>
          </div>
        </Card>

        {!isEdit && (
          <Card className="mt-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.create_login}
                onChange={set('create_login')}
                className="mt-1 h-4 w-4 accent-amber-500"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-bold text-sand-900">
                  <Icon name="key" className="h-4 w-4 text-amber-500" /> Create a login for this customer
                </span>
                <span className="mt-0.5 block text-xs text-sand-500">
                  They can then log in to see their bills and send service requests.
                </span>
              </span>
            </label>
            {form.create_login && (
              <div className="mt-5 grid animate-fade-up gap-5 sm:grid-cols-2">
                <Field label="Username" required hint="Letters, numbers, dot, dash or underscore">
                  <Input value={form.username} onChange={set('username')} placeholder="rahim.uddin" autoComplete="off" />
                </Field>
                <Field label="Password" required hint="8+ characters with a letter and a number">
                  <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
                </Field>
              </div>
            )}
          </Card>
        )}

        <div className="mt-6 space-y-4">
          <FormError message={error} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" icon="check" loading={saving}>
              {isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
