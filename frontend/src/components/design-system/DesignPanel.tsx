import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { DesignCard, DesignCardHeader, DesignCardTitle, DesignCardMeta, type DesignCardProps } from './DesignCard';

export interface DesignPanelProps extends DesignCardProps {
  title: string;
  meta?: string;
  action?: ReactNode;
}

export function DesignPanel({ title, meta, action, children, className, ...cardProps }: DesignPanelProps) {
  return (
    <DesignCard className={cn('', className)} {...cardProps}>
      <DesignCardHeader>
        <div>
          <DesignCardTitle>{title}</DesignCardTitle>
          {meta && <DesignCardMeta>{meta}</DesignCardMeta>}
        </div>
        {action}
      </DesignCardHeader>
      {children}
    </DesignCard>
  );
}
