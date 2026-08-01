import { useState, useEffect, useCallback } from 'react';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '../../../components/premium/PremiumCard';
import { Badge } from '../../../components/premium/Badge';
import { Skeleton } from '../../../components/premium/Skeleton';
import { EmptyState } from '../../../components/premium/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../lib/auth-context';
import { cn } from '../../../utils/cn';

const TABS = [
  'Workspace', 'Branding', 'Team Members', 'API Keys', 'Webhooks',
  'Billing', 'Security', 'Notifications', 'Audit Logs', 'Danger Zone',
] as const;

type Tab = (typeof TABS)[number];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland',
].map(tz => ({ value: tz, label: tz }));

const LANGUAGES = [
  { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' }, { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' }, { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' }, { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' }, { value: 'ar', label: 'Arabic' },
];

const SESSION_TIMEOUTS = [
  { value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' }, { value: '240', label: '4 hours' },
  { value: '0', label: 'Never' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Events' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'team', label: 'Team' },
  { value: 'billing', label: 'Billing' },
  { value: 'security', label: 'Security' },
  { value: 'api', label: 'API' },
  { value: 'webhook', label: 'Webhook' },
];

const WEBHOOK_EVENTS = [
  'conversation.created', 'conversation.ended', 'message.received',
  'knowledge.synced', 'error.occurred',
];

const API_KEY_PERMISSIONS = [
  { value: 'read', label: 'Read — view conversations and analytics' },
  { value: 'write', label: 'Write — send messages and create data' },
  { value: 'admin', label: 'Admin — full workspace management' },
];

interface TeamMember {
  id: string; name: string; email: string; role: string; status: string;
  joinedAt: string;
}

interface ApiKey {
  id: string; name: string; prefix: string; createdAt: string;
  lastUsedAt: string | null; status: string; permissions: string[];
}

interface Webhook {
  id: string; url: string; events: string[]; active: boolean;
  createdAt: string; deliveryLogsCount: number; lastDeliveryStatus: string | null;
}

interface Invoice {
  id: string; date: string; amount: number; currency: string; status: string;
}

interface CurrentPlan {
  id: string; name: string; price: number; currency: string; interval: string;
  features: string[];
  conversationsLimit: number; conversationsUsed: number;
  documentsLimit: number; documentsUsed: number;
}

interface AuditLog {
  id: string; timestamp: string; user: string; action: string;
  resource: string; details: string;
}

interface SessionActivity {
  id: string; device: string; location: string; ip: string;
  timestamp: string; current: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Workspace');

  return (
    <div className="bg-[#08080A] min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        <div className="overflow-x-auto mb-8 -mx-4 md:-mx-0 px-4 md:px-0">
          <div className="flex gap-1 min-w-max border-b border-[rgba(255,255,255,0.08)] pb-px" role="tablist" aria-label="Settings sections">
            {TABS.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-[var(--motion-functional)] rounded-t-lg',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] focus-visible:ring-offset-2',
                  activeTab === tab
                    ? 'text-white border-b-2 border-[var(--color-accent-600)]'
                    : 'text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.03)]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'Workspace' && <WorkspaceSection />}
        {activeTab === 'Branding' && <BrandingSection />}
        {activeTab === 'Team Members' && <TeamMembersSection />}
        {activeTab === 'API Keys' && <ApiKeysSection />}
        {activeTab === 'Webhooks' && <WebhooksSection />}
        {activeTab === 'Billing' && <BillingSection />}
        {activeTab === 'Security' && <SecuritySection />}
        {activeTab === 'Notifications' && <NotificationsSection />}
        {activeTab === 'Audit Logs' && <AuditLogsSection />}
        {activeTab === 'Danger Zone' && <DangerZoneSection />}
      </div>
    </div>
  );
}

function WorkspaceSection() {
  const { addToast } = useToast();
  const { tenant } = useAuth();
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [workspaceSlug] = useState('my-workspace');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/tenants/${tenant?.id}`, { name: workspaceName, settings: { timezone, language } });
      addToast('Workspace settings saved', 'success');
    } catch {
      addToast('Failed to save workspace settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>Workspace Settings</PremiumCardTitle>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-5 max-w-xl">
          <Input label="Workspace Name" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">Workspace Slug</label>
            <p className="h-10 flex items-center px-3 mt-1.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.04)] text-sm text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.06)]">
              {workspaceSlug}
            </p>
          </div>
          <Select label="Timezone" options={TIMEZONES} value={timezone} onChange={e => setTimezone(e.target.value)} />
          <Select label="Language" options={LANGUAGES} value={language} onChange={e => setLanguage(e.target.value)} />
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function BrandingSection() {
  const { addToast } = useToast();
  const { tenant } = useAuth();
  const [companyName, setCompanyName] = useState('My Company');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#A8244B');
  const [secondaryColor, setSecondaryColor] = useState('#C94F72');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/tenants/${tenant?.id}`, { name: companyName, settings: { logoUrl, primaryColor, secondaryColor } });
      addToast('Branding settings saved', 'success');
    } catch {
      addToast('Failed to save branding settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>Branding</PremiumCardTitle>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-5 max-w-xl">
          <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc." />
          <div>
            <Input label="Company Logo URL" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <img src={logoUrl} alt="Logo preview" className="h-10 w-10 object-contain rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-[rgba(255,255,255,0.4)]">Preview</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">Primary Color</label>
              <div className="flex items-center gap-3 mt-1.5">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.1)] bg-transparent cursor-pointer" />
                <span className="text-sm text-[rgba(255,255,255,0.6)] font-mono">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">Secondary Color</label>
              <div className="flex items-center gap-3 mt-1.5">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.1)] bg-transparent cursor-pointer" />
                <span className="text-sm text-[rgba(255,255,255,0.6)] font-mono">{secondaryColor}</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} loading={saving}>Save Branding</Button>
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function TeamMembersSection() {
  const { addToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ members: TeamMember[] }>('/team/members');
      setMembers(res.members || []);
    } catch {
      addToast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await apiClient.post('/team/invite', { email: inviteEmail, role: inviteRole });
      addToast('Invitation sent', 'success');
      setInviteEmail('');
      setInviteRole('member');
      setShowInvite(false);
      loadMembers();
    } catch {
      addToast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await apiClient.delete(`/team/members/${id}`);
      addToast('Member removed', 'success');
      loadMembers();
    } catch {
      addToast('Failed to remove member', 'error');
    }
  };

  if (loading) {
    return (
      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>Team Members</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent><div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} variant="text" className="!h-12" />)}</div></PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>Team Members</PremiumCardTitle>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : 'Invite Member'}
        </Button>
      </PremiumCardHeader>
      <PremiumCardContent>
        {showInvite && (
          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} label="Email" />
              <Select label="Role" options={[
                { value: 'admin', label: 'Admin' }, { value: 'member', label: 'Member' }, { value: 'viewer', label: 'Viewer' },
              ]} value={inviteRole} onChange={e => setInviteRole(e.target.value)} />
              <div className="flex items-end">
                <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail}>Send Invite</Button>
              </div>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <EmptyState icon="👥" title="No team members" description="Invite your team to collaborate on this workspace." primaryAction={{ label: 'Invite Member', onClick: () => setShowInvite(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Team members">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-[rgba(255,255,255,0.4)] text-xs uppercase tracking-wider">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Joined</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{m.name}</td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.6)]">{m.email}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={m.role === 'admin' ? 'premium' : m.role === 'viewer' ? 'neutral' : 'info'}>{m.role}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={m.status === 'active' ? 'success' : 'warning'} dot>{m.status}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(m.id)} aria-label={`Remove ${m.name}`}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}

function ApiKeysSection() {
  const { addToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['read']);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ keys: ApiKey[] }>('/api-keys/');
      setKeys(res.keys || []);
    } catch {
      addToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName) return;
    setCreating(true);
    try {
      const res = await apiClient.post<{ key: string; id: string }>('/api-keys/', { name: newKeyName, permissions: newKeyPerms });
      setGeneratedKey(res.key);
      addToast('API key created — copy it now, it will not be shown again', 'success');
      setNewKeyName('');
      setNewKeyPerms(['read']);
      loadKeys();
    } catch {
      addToast('Failed to create API key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const res = await apiClient.put<{ key: string }>(`/api-keys/${id}/rotate`);
      setGeneratedKey(res.key);
      addToast('Key rotated — copy it now', 'success');
      loadKeys();
    } catch {
      addToast('Failed to rotate key', 'error');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiClient.delete(`/api-keys/${id}`);
      addToast('API key revoked', 'success');
      loadKeys();
    } catch {
      addToast('Failed to revoke key', 'error');
    }
  };

  const togglePermission = (perm: string) => {
    setNewKeyPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  if (loading) {
    return (
      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>API Keys</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent><div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} variant="text" className="!h-16" />)}</div></PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>API Keys</PremiumCardTitle>
        <Button size="sm" onClick={() => { setShowCreate(!showCreate); setGeneratedKey(null); }}>
          {showCreate ? 'Cancel' : 'Create API Key'}
        </Button>
      </PremiumCardHeader>
      <PremiumCardContent>
        {showCreate && (
          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-4">
            <Input label="Key Name" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Production API Key" />
            <div>
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">Permissions</span>
              <div className="flex flex-col gap-2 mt-2">
                {API_KEY_PERMISSIONS.map(p => (
                  <label key={p.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={newKeyPerms.includes(p.value)}
                      onChange={() => togglePermission(p.value)}
                      className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent accent-[var(--color-accent-600)]" />
                    <span className="text-sm text-[rgba(255,255,255,0.7)]">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} loading={creating} disabled={!newKeyName}>Generate Key</Button>

            {generatedKey && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[rgba(31,157,107,0.1)] border border-[rgba(31,157,107,0.2)]">
                <p className="text-xs text-[#3DDC97] font-medium mb-2">Key generated — copy it now. It will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-white bg-[rgba(0,0,0,0.3)] px-3 py-2 rounded font-mono break-all">{generatedKey}</code>
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(generatedKey); addToast('Copied to clipboard', 'success'); }}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {keys.length === 0 ? (
          <EmptyState icon="🔑" title="No API keys" description="Create an API key to integrate with external services."
            primaryAction={{ label: 'Create API Key', onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="API keys">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-[rgba(255,255,255,0.4)] text-xs uppercase tracking-wider">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Prefix</th>
                  <th className="py-3 pr-4 font-medium">Permissions</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 font-medium">Last Used</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 pr-4 text-white">{k.name}</td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] font-mono text-xs">{k.prefix}...</td>
                    <td className="py-3 pr-4"><div className="flex gap-1 flex-wrap">{k.permissions.map(p => <Badge key={p} variant="neutral" size="sm">{p}</Badge>)}</div></td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</td>
                    <td className="py-3 pr-4"><Badge variant={k.status === 'active' ? 'success' : 'error'} dot size="sm">{k.status}</Badge></td>
                    <td className="py-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleRotate(k.id)}>Rotate</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(k.id)}>Revoke</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}

function WebhooksSection() {
  const { addToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ webhooks: Webhook[] }>('/webhooks/');
      setWebhooks(res.webhooks || []);
    } catch {
      addToast('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const resetForm = () => {
    setFormUrl('');
    setFormEvents([]);
    setFormActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (wh: Webhook) => {
    setFormUrl(wh.url);
    setFormEvents(wh.events);
    setFormActive(wh.active);
    setEditingId(wh.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formUrl) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.put(`/webhooks/${editingId}`, { url: formUrl, events: formEvents, active: formActive });
        addToast('Webhook updated', 'success');
      } else {
        await apiClient.post('/webhooks/', { url: formUrl, events: formEvents, active: formActive });
        addToast('Webhook created', 'success');
      }
      resetForm();
      loadWebhooks();
    } catch {
      addToast('Failed to save webhook', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/webhooks/${id}`);
      addToast('Webhook deleted', 'success');
      loadWebhooks();
    } catch {
      addToast('Failed to delete webhook', 'error');
    }
  };

  const toggleEvent = (e: string) => {
    setFormEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  if (loading) {
    return (
      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>Webhooks</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent><div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} variant="text" className="!h-16" />)}</div></PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>Webhooks</PremiumCardTitle>
        <Button size="sm" onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : 'Add Webhook'}
        </Button>
      </PremiumCardHeader>
      <PremiumCardContent>
        {showForm && (
          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-4">
            <Input label="Payload URL" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://example.com/webhook" />
            <div>
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">Events</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={formEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent accent-[var(--color-accent-600)]" />
                    <span className="text-sm text-[rgba(255,255,255,0.7)]">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={formActive} onChange={setFormActive} label="Active" />
              <Button onClick={handleSave} loading={saving} disabled={!formUrl || formEvents.length === 0}>
                {editingId ? 'Update Webhook' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        )}

        {webhooks.length === 0 ? (
          <EmptyState icon="🔗" title="No webhooks configured" description="Send real-time events to your own endpoints."
            primaryAction={{ label: 'Add Webhook', onClick: () => setShowForm(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Webhooks">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-[rgba(255,255,255,0.4)] text-xs uppercase tracking-wider">
                  <th className="py-3 pr-4 font-medium">URL</th>
                  <th className="py-3 pr-4 font-medium">Events</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Deliveries</th>
                  <th className="py-3 pr-4 font-medium">Last Delivery</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map(wh => (
                  <tr key={wh.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-3 pr-4 text-white font-mono text-xs max-w-[200px] truncate">{wh.url}</td>
                    <td className="py-3 pr-4"><div className="flex gap-1 flex-wrap">{wh.events.map(ev => <Badge key={ev} variant="info" size="sm">{ev}</Badge>)}</div></td>
                    <td className="py-3 pr-4"><Badge variant={wh.active ? 'success' : 'neutral'} dot size="sm">{wh.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs">{wh.deliveryLogsCount}</td>
                    <td className="py-3 pr-4">
                      {wh.lastDeliveryStatus
                        ? <Badge variant={wh.lastDeliveryStatus === 'success' ? 'success' : 'error'} size="sm">{wh.lastDeliveryStatus}</Badge>
                        : <span className="text-[rgba(255,255,255,0.3)] text-xs">—</span>
                      }
                    </td>
                    <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs">{new Date(wh.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(wh)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(wh.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}

function BillingSection() {
  const { addToast } = useToast();
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, invRes] = await Promise.allSettled([
        apiClient.get<CurrentPlan>('/billing/current'),
        apiClient.get<{ invoices: Invoice[] }>('/billing/payment-history'),
      ]);
      if (planRes.status === 'fulfilled') setPlan(planRes.value);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.invoices || []);
    } catch {
      addToast('Failed to load billing data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>Billing</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent><div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} variant="text" />)}</div></PremiumCardContent>
      </PremiumCard>
    );
  }

  const usagePct = (used: number, limit: number) => limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      <PremiumCard padding="lg">
        <PremiumCardHeader>
          <PremiumCardTitle>Current Plan</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          {plan ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[rgba(168,36,75,0.08)] border border-[rgba(168,36,75,0.15)]">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${plan.price}<span className="text-sm font-normal text-[rgba(255,255,255,0.5)]">/{plan.interval}</span>
                  </p>
                </div>
                <Badge variant="premium" size="md">Current</Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[rgba(255,255,255,0.6)] mb-3">Features</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.7)]">
                      <svg className="h-4 w-4 text-[#3DDC97] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[rgba(255,255,255,0.5)]">Conversations</span>
                    <span className="text-white">{plan.conversationsUsed} / {plan.conversationsLimit}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-600)] to-[#C94F72] transition-all" style={{ width: `${usagePct(plan.conversationsUsed, plan.conversationsLimit)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[rgba(255,255,255,0.5)]">Documents</span>
                    <span className="text-white">{plan.documentsUsed} / {plan.documentsLimit}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-600)] to-[#C94F72] transition-all" style={{ width: `${usagePct(plan.documentsUsed, plan.documentsLimit)}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => addToast('Manage subscription portal', 'info')}>
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[rgba(255,255,255,0.5)] text-sm">No active plan found.</p>
          )}
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard padding="lg">
        <PremiumCardHeader>
          <PremiumCardTitle>Payment Method</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="w-12 h-8 rounded bg-gradient-to-br from-[rgba(168,36,75,0.3)] to-[rgba(201,79,114,0.3)] flex items-center justify-center text-xs text-white font-bold">CC</div>
            <div>
              <p className="text-sm text-white font-medium">Visa ending in 4242</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">Expires 12/28</p>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard padding="lg">
        <PremiumCardHeader>
          <PremiumCardTitle>Invoices</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          {invoices.length === 0 ? (
            <p className="text-[rgba(255,255,255,0.4)] text-sm">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Invoices">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-[rgba(255,255,255,0.4)] text-xs uppercase tracking-wider">
                    <th className="py-3 pr-4 font-medium">Date</th>
                    <th className="py-3 pr-4 font-medium">Amount</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-[rgba(255,255,255,0.04)]">
                      <td className="py-3 pr-4 text-white">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="py-3 pr-4 text-white">{inv.currency} {inv.amount.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'error'} size="sm">{inv.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}

function SecuritySection() {
  const { addToast } = useToast();
  const { tenant } = useAuth();
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [allowlistedIPs, setAllowlistedIPs] = useState('');
  const [saving, setSaving] = useState(false);

  const recentSessions: SessionActivity[] = [
    { id: '1', device: 'Chrome / Windows', location: 'San Francisco, US', ip: '203.0.113.1', timestamp: new Date().toISOString(), current: true },
    { id: '2', device: 'Safari / macOS', location: 'New York, US', ip: '203.0.113.2', timestamp: new Date(Date.now() - 86400000).toISOString(), current: false },
    { id: '3', device: 'Firefox / Linux', location: 'Berlin, DE', ip: '203.0.113.3', timestamp: new Date(Date.now() - 172800000).toISOString(), current: false },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/tenants/${tenant?.id}`, { settings: { twoFactor, sessionTimeout, allowlistedIPs } });
      addToast('Security settings saved', 'success');
    } catch {
      addToast('Failed to save security settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>Security Settings</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-6 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">Add an extra layer of security to your account</p>
              </div>
              <Switch checked={twoFactor} onChange={setTwoFactor} />
            </div>

            <Select label="Session Timeout" options={SESSION_TIMEOUTS} value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />

            <div>
              <p className="text-sm font-medium text-[var(--color-neutral-700)] mb-1">Password Policy</p>
              <div className="p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-sm text-[rgba(255,255,255,0.6)] space-y-1">
                <p>• Minimum 8 characters</p>
                <p>• At least one uppercase letter</p>
                <p>• At least one number</p>
                <p>• At least one special character</p>
              </div>
            </div>

            <Input label="IP Allowlist (one per line)" value={allowlistedIPs} onChange={e => setAllowlistedIPs(e.target.value)}
              placeholder="203.0.113.1&#10;198.51.100.0/24" />

            <Button onClick={handleSave} loading={saving}>Save Security Settings</Button>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard padding="lg">
        <PremiumCardHeader><PremiumCardTitle>Recent Login Activity</PremiumCardTitle></PremiumCardHeader>
        <PremiumCardContent>
          <div className="space-y-3">
            {recentSessions.map(s => (
              <div key={s.id} className={cn(
                'flex items-center justify-between p-3 rounded-[var(--radius-md)] transition-colors',
                s.current ? 'bg-[rgba(31,157,107,0.06)] border border-[rgba(31,157,107,0.12)]' : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]'
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', s.current ? 'bg-[#3DDC97]' : 'bg-[rgba(255,255,255,0.2)]')} />
                  <div>
                    <p className="text-sm text-white font-medium">{s.device}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.4)]">{s.location} · {s.ip}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">{new Date(s.timestamp).toLocaleString()}</p>
                  {s.current && <Badge variant="success" size="sm">Current session</Badge>}
                </div>
              </div>
            ))}
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}

function NotificationsSection() {
  const { addToast } = useToast();
  const { tenant } = useAuth();
  const [emailDigest, setEmailDigest] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [dailySummary, setDailySummary] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [emailNewConversation, setEmailNewConversation] = useState(true);
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true);
  const [emailMonthlyReport, setEmailMonthlyReport] = useState(true);
  const [emailErrorAlerts, setEmailErrorAlerts] = useState(true);
  const [emailBillingAlerts, setEmailBillingAlerts] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [conversationAlerts, setConversationAlerts] = useState(false);
  const [knowledgeAlerts, setKnowledgeAlerts] = useState(false);
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/tenants/${tenant?.id}`, { settings: {
        emailNewConversation, emailWeeklySummary, emailMonthlyReport,
        emailErrorAlerts, emailBillingAlerts, inAppNotifications, slackWebhookUrl,
      } });
      addToast('Notification settings saved', 'success');
    } catch {
      addToast('Failed to save notification settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader><PremiumCardTitle>Notification Preferences</PremiumCardTitle></PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-6 max-w-xl">
          <div>
            <p className="text-sm font-semibold text-white mb-3">Email Notifications</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">New conversation alert</span>
                <Switch checked={emailNewConversation} onChange={setEmailNewConversation} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Weekly summary</span>
                <Switch checked={emailWeeklySummary} onChange={setEmailWeeklySummary} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Monthly report</span>
                <Switch checked={emailMonthlyReport} onChange={setEmailMonthlyReport} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Error alerts</span>
                <Switch checked={emailErrorAlerts} onChange={setEmailErrorAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">Billing alerts</span>
                <Switch checked={emailBillingAlerts} onChange={setEmailBillingAlerts} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">In-App Notifications</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">Show notifications within the dashboard</p>
            </div>
            <Switch checked={inAppNotifications} onChange={setInAppNotifications} />
          </div>

          <Input label="Slack Webhook URL" value={slackWebhookUrl} onChange={e => setSlackWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..." />

          <Button onClick={handleSave} loading={saving}>Save Notification Settings</Button>
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function AuditLogsSection() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', page: String(page) });
      if (search) params.set('search', search);
      if (eventType !== 'all') params.set('type', eventType);
      const res = await apiClient.get<{ logs: AuditLog[]; total: number }>(`/audit?${params}`);
      setLogs(res.logs || []);
      setTotalPages(res.total ? Math.ceil(res.total / 50) : 1);
    } catch {
      addToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, search, eventType, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Details'].join(','),
      ...logs.map(l => [l.timestamp, l.user, l.action, l.resource, `"${l.details.replace(/"/g, '""')}"`].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('Audit log exported', 'success');
  };

  return (
    <PremiumCard padding="lg">
      <PremiumCardHeader>
        <PremiumCardTitle>Audit Logs</PremiumCardTitle>
        <Button size="sm" variant="secondary" onClick={handleExport} disabled={logs.length === 0}>
          CSV Export
        </Button>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1">
            <Input placeholder="Search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              aria-label="Search audit logs" />
          </div>
          <div className="w-full sm:w-48">
            <Select options={EVENT_TYPE_OPTIONS} value={eventType} onChange={e => { setEventType(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="text" className="!h-10" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon="📋" title="No audit logs found" description="Actions performed in this workspace will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Audit logs">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-[rgba(255,255,255,0.4)] text-xs uppercase tracking-wider">
                    <th className="py-3 pr-4 font-medium">Timestamp</th>
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                    <th className="py-3 pr-4 font-medium">Resource</th>
                    <th className="py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3 pr-4 text-[rgba(255,255,255,0.5)] text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-white">{log.user}</td>
                      <td className="py-3 pr-4"><Badge variant="neutral" size="sm">{log.action}</Badge></td>
                      <td className="py-3 pr-4 text-[rgba(255,255,255,0.6)] text-xs font-mono">{log.resource}</td>
                      <td className="py-3 text-[rgba(255,255,255,0.5)] text-xs max-w-[200px] truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)]">
                <span className="text-xs text-[rgba(255,255,255,0.4)]">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}

function DangerZoneSection() {
  const { addToast } = useToast();
  const { tenant } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wiping, setWiping] = useState(false);

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/tenants/${tenant?.id}`);
      addToast('Workspace deleted', 'error');
    } catch {
      addToast('Failed to delete workspace', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleWipeData = async () => {
    setWiping(true);
    try {
      await apiClient.post('/admin/unanswered/record', { action: 'wipe' });
      addToast('All data wiped', 'success');
    } catch {
      addToast('Failed to wipe data', 'error');
    } finally {
      setWiping(false);
      setConfirmWipe(false);
    }
  };

  return (
    <div className="space-y-6">
      <PremiumCard padding="lg" className="border-[rgba(201,59,59,0.3)] bg-[rgba(201,59,59,0.04)]">
        <PremiumCardHeader>
          <PremiumCardTitle className="text-[#F26D6D]">Danger Zone</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6">
            Destructive actions are irreversible. Proceed with caution.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] border border-[rgba(201,59,59,0.2)] bg-[rgba(201,59,59,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Delete Workspace</p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                    Permanently delete this workspace and all its data. This action cannot be undone.
                  </p>
                </div>
                <div className="shrink-0 ml-4">
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="danger" onClick={handleDeleteWorkspace} loading={deleting}>Confirm</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Delete my workspace</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] border border-[rgba(201,59,59,0.2)] bg-[rgba(201,59,59,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Remove All Data</p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                    Wipe all conversations, documents, and analytics data. The workspace structure remains.
                  </p>
                </div>
                <div className="shrink-0 ml-4">
                  {confirmWipe ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="danger" onClick={handleWipeData} loading={wiping}>Confirm</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmWipe(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setConfirmWipe(true)}>Wipe Data</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
