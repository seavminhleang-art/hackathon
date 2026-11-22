"use client";

import { useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  Megaphone,
  Phone,
  Plus,
  Siren,
  TrafficCone,
  Users,
  Waves,
} from "lucide-react";
import { PageContainer } from "@/components/layout/AppShell";
import {
  Button,
  Card,
  ChoiceCard,
  CountBadge,
  EmptyState,
  IconTile,
  LinkButton,
  ListRow,
  PageHeader,
  Section,
  SelectField,
  Sheet,
  SkeletonRows,
  StatusChip,
  TextArea,
  TextField,
  type Accent,
  type ChipStatus,
} from "@/components/ui";

// Internal page for the team (English only). Shows every kit component with the
// rules for using it. Source: src/components/ui. Not linked from the nav: open /design directly.

const COLORS: { name: string; cls: string; use: string }[] = [
  { name: "primary", cls: "bg-primary", use: "Main actions, links, active nav" },
  { name: "primary-tint", cls: "bg-primary-tint", use: "Selected / hover backgrounds" },
  { name: "gold", cls: "bg-gold", use: "Decoration only, never text on white" },
  { name: "danger", cls: "bg-danger", use: "Emergency ONLY: SOS, hotlines, alerts" },
  { name: "reported", cls: "bg-reported", use: "Status: waiting / needs attention" },
  { name: "progress", cls: "bg-progress", use: "Status: being worked on" },
  { name: "fixed", cls: "bg-fixed", use: "Status: done / open now" },
  { name: "ink", cls: "bg-ink", use: "Body text" },
  { name: "ink-muted", cls: "bg-ink-muted", use: "Secondary text" },
  { name: "sand", cls: "bg-sand ring-1 ring-line", use: "Page background" },
  { name: "surface", cls: "bg-surface ring-1 ring-line", use: "Cards" },
];

const STATUSES: ChipStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEED_MORE_INFO",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "PENDING",
  "APPROVED",
  "FOUND",
  "LOST",
  "OPEN",
  "SHUT",
];

const ACCENTS: { accent: Accent; icon: typeof FileText; feature: string }[] = [
  { accent: "primary", icon: Megaphone, feature: "Gov reporting" },
  { accent: "gold", icon: KeyRound, feature: "Lost & Found" },
  { accent: "fixed", icon: Building2, feature: "Services" },
  { accent: "reported", icon: Users, feature: "Community" },
  { accent: "danger", icon: Siren, feature: "Emergency" },
  { accent: "neutral", icon: FileText, feature: "Generic" },
];

function Demo({ title, rule, children }: { title: string; rule: string; children: React.ReactNode }) {
  return (
    <Section title={title} hint={rule}>
      <Card className="flex flex-col gap-4">{children}</Card>
    </Section>
  );
}

