interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
}

export function PageHeader({ badge, title, description }: PageHeaderProps) {
  return (
    <div className="relative pt-24 pb-14 text-center max-w-4xl mx-auto px-4">
      {badge && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-luxury border border-white/10 text-xs font-mono text-[#E8A0B4] mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{badge}</span>
        </div>
      )}
      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
        {title}
      </h1>
      <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}
