const PREFIXES = ['Smart', 'Chat', 'Auto', 'Lead', 'Sales', 'Flow', 'Bot', 'Pulse', 'Nova', 'Zen', 'Turbo', 'Luma', 'Vox', 'Synth', 'Aero', 'Nimbus', 'Quill', 'Echo', 'Orbit', 'Spark'];
const CORES = ['ly', 'mate', 'bot', 'desk', 'wise', 'loop', 'stack', 'beam', 'link', 'vault', 'sprint', 'forge', 'mesh', 'scribe', 'signal', 'compass', 'vector', 'harbor', 'lane', 'lens'];
const SUFFIXES = ['AI', 'HQ', 'Pro', 'Labs', '360', 'Suite', 'OS', 'Flow', 'Works', 'ly'];
const BRAND_MODIFIERS = ['Cloud', 'Stack', 'Scale', 'Launch', 'Pilot', 'Edge', 'Core', 'Shift', 'Wave', 'Reach', 'Loop', 'Mode'];

function title(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function seedFrom(seed: string, salt: number): number {
  let h = 2166136261;
  const input = `${seed}${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Combinatorial, deterministic name generation from an optional seed word. */
export function generateNames(seed: string, kind: 'chatbot' | 'brand', count = 12): string[] {
  const base = seed.trim();
  const out = new Set<string>();
  const baseTitle = base ? title(base) : '';
  const push = (name: string) => {
    if (name.length <= 24) out.add(name);
  };

  if (base) {
    push(baseTitle);
    push(`${baseTitle} AI`);
    push(`${baseTitle} Assistant`);
    push(`Chat${baseTitle}`);
    push(`${baseTitle}Bot`);
  }

  for (let i = 0; i < count * 3; i++) {
    const s = seedFrom(base || 'burflow', i);
    const p = PREFIXES[s % PREFIXES.length];
    const c = CORES[(s >> 3) % CORES.length];
    const suf = SUFFIXES[(s >> 5) % SUFFIXES.length];
    if (kind === 'chatbot') {
      push(`${p}${c}`);
      push(`${p}${c} ${suf}`);
      push(`${c}${suf}`);
      if (base) push(`${baseTitle} ${p}${c}`);
    } else {
      const mod = BRAND_MODIFIERS[(s >> 4) % BRAND_MODIFIERS.length];
      push(`${p}${c}`);
      push(`${p}${mod}`);
      push(`${c}${mod}`);
      push(`${baseTitle || p}${mod}`);
      push(`${baseTitle || c} ${suf}`);
    }
    if (out.size >= count) break;
  }

  if (out.size < count) {
    for (let i = 0; i < count * 2 && out.size < count; i++) {
      push(`${PREFIXES[(i * 7) % PREFIXES.length]}${CORES[(i * 13) % CORES.length]}${SUFFIXES[i % SUFFIXES.length]}`);
    }
  }

  return Array.from(out).slice(0, count);
}

export interface SignatureOptions {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  accentColor: string;
}

export function buildSignatureHtml(o: SignatureOptions): string {
  const color = o.accentColor || '#3B82F6';
  const lines = [
    `<strong>${escapeHtml(o.name || 'Your Name')}</strong>`,
    o.role ? escapeHtml(o.role) : '',
    o.company ? escapeHtml(o.company) : '',
    o.phone ? `<a href="tel:${escapeHtml(o.phone)}" style="color:#64748B;text-decoration:none;">${escapeHtml(o.phone)}</a>` : '',
    o.email ? `<a href="mailto:${escapeHtml(o.email)}" style="color:${color};text-decoration:none;">${escapeHtml(o.email)}</a>` : '',
    o.website ? `<a href="${escapeHtml(o.website)}" style="color:${color};text-decoration:none;">${escapeHtml(o.website)}</a>` : '',
    o.linkedin ? `<a href="${escapeHtml(o.linkedin)}" style="color:#64748B;text-decoration:none;">LinkedIn</a>` : '',
  ].filter(Boolean);
  const separator = o.company || o.name ? '<tr><td style="height:8px;"></td></tr>' : '';
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#334155;line-height:1.5;">
<tr><td style="border-left:3px solid ${color};padding-left:12px;">
${lines.map((l) => `<div>${l}</div>`).join('')}
</td></tr>
${separator}
</table>`;
}

export function buildSignaturePlain(o: SignatureOptions): string {
  return [o.name, o.role, o.company, o.phone, o.email, o.website, o.linkedin].filter(Boolean).join(' | ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}