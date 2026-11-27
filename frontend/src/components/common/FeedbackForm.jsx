import { useState } from 'react';
import useToast from '../../hooks/useToast';
import { sendFeedback } from '../../api/feedback';
import Button from './Button';
import Icon from './Icon';
import FormError from './FormError';
import { Field, Input, Select, Textarea } from './FormField';
import { FEEDBACK_TOPICS } from '../../utils/options';

const RATING_WORDS = ['', 'Poor', 'Could be better', 'Okay', 'Good', 'Excellent'];

/**
 * The feedback form, used on the first page and in the customer portal.
 * name / email = filled in already for a logged-in customer (they can still change them).
 */
export default function FeedbackForm({ name = '', email = '' }) {
  const toast = useToast();
  const [form, setForm] = useState({ rating: 0, topic: '', message: '', name, email });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.rating) return setError('Please choose from 1 to 5 stars.');
    if (!form.topic) return setError('Please choose what your feedback is about.');
    if (form.message.trim().length < 10) return setError('Please write at least 10 characters.');

    setSending(true);
    try {
      await sendFeedback(form);
      toast.success('Thank you. Your feedback reached our team.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="animate-scale-in py-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-lg font-extrabold text-sand-900">Thank you for your feedback</h3>
        <p className="mt-1 text-sm text-sand-500">Our team reads every message and uses it to improve Sparkility.</p>
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => {
            setForm({ rating: 0, topic: '', message: '', name, email });
            setSent(false);
          }}
        >
          Send more feedback
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={error} />

      <div>
        <span className="mb-1.5 block text-xs font-bold text-sand-700">
          How do you like Sparkility? <span className="text-rose-500">*</span>
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setForm((f) => ({ ...f, rating: star }))}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              aria-pressed={form.rating === star}
              className={`text-3xl leading-none transition hover:scale-110 ${star <= form.rating ? 'text-amber-400' : 'text-sand-300'}`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-sand-500">{RATING_WORDS[form.rating]}</span>
        </div>
      </div>

      <Field label="What is it about?" required>
        <Select value={form.topic} onChange={set('topic')} options={FEEDBACK_TOPICS} placeholder="Choose a topic" />
      </Field>

      <Field label="Your feedback" required hint="What works well, what is hard to use, or an idea for later.">
        <Textarea value={form.message} onChange={set('message')} maxLength={2000} placeholder="Tell us what you think..." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" hint="Optional">
          <Input value={form.name} onChange={set('name')} maxLength={100} autoComplete="name" />
        </Field>
        <Field label="Your email" hint="Optional, only if you want an answer">
          <Input type="email" value={form.email} onChange={set('email')} maxLength={255} autoComplete="email" />
        </Field>
      </div>

      <Button type="submit" variant="accent" icon="send" loading={sending}>
        Send feedback
      </Button>
    </form>
  );
}
