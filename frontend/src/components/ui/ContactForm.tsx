import { useState, type FormEvent } from 'react';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { Button } from './Button';
import { useToast } from './Toast';
import { cn } from '../../utils/cn';

export interface ContactFormProps {
  className?: string;
}

interface FormState {
  name: string;
  email: string;
  company: string;
  volume: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactForm({ className }: ContactFormProps) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    volume: '',
    message: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'This field is required.';
    if (!form.email.trim()) next.email = 'This field is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Please enter a valid work email address.';
    if (!form.message.trim()) next.message = 'This field is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    addToast('Message sent successfully!', 'success');
    setForm({ name: '', email: '', company: '', volume: '', message: '' });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Full Name"
          placeholder="e.g., Sarah Jenkins"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          error={errors.name}
          required
        />
        <Input
          label="Work Email"
          type="email"
          placeholder="e.g., s.jenkins@company.com"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          error={errors.email}
          required
        />
      </div>
      <Input
        label="Company Name"
        placeholder="e.g., Acme Corporation"
        value={form.company}
        onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
      />
      <Select
        label="Estimated Monthly Message Volume"
        value={form.volume}
        onChange={e => setForm(p => ({ ...p, volume: e.target.value }))}
        placeholder="Select range"
        options={[
          { value: 'lt10k', label: '<10k' },
          { value: '10k-50k', label: '10k–50k' },
          { value: 'gt50k', label: '50k+' }
        ]}
      />
      <Textarea
        label="Message"
        placeholder="How can our platform support your operations?"
        value={form.message}
        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
        error={errors.message}
        required
        rows={5}
      />
      <Button type="submit" loading={submitting} size="lg">
        Send Inquiry
      </Button>
    </form>
  );
}
