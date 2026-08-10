import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { fetchWithAuth } from '../../../lib/api-client';
import { useToast } from '../../ui/Toast';
import { HelpCircle, Loader2, BookPlus } from 'lucide-react';
import type { UnansweredGap } from './types';

interface KbGapConvertModalProps {
  gap: UnansweredGap | null;
  onClose: () => void;
  onConverted: (documentId: string) => void;
}

export function KbGapConvertModal({ gap, onClose, onConverted }: KbGapConvertModalProps) {
  const { addToast } = useToast();
  const [question, setQuestion] = useState(gap?.question || '');
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Keep the editable question in sync when a different gap is opened.
  const [lastGapId, setLastGapId] = useState<string | null>(null);
  if (gap && gap.id !== lastGapId) {
    setLastGapId(gap.id);
    setQuestion(gap.question);
    setAnswer('');
  }

  const handleSubmit = async () => {
    if (!gap) return;
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedQuestion) {
      addToast('Enter the visitor question', 'error');
      return;
    }
    if (!trimmedAnswer) {
      addToast('Write an answer to add to the knowledge base', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`/api/knowledge/unanswered/${gap.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion, answer: trimmedAnswer }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to add to knowledge base', 'error');
        return;
      }
      addToast('Added to knowledge base — question marked as answered', 'success');
      onConverted(data.documentId);
      onClose();
    } catch {
      addToast('Network error while saving the answer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={gap !== null}
      onClose={onClose}
      title="Add to knowledge base"
      description="Save this visitor question with an answer as a new FAQ entry"
      size="lg"
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-700)]">
            <HelpCircle className="h-4 w-4 text-[var(--color-neutral-400)]" />
            Visitor question
          </label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What was the visitor asking?"
            className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-neutral-700)]">
            Answer
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Write the answer your chatbot should give…"
            className="w-full resize-none rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)]"
          />
          <p className="mt-1.5 text-xs text-[var(--color-neutral-500)]">
            The question and answer are saved as a FAQ document and embedded into your knowledge base.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-[var(--color-neutral-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] transition hover:bg-[var(--color-neutral-50)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-700)] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookPlus className="h-4 w-4" />}
            {submitting ? 'Saving…' : 'Add to knowledge base'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
