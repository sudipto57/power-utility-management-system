// The Support part of the first page: anybody can describe a problem (and attach a picture or PDF).
//   1. fill in the form          -> a 4-digit code is emailed to the person
//   2. type the code             -> the problem goes to the office (pums.admins@gmail.com + the admin Support page)
//   3. done: a ticket number     -> when the office solves it, the reply comes by email
import { useState } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';
import FormError from '../common/FormError';
import { Field, Input, Select, Textarea } from '../common/FormField';
import { resendSupportCode, sendSupportProblem, verifySupportProblem } from '../../api/support';
import { emailProblem } from '../../utils/accountRules';
import { SUPPORT_CATEGORIES } from '../../utils/options';

const EMPTY = { name: '', email: '', category: '', subject: '', message: '' };
const FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_FILE_MB = 2;

/** Reads a chosen file as base64 text (what the backend expects). */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]); // "data:image/png;base64,AAAA" -> "AAAA"
    reader.onerror = () => reject(new Error('The file could not be read. Please choose it again.'));
    reader.readAsDataURL(file);
  });
}

function SupportForm() {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'code' | 'done'
  const [ticket, setTicket] = useState(null); // { id, email } then { ticket_number }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const chooseFile = (event) => {
    const chosen = event.target.files?.[0] || null;
    setError('');
    if (chosen && !FILE_TYPES.includes(chosen.type)) {
      setError('Please attach a PNG, JPG or PDF file.');
      event.target.value = '';
      return;
    }
    if (chosen && chosen.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`The file must be ${MAX_FILE_MB} MB or smaller.`);
      event.target.value = '';
      return;
    }
    setFile(chosen);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setError('');
    const problem =
      (!form.name.trim() && 'Please write your name.') ||
      emailProblem(form.email) ||
      (!form.category && 'Please choose what the problem is about.') ||
      (!form.subject.trim() && 'Please write a short subject.') ||
      (form.message.trim().length < 20 && 'Please describe the problem in at least 20 characters.');
    if (problem) return setError(problem);

    setBusy(true);
    try {
      const attachment = file ? { name: file.name, type: file.type, data: await readFile(file) } : undefined;
      const result = await sendSupportProblem({ ...form, attachment });
      setTicket(result);
      setNotice(
        result.email_sent
          ? `We sent a 4-digit code to ${result.email}. Type it here to send your problem.`
          : 'The email could not be sent just now. Press "Send a new code" in a minute.'
      );
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    if (code.length !== 4) return setError('Please enter the 4-digit code from the email.');
    setBusy(true);
    try {
      const result = await verifySupportProblem(ticket.id, code);
      setTicket(result);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendSupportCode(ticket.id);
      setNotice('A new code is on its way. Check your inbox (and the spam folder).');
    } catch (err) {
      setError(err.message);
    }
  };

  const startAgain = () => {
    setForm(EMPTY);
    setFile(null);
    setCode('');
    setTicket(null);
    setStep('form');
  };

  if (step === 'done') {
    return (
      <div className="animate-scale-in py-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-lg font-extrabold text-sand-900">Your problem reached our office</h3>
        <p className="mt-1 text-sm text-sand-600">
          Your ticket number is <span className="font-mono font-bold text-sand-900">{ticket.ticket_number}</span>. We emailed you a
          copy, and we will email you again when it is solved.
        </p>
        <Button variant="secondary" className="mt-5" onClick={startAgain}>
          Send another problem
        </Button>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        <p className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
        <Field label="4-digit code" hint="The code works for 15 minutes. Didn't get it? Check the spam folder.">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            placeholder="••••"
            className="text-center font-mono text-3xl font-extrabold tracking-[0.6em]"
          />
        </Field>
        <FormError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleResend} className="text-sm font-bold text-orange-600 hover:underline">
            Send a new code
          </button>
          <Button type="submit" variant="accent" icon="send" loading={busy}>
            Verify and send
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSend} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Your name" required>
        <Input value={form.name} onChange={set('name')} placeholder="Your full name" autoComplete="name" />
      </Field>
      <Field label="Your email" required hint="We send a code here to check it is really yours.">
        <Input type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" />
      </Field>
      <Field label="The problem is about" required>
        <Select value={form.category} onChange={set('category')} placeholder="Choose one" options={SUPPORT_CATEGORIES} />
      </Field>
      <Field label="Subject" required>
        <Input value={form.subject} onChange={set('subject')} placeholder="e.g. My bill looks too high" maxLength={150} />
      </Field>
      <Field label="Describe the problem" required className="sm:col-span-2">
        <Textarea
          value={form.message}
          onChange={set('message')}
          rows={5}
          maxLength={3000}
          placeholder="What happened, when, and your meter or customer number if you have one"
        />
      </Field>
      <Field label="Attach a file (optional)" hint={`A photo or PDF, up to ${MAX_FILE_MB} MB.`} className="sm:col-span-2">
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          onChange={chooseFile}
          className="block w-full text-sm text-sand-600 file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-orange-50 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-orange-700 hover:file:bg-orange-100"
        />
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={error} />
        <Button type="submit" variant="accent" icon="send" loading={busy} className="w-full sm:w-auto">
          Send my problem
        </Button>
      </div>
    </form>
  );
}

/** The section on the first page (#support) */
export default function SupportSection() {
  return (
    <section id="support" className="scroll-mt-20 bg-sand-50 py-20">
      <div className="reveal mx-auto max-w-3xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Support</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-sand-900 sm:text-4xl">
            Tell us your problem
          </h2>
          <p className="mt-3 text-base text-sand-500">
            Anybody can write to our office, with or without an account. Confirm your email with a 4-digit code, and we
            email you back when the problem is solved.
          </p>
        </div>
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sand-200 sm:p-8">
          <SupportForm />
        </div>
      </div>
    </section>
  );
}
