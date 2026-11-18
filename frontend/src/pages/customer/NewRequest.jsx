import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useToast from '../../hooks/useToast';
import { createMyRequest } from '../../api/my';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import FormError from '../../components/common/FormError';
import { Field, Textarea } from '../../components/common/FormField';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../../utils/options';

const CATEGORY_ICONS = {
  'Power Outage': 'bolt',
  'Meter Issue': 'gauge',
  'Connection Issue': 'plug',
  'Billing Inquiry': 'receipt',
  'General Complaint': 'complaint',
  'New Connection Request': 'plus',
  'Disconnection Request': 'x',
};

/** Feature 12: customer submits a service request / complaint. */
export default function NewRequest() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ category: '', priority: 'Medium', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.category) return setError('Please choose what the request is about.');
    if (form.description.trim().length < 10) return setError('Please describe the problem in at least 10 characters.');

    setSaving(true);
    try {
      const created = await createMyRequest(form);
      toast.success(`Request ${created.request_number} sent. We will update you here.`);
      navigate(`/my/requests/${created.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back="/my/requests" title="New service request" subtitle="Tell us what is wrong. Our team will follow up." />
      <form onSubmit={handleSubmit} noValidate>
        <Card title="What is it about?" className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {REQUEST_CATEGORIES.map((category, index) => {
              const selected = form.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category }))}
                  className={`flex animate-fade-up flex-col items-start gap-3 rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 ${
                    selected
                      ? 'bg-slate-950 text-white shadow-lg ring-slate-950 dark:bg-orange-500 dark:ring-orange-500'
                      : 'bg-white text-slate-700 ring-slate-200 hover:ring-amber-300'
                  }`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <Icon name={CATEGORY_ICONS[category]} className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold">{category}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Details" className="mt-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="space-y-5">
            <Field label="How urgent is it?">
              <div className="flex flex-wrap gap-2">
                {REQUEST_PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority }))}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                      form.priority === priority
                        ? 'bg-slate-900 text-white shadow dark:bg-orange-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Describe the problem"
              required
              hint={`${form.description.trim().length} / 2000 characters (at least 10)`}
            >
              <Textarea
                rows={5}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. No power on my street since 6 AM. Neighbours are also affected."
              />
            </Field>
          </div>
        </Card>

        <div className="mt-6 space-y-4">
          <FormError message={error} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" icon="send" loading={saving}>
              Send request
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
