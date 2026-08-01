import { useState } from 'react';
import { Select } from '../../../components/ui/Select';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export interface FilterValues {
  persona: string;
  funnelStage: string;
  buyingIntent: string;
  sentiment: string;
  escalation: string;
  routingDecision: string;
  qualificationProgress: string;
}

interface Props {
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
}

const defaultFilters: FilterValues = {
  persona: '',
  funnelStage: '',
  buyingIntent: '',
  sentiment: '',
  escalation: '',
  routingDecision: '',
  qualificationProgress: '',
};

export function ConversationFilters({ onApply, onReset }: Props) {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const handleChange = (key: keyof FilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card variant="flat" padding="md">
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            label="Persona"
            options={[
              { value: '', label: 'All Personas' },
              { value: 'developer', label: 'Developer' },
              { value: 'enterprise', label: 'Enterprise' },
              { value: 'startup', label: 'Startup' },
              { value: 'small_business', label: 'Small Business' },
              { value: 'agency', label: 'Agency' },
              { value: 'ecommerce', label: 'E-Commerce' },
              { value: 'support_manager', label: 'Support Manager' },
              { value: 'existing_customer', label: 'Existing Customer' },
              { value: 'unknown', label: 'Unknown' },
            ]}
            value={filters.persona}
            onChange={e => handleChange('persona', e.target.value)}
          />
          <Select
            label="Funnel Stage"
            options={[
              { value: '', label: 'All Stages' },
              { value: 'greeting', label: 'Greeting' },
              { value: 'discovery', label: 'Discovery' },
              { value: 'interest', label: 'Interest' },
              { value: 'evaluation', label: 'Evaluation' },
              { value: 'objection', label: 'Objection' },
              { value: 'purchase_intent', label: 'Purchase Intent' },
              { value: 'support', label: 'Support' },
            ]}
            value={filters.funnelStage}
            onChange={e => handleChange('funnelStage', e.target.value)}
          />
          <Select
            label="Buying Intent"
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Has Intent' },
              { value: 'false', label: 'No Intent' },
            ]}
            value={filters.buyingIntent}
            onChange={e => handleChange('buyingIntent', e.target.value)}
          />
          <Select
            label="Qualification"
            options={[
              { value: '', label: 'All' },
              { value: 'completed', label: 'Completed' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'not_started', label: 'Not Started' },
            ]}
            value={filters.qualificationProgress}
            onChange={e => handleChange('qualificationProgress', e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => onApply(filters)}>Apply Filters</Button>
          <Button size="sm" variant="ghost" onClick={() => { setFilters(defaultFilters); onReset(); }}>Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
}
