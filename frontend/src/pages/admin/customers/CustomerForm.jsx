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
import PhoneInput from '../../../components/common/PhoneInput';
import RuleList from '../../../components/common/RuleList';
import { fullPhone, loadCountries, phoneProblem, splitPhone } from '../../../utils/phone';
import { allRulesOk, emailProblem, passwordRules, usernameRules } from '../../../utils/accountRules';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../../../utils/options';

const EMPTY = {
  full_name: '',
  phone_country: 'BD', // the phone number is saved with its country code: +8801712345678
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
    // The country list is needed to split "+8801712345678" into +880 and 1712345678
    Promise.all([getCustomer(id), loadCountries()])
      .then(([c, countries]) => {
        if (!active) return;
        const phone = splitPhone(c.phone, countries);
        setForm({
          ...EMPTY,
          full_name: c.full_name,
          phone_country: phone.country,
          phone: phone.number,
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
    const phoneError = phoneProblem(form.phone_country, form.phone);
    if (phoneError) return setError(phoneError);
    if (form.email.trim() && emailProblem(form.email)) return setError(emailProblem(form.email));
    if (!isEdit && form.create_login) {
      // Same rules as the sign up form and the backend
      if (!form.email.trim()) return setError('An email is required to create a login.');
      if (!allRulesOk(usernameRules(form.username))) return setError('The username does not follow the rules under the box.');
      if (!allRulesOk(passwordRules(form.password, aboutLogin))) {
        return setError('The password does not follow the rules under the box.');
      }
    }

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        phone: await fullPhone(form.phone_country, form.phone), // +880 and 1712345678 -> +8801712345678
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

  // Personal details that may not be part of the password
  const aboutLogin = { username: form.username, email: form.email, fullName: form.full_name, phone: form.phone };

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
            <Field label="Phone" required className="sm:col-span-2">
              <PhoneInput
                country={form.phone_country}
                number={form.phone}
                onChange={({ country, number }) => setForm((f) => ({ ...f, phone_country: country, phone: number }))}
              />
            </Field>
            <Field
              label="Email"
              required={form.create_login || hasLogin}
              hint={hasLogin ? 'Also used to log in.' : undefined}
              className="sm:col-span-2"
            >
              <Input type="email" value={form.email} onChange={set('email')} placeholder="name@email.com" />
            </Field>
            <Field label="Address" required className="sm:col-span-2" hint="House / road, area, city">
              <Textarea rows={2} value={form.address} onChange={set('address')} placeholder="House 12, Road 5, Khilkhet, Dhaka" />
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
                <div>
                  <Field label="Username" required>
                    <Input value={form.username} onChange={set('username')} placeholder="rahim.uddin" autoComplete="off" />
                  </Field>
                  {form.username && <RuleList rules={usernameRules(form.username)} />}
                </div>
                <div>
                  <Field label="Password" required>
                    <Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
                  </Field>
                  {form.password && <RuleList rules={passwordRules(form.password, aboutLogin)} />}
                </div>
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
