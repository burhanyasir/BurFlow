import { useState } from 'react';
import { tokens } from '../../theme/tokens';
import { Container } from '../../layouts/Container';
import { Grid } from '../../layouts/Grid';
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Alert,
  Tooltip,
  Modal,
  Drawer,
  Popover,
  PopoverItem,
  Pagination,
  Breadcrumb,
  Avatar,
  useToast,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  Progress,
  EmptyState,
  ErrorState,
  Tabs,
  Table,
  Dropdown,
} from '../../components/ui';

const tableColumns = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status', render: (item: any) => <Badge variant={item.status === 'Active' ? 'success' : 'neutral'}>{item.status}</Badge> },
];

const tableData = [
  { name: 'Alice Chen', role: 'Admin', status: 'Active' },
  { name: 'Bob Martinez', role: 'Editor', status: 'Active' },
  { name: 'Carol Smith', role: 'Viewer', status: 'Inactive' },
];

const spacingScale = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-[#0B0C10] mb-6 mt-16 first:mt-0">{children}</h2>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-[#0B0C10] mb-4 mt-8">{children}</h3>;
}

function Divider() {
  return <hr className="border-t border-[#D0D5DD] my-12" />;
}

export default function DemoPage() {
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(false);
  const [radioValue, setRadioValue] = useState('option-1');
  const [page, setPage] = useState(1);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({ success: true, warning: true, error: true, info: true });

  return (
    <Container className="py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[#0B0C10] mb-2">Conversation Engine</h1>
        <p className="text-lg text-[#5F6570]">Component Library Demo</p>
      </header>

      <SectionHeading>1. Typography</SectionHeading>
      <Card variant="bordered">
        <CardContent className="space-y-4">
          {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const).map(s => {
            const sizeKey = s as keyof typeof tokens.font.size;
            const weightKey = s === 'xs' || s === 'sm' ? 'medium' as const : 'normal' as const;
            return (
              <div key={s} className="flex items-baseline gap-4">
                <span className="text-xs text-[#A0A5B0] w-16 shrink-0 font-mono">{s}</span>
                <span className="text-xs text-[#A0A5B0] font-mono">{tokens.font.size[sizeKey]}</span>
                <p style={{ fontSize: tokens.font.size[sizeKey], fontWeight: tokens.font.weight[weightKey as keyof typeof tokens.font.weight], lineHeight: '1.5' }} className="text-[#0B0C10]">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <SectionHeading>2. Colors</SectionHeading>
      <Grid cols={4} gap="md">
        <Card variant="bordered" className="bg-[#5865F2] text-white">
          <CardContent><p className="font-medium">Primary</p><code className="text-xs opacity-80">#5865F2</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#00F0FF] text-[#0B0C10]">
          <CardContent><p className="font-medium">Cyan</p><code className="text-xs opacity-80">#00F0FF</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#FFB800] text-[#0B0C10]">
          <CardContent><p className="font-medium">Amber</p><code className="text-xs opacity-80">#FFB800</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#0B0C10] text-white">
          <CardContent><p className="font-medium">Obsidian</p><code className="text-xs opacity-80">#0B0C10</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#10B981] text-white">
          <CardContent><p className="font-medium">Success</p><code className="text-xs opacity-80">#10B981</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#EF4444] text-white">
          <CardContent><p className="font-medium">Error</p><code className="text-xs opacity-80">#EF4444</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#3B82F6] text-white">
          <CardContent><p className="font-medium">Info</p><code className="text-xs opacity-80">#3B82F6</code></CardContent>
        </Card>
        <Card variant="bordered" className="bg-[#F0F1F3] text-[#0B0C10]">
          <CardContent><p className="font-medium">Surface</p><code className="text-xs opacity-80">#F0F1F3</code></CardContent>
        </Card>
      </Grid>

      <SectionHeading>3. Spacing</SectionHeading>
      <Card variant="bordered">
        <CardContent className="space-y-3">
          {spacingScale.map(s => (
            <div key={s} className="flex items-center gap-4">
              <span className="text-xs text-[#A0A5B0] font-mono w-16 shrink-0">{s}</span>
              <span className="text-xs text-[#A0A5B0] font-mono w-16 shrink-0">{tokens.spacing[String(s) as keyof typeof tokens.spacing]}</span>
              <div className="bg-[#5865F2] rounded shrink-0" style={{ width: tokens.spacing[String(s) as keyof typeof tokens.spacing], height: '16px' }} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Divider />

      <SectionHeading>4. Buttons</SectionHeading>
      <SubHeading>Variants</SubHeading>
      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>

      <SubHeading>Sizes</SubHeading>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>

      <SubHeading>Loading & Disabled</SubHeading>
      <div className="flex flex-wrap gap-3 mb-6">
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button variant="danger" disabled>Disabled Danger</Button>
      </div>

      <SubHeading>Full Width</SubHeading>
      <Button fullWidth>Full Width Button</Button>

      <Divider />

      <SectionHeading>5. Form Inputs</SectionHeading>
      <Grid cols={2} gap="lg">
        <div className="space-y-4">
          <SubHeading>Input</SubHeading>
          <Input placeholder="Default input" />
          <Input label="With Label" placeholder="Has label" />
          <Input error="This field is required" placeholder="Error state" />
          <Input disabled value="Disabled" />
          <Input helperText="This is helper text" placeholder="With helper" />
        </div>
        <div className="space-y-4">
          <SubHeading>Textarea</SubHeading>
          <Textarea placeholder="Default textarea" />
          <Textarea label="Description" placeholder="Enter description" />
          <Textarea error="Please provide a description" />
          <Textarea disabled value="Disabled textarea" />
        </div>
      </Grid>

      <Grid cols={3} gap="lg" className="mt-6">
        <div className="space-y-4">
          <SubHeading>Select</SubHeading>
          <Select options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} placeholder="Choose one" />
          <Select label="Framework" options={[{ value: 'react', label: 'React' }, { value: 'vue', label: 'Vue' }, { value: 'angular', label: 'Angular' }]} />
          <Select label="With Error" error="Required" options={[{ value: '1', label: 'One' }]} />
        </div>
        <div className="space-y-4">
          <SubHeading>Checkbox</SubHeading>
          <Checkbox label="Accept terms" />
          <Checkbox label="Subscribe to newsletter" defaultChecked />
          <Checkbox label="Disabled option" disabled />
        </div>
        <div className="space-y-4">
          <SubHeading>Radio & Switch</SubHeading>
          <RadioGroup name="demo-radio" value={radioValue} onChange={setRadioValue} label="Choose option" options={[{ value: 'option-1', label: 'Option 1' }, { value: 'option-2', label: 'Option 2' }, { value: 'option-3', label: 'Option 3' }]} />
          <Switch checked={switchOn} onChange={setSwitchOn} label="Toggle me" />
          <Switch checked onChange={() => {}} disabled label="Disabled" />
        </div>
      </Grid>

      <Divider />

      <SectionHeading>6. Cards</SectionHeading>
      <Grid cols={4} gap="md">
        <Card variant="default"><CardContent>Default</CardContent></Card>
        <Card variant="glass"><CardContent>Glass</CardContent></Card>
        <Card variant="bordered"><CardContent>Bordered</CardContent></Card>
        <Card variant="flat"><CardContent>Flat</CardContent></Card>
      </Grid>
      <Card variant="default" hoverable className="mt-4">
        <CardHeader>
          <CardTitle>Hoverable Card</CardTitle>
          <Badge>New</Badge>
        </CardHeader>
        <CardDescription>This card has a header, title, description, and footer.</CardDescription>
        <CardContent className="mt-4 text-sm text-[#5F6570]">
          Hover over this card to see the lift effect.
        </CardContent>
        <CardFooter>
          <Button size="sm">Action</Button>
          <Button size="sm" variant="ghost">Cancel</Button>
        </CardFooter>
      </Card>

      <Divider />

      <SectionHeading>7. Badges</SectionHeading>
      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
      </div>

      <Divider />

      <SectionHeading>8. Alerts</SectionHeading>
      <div className="space-y-3">
        {(['success', 'warning', 'error', 'info'] as const).map(v => (
          alerts[v] && (
            <Alert key={v} variant={v} title={v.charAt(0).toUpperCase() + v.slice(1)} dismissible onDismiss={() => setAlerts(prev => ({ ...prev, [v]: false }))}>
              This is a {v} alert for demonstrating the alert component.
            </Alert>
          )
        ))}
        {Object.values(alerts).every(v => !v) && (
          <Button onClick={() => setAlerts({ success: true, warning: true, error: true, info: true })}>Reset Alerts</Button>
        )}
      </div>

      <Divider />

      <SectionHeading>9. Tables</SectionHeading>
      <SubHeading>With Data</SubHeading>
      <Table columns={tableColumns} data={tableData} keyExtractor={(r) => r.name} className="mb-6" />
      <SubHeading>Loading</SubHeading>
      <Table columns={tableColumns} data={[]} keyExtractor={(r) => (r as any).name} loading className="mb-6" />
      <SubHeading>Empty State</SubHeading>
      <Table columns={tableColumns} data={[]} keyExtractor={(r) => (r as any).name} emptyState={<EmptyState title="No data" description="There are no records to display." />} />

      <Divider />

      <SectionHeading>10. Tabs</SectionHeading>
      <Tabs
        tabs={[
          { id: 'tab1', label: 'Account', content: <p className="text-[#5F6570]">Account settings and preferences.</p> },
          { id: 'tab2', label: 'Security', content: <p className="text-[#5F6570]">Security settings and authentication.</p> },
          { id: 'tab3', label: 'Notifications', content: <p className="text-[#5F6570]">Notification preferences.</p> },
          { id: 'tab4', label: 'Billing', disabled: true, content: <p className="text-[#5F6570]">Billing (disabled).</p> },
        ]}
      />

      <Divider />

      <SectionHeading>11. Modals & Drawers</SectionHeading>
      <div className="flex gap-3">
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Button onClick={() => setDrawerOpen(true)} variant="secondary">Open Drawer</Button>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal Title" description="This is a modal dialog example.">
        <p className="text-sm text-[#5F6570] mb-4">Modal content goes here. You can put any React components inside.</p>
        <Button onClick={() => setModalOpen(false)}>Close</Button>
      </Modal>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer Title" side="right">
        <p className="text-sm text-[#5F6570] mb-4">Drawer content slides in from the side.</p>
        <Button onClick={() => setDrawerOpen(false)}>Close</Button>
      </Drawer>

      <Divider />

      <SectionHeading>12. Tooltips & Popovers</SectionHeading>
      <div className="flex flex-wrap gap-4 items-center">
        <Tooltip content="Tooltip on top">
          <Button size="sm" variant="secondary">Hover me (top)</Button>
        </Tooltip>
        <Tooltip content="Tooltip on bottom" position="bottom">
          <Button size="sm" variant="secondary">Hover me (bottom)</Button>
        </Tooltip>
        <Tooltip content="Tooltip on left" position="left">
          <Button size="sm" variant="secondary">Hover me (left)</Button>
        </Tooltip>
        <Tooltip content="Tooltip on right" position="right">
          <Button size="sm" variant="secondary">Hover me (right)</Button>
        </Tooltip>
      </div>
      <div className="mt-4">
        <Popover trigger={<Button variant="secondary">Open Popover</Button>} position="bottom">
          <PopoverItem onClick={() => addToast('Edit clicked')}>Edit</PopoverItem>
          <PopoverItem onClick={() => addToast('Duplicate clicked')}>Duplicate</PopoverItem>
          <PopoverItem onClick={() => addToast('Delete clicked')}>Delete</PopoverItem>
        </Popover>
      </div>

      <Divider />

      <SectionHeading>13. Dropdown</SectionHeading>
      <Dropdown
        trigger={<Button variant="secondary">Open Dropdown</Button>}
        items={[
          { label: 'Profile', onClick: () => addToast('Profile clicked') },
          { label: 'Settings', onClick: () => addToast('Settings clicked') },
          { label: 'Disabled', disabled: true },
          { label: 'Delete', variant: 'danger', onClick: () => addToast('Delete clicked') },
        ]}
      />

      <Divider />

      <SectionHeading>14. Pagination</SectionHeading>
      <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />

      <Divider />

      <SectionHeading>15. Breadcrumbs</SectionHeading>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />
      <Breadcrumb className="mt-2" items={[{ label: 'Projects' }, { label: 'Conversation Engine', href: '#' }, { label: 'Components' }]} />

      <Divider />

      <SectionHeading>16. Avatars</SectionHeading>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name="Alice Chen" size="sm" />
        <Avatar name="Bob Martinez" size="md" />
        <Avatar name="Carol Smith" size="lg" />
        <Avatar src="https://i.pravatar.cc/80?img=1" alt="User avatar" name="User" size="md" />
        <Avatar src="https://i.pravatar.cc/80?img=2" alt="User avatar" name="Jane" size="lg" />
      </div>

      <Divider />

      <SectionHeading>17. Skeleton</SectionHeading>
      <Grid cols={3} gap="md">
        <div className="space-y-3">
          <SubHeading>Text</SubHeading>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="50%" />
        </div>
        <div className="space-y-3">
          <SubHeading>Card</SubHeading>
          <SkeletonCard />
        </div>
        <div className="space-y-3">
          <SubHeading>Table</SubHeading>
          <SkeletonTable rows={4} />
        </div>
      </Grid>

      <Divider />

      <SectionHeading>18. Progress</SectionHeading>
      <div className="space-y-4 max-w-md">
        <Progress value={25} showLabel />
        <Progress value={50} variant="success" showLabel />
        <Progress value={75} variant="warning" showLabel />
        <Progress value={100} variant="danger" showLabel />
      </div>

      <Divider />

      <SectionHeading>19. Empty States</SectionHeading>
      <Grid cols={2} gap="md">
        <Card variant="bordered">
          <EmptyState title="No messages yet" description="Start a conversation to see messages here." />
        </Card>
        <Card variant="bordered">
          <EmptyState title="No results found" description="Try adjusting your search or filters." action={{ label: 'Clear Filters', onClick: () => addToast('Filters cleared') }} />
        </Card>
      </Grid>

      <Divider />

      <SectionHeading>20. Error States</SectionHeading>
      <Grid cols={2} gap="md">
        <Card variant="bordered">
          <ErrorState />
        </Card>
        <Card variant="bordered">
          <ErrorState title="Failed to load data" description="Unable to fetch the requested data. Check your connection." onRetry={() => addToast('Retrying...')} />
        </Card>
      </Grid>

      <Divider />

      <SectionHeading>21. Toast</SectionHeading>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => addToast('Operation completed!', 'success')}>Success Toast</Button>
        <Button onClick={() => addToast('Warning: check your input', 'warning')}>Warning Toast</Button>
        <Button variant="danger" onClick={() => addToast('Something went wrong!', 'error')}>Error Toast</Button>
        <Button variant="ghost" onClick={() => addToast('Here is some info.', 'info')}>Info Toast</Button>
      </div>

      <Divider />

      <SectionHeading>22. Layout</SectionHeading>
      <SubHeading>Container</SubHeading>
      <Card variant="flat" className="text-sm text-[#5F6570] mb-6">
        <CardContent>The entire demo page is wrapped in a <code className="text-[#5865F2]">Container</code> component with max width and responsive padding.</CardContent>
      </Card>
      <SubHeading>Grid</SubHeading>
      <Grid cols={3} gap="md">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} variant="bordered" className="text-center">
            <CardContent className="py-6 text-[#5F6570]">Grid Item {i}</CardContent>
          </Card>
        ))}
      </Grid>

      <footer className="mt-16 pt-8 border-t border-[#D0D5DD] text-center text-sm text-[#A0A5B0]">
        Conversation Engine &copy; {new Date().getFullYear()} &mdash; Component Library Demo
      </footer>
    </Container>
  );
}
