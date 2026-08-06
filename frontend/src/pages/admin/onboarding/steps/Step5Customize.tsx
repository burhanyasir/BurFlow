import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { WIDGET_POSITIONS } from '../onboarding-context';
import { deriveBusinessIntelligenceSnapshot } from '../../../../utils/business-profile';

interface Props {
  data: {
    primaryColor: string;
    position: 'right' | 'left';
    welcomeMessage: string;
    placeholder: string;
    suggestedQuestions: string[];
    logo: string;
  };
  businessProfile: ReturnType<typeof deriveBusinessIntelligenceSnapshot>;
  onChange: (field: string, value: any) => void;
}

const COLOR_PRESETS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

export function Step5Customize({ data, businessProfile, onChange }: Props) {
  const [questionInput, setQuestionInput] = useState('');

  const previewGreeting = useMemo(() => data.welcomeMessage?.trim() || businessProfile.welcomeMessage, [businessProfile, data.welcomeMessage]);
  const previewQuestions = useMemo(() => (data.suggestedQuestions?.length ? data.suggestedQuestions : businessProfile.suggestedQuestions), [businessProfile, data.suggestedQuestions]);

  const addQuestion = () => {
    const q = questionInput.trim();
    if (q && !data.suggestedQuestions.includes(q)) {
      onChange('suggestedQuestions', [...data.suggestedQuestions, q]);
      setQuestionInput('');
    }
  };

  const removeQuestion = (i: number) => {
    onChange('suggestedQuestions', data.suggestedQuestions.filter((_, idx) => idx !== i));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Customize the visitor experience</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">Pick a look and messaging that makes visitors feel confident, and steer them toward products, pricing, and demo booking.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Primary Color</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => onChange('primaryColor', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${data.primaryColor === c ? 'border-[var(--color-neutral-900)] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Input
              placeholder="#6366f1"
              value={data.primaryColor}
              onChange={e => onChange('primaryColor', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Widget Position</label>
            <Select
              options={WIDGET_POSITIONS.map(p => ({ value: p.value, label: p.label }))}
              value={data.position}
              onChange={e => onChange('position', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Welcome Message</label>
            <Textarea
              rows={2}
              value={data.welcomeMessage}
              onChange={e => onChange('welcomeMessage', e.target.value)}
            />
            <p className="text-xs text-[var(--color-neutral-400)] mt-1">This is the first message visitors see when they open the chat widget.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Input Placeholder</label>
            <Input
              value={data.placeholder}
              onChange={e => onChange('placeholder', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Suggested Questions</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Type a suggested question"
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addQuestion(); }}
                className="flex-1"
              />
              <Button size="sm" onClick={addQuestion} disabled={!questionInput.trim()}>Add</Button>
            </div>
            {data.suggestedQuestions.length > 0 && (
              <div className="space-y-1">
                {data.suggestedQuestions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-[var(--color-neutral-50)]">
                    <span className="text-[var(--color-neutral-700)] truncate">{q}</span>
                    <button onClick={() => removeQuestion(i)} className="text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-error-500)] shrink-0 ml-2">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--color-neutral-400)] mt-1">These appear as quick-reply buttons when the widget opens.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-3">Live Preview</label>
          <div className="relative rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] h-[400px] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-[var(--color-neutral-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
                <p className="text-xs text-[var(--color-neutral-400)] mt-2">Website Preview</p>
              </div>
            </div>

            <div className={`absolute bottom-4 ${data.position === 'right' ? 'right-4' : 'left-4'} transition-all`}>
              <div className="bg-white rounded-2xl shadow-lg border border-[var(--color-neutral-200)] w-[240px] overflow-hidden">
                <div className="p-3 flex items-center gap-3" style={{ backgroundColor: data.primaryColor }}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">A</div>
                  <div>
                    <p className="text-white text-sm font-semibold">Chatbot</p>
                    <p className="text-white/70 text-xs">Online</p>
                  </div>
                </div>
                <div className="p-3 space-y-3 min-h-[120px]">
                  <div className="bg-[var(--color-neutral-50)] rounded-lg rounded-tl-none p-2.5 max-w-[80%]">
                    <p className="text-xs text-[var(--color-neutral-700)]">{previewGreeting}</p>
                  </div>
                  {previewQuestions.slice(0, 2).map((q, i) => (
                    <div key={i} className="border border-[var(--color-neutral-200)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-neutral-600)] cursor-default">
                      {q}
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-[var(--color-neutral-100)]">
                  <div className="flex gap-2">
                    <div className="flex-1 h-7 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]" />
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: data.primaryColor }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-neutral-400)] mt-2 text-center">Preview updates as you change settings.</p>
        </div>
      </div>
    </motion.div>
  );
}