export function KitShowcase() {
  const [sheet, setSheet] = useState(false);
  return (
    <PageContainer>
      <PageHeader
        title="CityVoice UI kit"
        subtitle={'Import from "@/components/ui". Build every feature screen from these pieces so the app feels like one product.'}
        actions={
          <LinkButton href="/" variant="secondary" size="sm">
            Back to home
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-8">
        <Demo title="Colors" rule="Tailwind tokens from globals.css: bg-primary, text-ink-muted… Never hard-code hex.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className={`size-10 flex-none rounded-xl ${c.cls}`} />
                <span className="min-w-0">
                  <span className="block font-mono text-meta font-semibold">{c.name}</span>
                  <span className="block text-meta text-ink-muted">{c.use}</span>
                </span>
              </div>
            ))}
          </div>
        </Demo>

        <Demo title="Type & shape" rule="Kantumruy Pro + Inter. Use the scale tokens below, never text-xs or px sizes. 13px is the minimum. Radii: 12px controls, 16px cards.">
          <div className="flex flex-col gap-1">
            <p className="text-page font-bold lg:text-display">text-page / lg:text-display · ចំណងជើងទំព័រ</p>
            <p className="text-title font-bold">text-title (22px) · section heading · ចំណងជើងផ្នែក</p>
            <p className="text-row font-semibold">text-row (18px) · card / row title · ចំណងជើងកាត</p>
            <p className="text-body">text-body (17px) · paragraphs, buttons, inputs · អត្ថបទ</p>
            <p className="text-meta text-ink-muted">text-meta (15px) · subtitles, hints · ព័ត៌មានបន្ថែម</p>
            <p className="text-caption text-ink-muted">text-caption (13px, minimum) · tab labels, times · ម៉ោង</p>
          </div>
        </Demo>

        <Demo title="Buttons" rule="One primary per screen. Danger is for emergency only. Min 48px tall (sm = 40px for dense rows).">
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={Plus}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost" trailingIcon={ChevronRight}>
              Ghost
            </Button>
            <Button variant="danger" icon={Phone}>
              Call 117
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <LinkButton href="/" variant="secondary" size="sm">
              LinkButton (next/link)
            </LinkButton>
          </div>
        </Demo>

        <Demo title="Status chip" rule="Always icon + label + color, never color alone. Pass the API status straight in.">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
        </Demo>

        <Demo title="Feature accents (IconTile)" rule="Each feature keeps one accent so users know where they are.">
          <div className="flex flex-wrap gap-4">
            {ACCENTS.map((a) => (
              <div key={a.accent} className="flex items-center gap-2.5">
                <IconTile icon={a.icon} accent={a.accent} />
                <span>
                  <span className="block font-mono text-meta font-semibold">{a.accent}</span>
                  <span className="block text-meta text-ink-muted">{a.feature}</span>
                </span>
              </div>
            ))}
          </div>
        </Demo>

        <Section title="Lists" hint="<Card padded={false} as='ul'> + <ListRow>. Rows link with href; extra actions go in children.">
          <Card padded={false} as="ul">
            <ListRow
              icon={TrafficCone}
              accent="primary"
              href="/"
              title="Traffic light off at Russian Blvd x Monivong"
              subtitle="RPT-2026-00007"
              meta={
                <>
                  <StatusChip status="IN_PROGRESS" />
                  <span className="text-meta text-ink-muted">Road Maintenance is fixing it</span>
                </>
              }
            />
            <ListRow icon={Waves} accent="primary" title="Drain cover broken" subtitle="RPT-2026-00009" meta={<StatusChip status="RESOLVED" />}>
              <div>
                <Button size="sm" icon={Check}>
                  Confirm it&apos;s fixed
                </Button>
              </div>
            </ListRow>
            <ListRow icon={Bell} accent="neutral" href="/" title="Notifications" trailing={<CountBadge count={3} />} />
          </Card>
        </Section>

        <Demo title="Form fields" rule="Label always visible. Hint under the field; error replaces the hint. 16px text so phones don't zoom.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Title" placeholder="e.g. Blocked drain on St. 289" hint="Short and specific" />
            <TextField label="Phone" error="Enter a Cambodian number, e.g. 012 345 678" defaultValue="12" />
            <SelectField label="Khan" defaultValue="tuol-kouk">
              <option value="tuol-kouk">Tuol Kouk</option>
              <option value="sen-sok">Sen Sok</option>
            </SelectField>
            <TextField label="Landmark" optional="optional" placeholder="Near the market gate" />
            <div className="sm:col-span-2">
              <TextArea label="What's the problem?" placeholder="Describe what you see" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-body font-semibold">ChoiceCard (radio)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <ChoiceCard name="cat" defaultChecked label="Roads & traffic" description="Potholes, lights" icon={<IconTile icon={TrafficCone} accent="primary" size="sm" />} />
              <ChoiceCard name="cat" label="Drains & flooding" icon={<IconTile icon={Waves} accent="primary" size="sm" />} />
              <ChoiceCard name="cat" label="Add photo" icon={<IconTile icon={Camera} accent="neutral" size="sm" />} />
            </div>
          </div>
        </Demo>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Empty state" hint="Say what will appear and give one next step.">
            <EmptyState
              icon={ClipboardList}
              title="No reports yet"
              body="Seen a broken streetlight? Reporting takes about a minute."
              action={
                <Button variant="secondary" size="sm">
                  Make your first report
                </Button>
              }
            />
          </Section>
          <Section title="Loading" hint="SkeletonRows while the mock API (300ms) answers.">
            <SkeletonRows rows={2} />
          </Section>
        </div>

        <Demo title="Sheet" rule="Bottom sheet on phones, dialog on desktop. Use for confirmations and short pickers.">
          <div>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
          </div>
        </Demo>

        <Demo title="Page skeleton for a new feature screen" rule="Copy this into src/app/(app)/<route>/page.tsx.">
          <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-meta leading-relaxed text-white">{`"use client";
import { PageContainer } from "@/components/layout/AppShell";
import { PageHeader, Section, Card, ListRow, LinkButton } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function LostFoundPage() {
  const { t } = useLocale();
  return (
    <PageContainer>
      <PageHeader title={t.tileLostFound} back="/"
        actions={<LinkButton href="/lost-found/new">{t.postItem}</LinkButton>} />
      <Section title={t.nearYou}>
        <Card padded={false} as="ul">{/* <ListRow … /> */}</Card>
      </Section>
    </PageContainer>
  );
}`}</pre>
        </Demo>
      </div>

      {sheet && (
        <Sheet title="Confirm it's fixed?" onClose={() => setSheet(false)}>
          <p className="text-body text-ink-muted">The department marked this report resolved. Is the problem gone?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setSheet(false)}>
              Not yet
            </Button>
            <Button icon={Check} onClick={() => setSheet(false)}>
              Yes, fixed
            </Button>
          </div>
        </Sheet>
      )}
    </PageContainer>
  );
}
