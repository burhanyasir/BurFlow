import { EmptyState } from '../../components/ui/EmptyState';

export default function DocsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-20 md:pt-28 pb-16">
      <EmptyState
        icon={
          <svg className="h-12 w-12 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
        title="Documentation"
        description="API reference, widget integration guides, and platform documentation are being prepared. They will be available soon."
        size="lg"
      />
    </div>
  );
}
