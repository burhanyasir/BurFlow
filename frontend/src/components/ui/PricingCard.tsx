import { cn } from '../../utils/cn';
import { Card, CardContent } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  cta: string;
  ctaVariant?: 'primary' | 'secondary' | 'ghost';
  popular?: boolean;
  variant?: 'free' | 'starter' | 'professional' | 'enterprise';
}

export interface PricingCardProps {
  tier: PricingTier;
  className?: string;
}

const variantCardStyles: Record<string, string> = {
  free: 'bg-white/80 backdrop-blur-sm border border-[#D0D5DD]',
  starter: 'bg-white shadow-md border border-[#5865F2]/20',
  professional: 'bg-white shadow-xl border-2 border-[#5865F2] ring-1 ring-[#5865F2]/20 relative',
  enterprise: 'bg-[#0B0C10] text-white border border-[#2A2B35]'
};

const variantTextStyles: Record<string, string> = {
  free: '',
  starter: '',
  professional: '',
  enterprise: 'text-white'
};

export function PricingCard({ tier, className }: PricingCardProps) {
  const isEnterprise = tier.variant === 'enterprise';
  return (
    <div className={cn('relative', className)}>
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="primary" size="sm">Most Popular</Badge>
        </div>
      )}
      <Card
        variant="flat"
        padding="lg"
        className={cn(
          'h-full flex flex-col',
          variantCardStyles[tier.variant || 'free'],
          tier.popular && 'shadow-[0_0_30px_-5px_rgba(88,101,242,0.3)]'
        )}
      >
        <CardContent className="flex-1 flex flex-col">
          <div className="mb-6">
            <h3 className={cn('text-lg font-semibold', variantTextStyles[tier.variant || 'free'])}>
              {tier.name}
            </h3>
            {tier.description && (
              <p className={cn('mt-1 text-sm', isEnterprise ? 'text-[#A0A5B0]' : 'text-[#5F6570]')}>
                {tier.description}
              </p>
            )}
          </div>

          <div className="mb-6">
            <span className={cn('text-4xl font-bold tracking-tight', variantTextStyles[tier.variant || 'free'])}>
              {tier.price}
            </span>
            {tier.period && (
              <span className={cn('text-sm ml-1', isEnterprise ? 'text-[#A0A5B0]' : 'text-[#5F6570]')}>
                {tier.period}
              </span>
            )}
          </div>

          <ul className="space-y-3 mb-8 flex-1" role="list">
            {tier.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className={cn(isEnterprise && 'text-[#D0D5DD]')}>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            variant={tier.ctaVariant || (tier.popular ? 'primary' : 'secondary')}
            fullWidth
            size="lg"
            className={isEnterprise ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white border-none' : undefined}
          >
            {tier.cta}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
