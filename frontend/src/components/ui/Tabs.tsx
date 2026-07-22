import { useState, useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const id = useId();
  
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div className={className}>
      <div role="tablist" aria-orientation="horizontal" className="flex border-b border-[#D0D5DD] gap-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-inset',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              activeTab === tab.id ? 'text-[#5865F2]' : 'text-[#5F6570] hover:text-[#0B0C10]'
            )}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865F2]" />}
          </button>
        ))}
      </div>
      {tabs.map(tab => (
        <div key={tab.id} role="tabpanel" id={`${id}-panel-${tab.id}`} aria-labelledby={`${id}-tab-${tab.id}`} className={cn('pt-4', activeTab !== tab.id && 'hidden')}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
