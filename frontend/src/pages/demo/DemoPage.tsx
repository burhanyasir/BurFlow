import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { PageSection } from '../../components/ui/PageSection';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../lib/api-client';
import { cn } from '../../utils/cn';

interface FormState {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  date: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  date?: string;
}

const TEAM_SIZE_OPTIONS = [
  { value: '1-10', label: '1–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-1000', label: '201–1,000 people' },
  { value: '1000+', label: '1,000+ people' },
];

const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '16:00', label: '4:00 PM' },
];

export default function DemoPage() {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    date: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const update = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'This field is required.';
    if (!form.email.trim()) next.email = 'This field is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Please enter a valid work email address.';
    if (!form.company.trim()) next.company = 'This field is required.';
    if (!form.date.trim()) next.date = 'Please pick a date for your demo.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/public/leads', {
        source: 'demo',
        name: form.name,
        email: form.email,
        company: form.company,
        teamSize: form.teamSize,
        preferredDate: form.date,
        preferredTime: timeSlot,
        focus: form.message,
      });
      addToast('Demo requested! Our team will confirm your slot by email.', 'success');
      setForm({ name: '', email: '', company: '', teamSize: '', date: '', message: '' });
    } catch {
      addToast('Could not submit your demo request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = 'w-full bg-[var(--color-neutral-0)] border border-[var(--color-neutral-200)] rounded-xl px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition';

  return (
    <>
      <SEO
        title="Book a Live Demo | BurFlow"
        description="See BurFlow in action — grounded AI answers, lead capture, and human handover, set up for your business in a 20-minute walkthrough."
        canonicalPath="/demo"
        schema='{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://burflow.vercel.app"},{"@type":"ListItem","position":2,"name":"Demo","item":"https://burflow.vercel.app/demo"}]}'
      />
      <PageSection
        title="Book a Live Demo"
        description="See BurFlow in action — grounded AI answers, lead capture, and human handover, set up for your business in a 20-minute walkthrough."
        size="md"
        titleAs="h1"
        className="pt-20 md:pt-28"
      >
      <div className="grid md:grid-cols-5 gap-8 items-start max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2 space-y-6"
        >
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-neutral-900)] mb-2">What you'll see</h3>
            <ul className="space-y-2 text-sm text-[var(--color-neutral-500)]">
              <li className="flex gap-2"><span className="text-[var(--color-accent-600)]">✓</span> The chatbot widget live on your site</li>
              <li className="flex gap-2"><span className="text-[var(--color-accent-600)]">✓</span> Knowledge grounding from your own docs</li>
              <li className="flex gap-2"><span className="text-[var(--color-accent-600)]">✓</span> Lead capture and qualification in chat</li>
              <li className="flex gap-2"><span className="text-[var(--color-accent-600)]">✓</span> Seamless handover to your human agents</li>
              <li className="flex gap-2"><span className="text-[var(--color-accent-600)]">✓</span> Analytics and conversion tracking</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-5">
            <p className="text-sm font-medium text-[var(--color-neutral-900)] mb-1">Prefer to try it yourself?</p>
            <p className="text-sm text-[var(--color-neutral-500)]">Start a 14-day free trial — no credit card required. Or talk to sales for enterprise needs.</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button variant="primary" onClick={() => window.open('/signup', '_self')}>Start Free Trial</Button>
              <Button variant="secondary" onClick={() => window.open('/contact', '_self')}>Contact Sales</Button>
            </div>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          noValidate
          className="md:col-span-3 bg-[var(--color-neutral-0)] shadow-sm border border-[var(--color-neutral-200)] rounded-2xl p-6 md:p-8 hover:shadow-md transition-shadow duration-300 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Full name *</label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Jane Cooper" error={errors.name} className={cn(inputBase, errors.name && 'border-[var(--color-error-500)]')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Work email *</label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="jane@company.com" error={errors.email} className={cn(inputBase, errors.email && 'border-[var(--color-error-500)]')} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Company *</label>
              <Input value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Acme Inc." error={errors.company} className={cn(inputBase, errors.company && 'border-[var(--color-error-500)]')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Team size</label>
              <Select value={form.teamSize} onChange={(e) => update('teamSize', e.target.value)} placeholder="Select team size" options={TEAM_SIZE_OPTIONS} className={inputBase} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Preferred date *</label>
              <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} error={errors.date} className={cn(inputBase, errors.date && 'border-[var(--color-error-500)]')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Preferred time</label>
              <Select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} options={TIME_SLOTS} className={inputBase} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">What would you like to focus on?</label>
            <Textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="e.g. Cutting support ticket volume, automating lead qualification, or embedding the widget on our pricing page…" rows={4} className={cn(inputBase, 'resize-none')} />
          </div>

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            {submitting ? 'Booking your demo…' : 'Book My Demo'}
          </Button>
          <p className="text-xs text-[var(--color-neutral-400)] text-center">
            No spam, ever. We'll only use your details to arrange this demo.
          </p>
        </motion.form>
      </div>
      </PageSection>
    </>
  );
}
