import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Cloud,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  ChevronDown,
  Code2,
  PlayCircle,
} from 'lucide-react';
import { EHSAAN_PLAY_SUPABASE_SQL_MIGRATION } from '../../services/supabase/schemaMigration';

interface SupabaseSetupGuideProps {
  onCopySql: () => void;
  isSqlCopied: boolean;
  onTestConnection?: () => void;
  isVerifying?: boolean;
}

type GuideShapeKind =
  | 'scallop8'
  | 'clover4'
  | 'starburst10'
  | 'pebble'
  | 'arch'
  | 'blossom5'
  | 'hexagon';

function pointsToSmoothClosedPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return '';
  const fmt = (v: number) => Number(v.toFixed(3));
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${d} Z`;
}

function buildPolarBadgePath(
  radiusFn: (theta: number) => number,
  samples = 48
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const r = radiusFn(theta) * 100;
    pts.push([50 + r * Math.cos(theta), 50 + r * Math.sin(theta)]);
  }
  return pointsToSmoothClosedPath(pts);
}

function buildPebblePath(): string {
  // Organic tilted pill/pebble matching step 4 shape in Material 3 Expressive
  return buildPolarBadgePath((t) => 0.41 + 0.055 * Math.cos(2 * (t + Math.PI / 5)), 48);
}

function buildArchBadgePath(): string {
  return 'M 8 47 C 8 18, 25 5, 50 5 C 75 5, 92 18, 92 47 L 92 79 C 92 89, 85 95, 75 95 L 25 95 C 15 95, 8 89, 8 79 Z';
}

function buildHexagonBadgePath(): string {
  const vertices: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3;
    vertices.push([50 + 45 * Math.cos(angle), 50 + 47 * Math.sin(angle)]);
  }
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = vertices[k];
    const b = vertices[(k + 1) % 6];
    const lerp = (t: number): [number, number] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    pts.push(lerp(0.18), lerp(0.5), lerp(0.82));
  }
  return pointsToSmoothClosedPath(pts);
}

const BADGE_PATHS: Record<GuideShapeKind, string> = {
  scallop8: buildPolarBadgePath((t) => 0.43 + 0.042 * Math.cos(8 * t), 48),
  clover4: buildPolarBadgePath((t) => 0.405 + 0.068 * Math.cos(4 * (t - Math.PI / 4)), 48),
  starburst10: buildPolarBadgePath((t) => 0.425 + 0.048 * Math.cos(10 * t), 60),
  pebble: buildPebblePath(),
  arch: buildArchBadgePath(),
  blossom5: buildPolarBadgePath((t) => 0.415 + 0.055 * Math.cos(5 * (t - Math.PI / 2)), 60),
  hexagon: buildHexagonBadgePath(),
};

interface StepCardTone {
  containerClass: string;
  bodyTextClass: string;
  badgeFillColor: string;
  badgeTextColor: string;
  actionButtonClass: string;
}

const STEP_TONES: StepCardTone[] = [
  // Tone A: Olive Accent Tonal Card
  {
    containerClass:
      'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-[var(--border-subtle)]',
    bodyTextClass: 'text-[var(--text-card-olive)] opacity-90',
    badgeFillColor: 'var(--accent-primary)',
    badgeTextColor: 'var(--bg-primary)',
    actionButtonClass:
      'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-92',
  },
  // Tone B: Elevated Surface Tonal Card
  {
    containerClass:
      'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]',
    bodyTextClass: 'text-[var(--text-secondary)]',
    badgeFillColor: 'var(--bg-card-olive)',
    badgeTextColor: 'var(--text-card-olive)',
    actionButtonClass:
      'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-92',
  },
  // Tone C: Warm Secondary / Yellow Tonal Card
  {
    containerClass:
      'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] border border-[var(--border-subtle)]',
    bodyTextClass: 'text-[var(--text-card-yellow)] opacity-90',
    badgeFillColor: 'var(--bg-primary)',
    badgeTextColor: 'var(--text-primary)',
    actionButtonClass:
      'bg-[var(--bg-primary)] text-[var(--text-primary)] hover:opacity-92',
  },
  // Tone D: Subtle Neutral Surface Card
  {
    containerClass:
      'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]',
    bodyTextClass: 'text-[var(--text-secondary)]',
    badgeFillColor: 'var(--accent-secondary)',
    badgeTextColor: 'var(--accent-secondary-text)',
    actionButtonClass:
      'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-92',
  },
];

export const SupabaseSetupGuide: React.FC<SupabaseSetupGuideProps> = ({
  onCopySql,
  isSqlCopied,
  onTestConnection,
  isVerifying = false,
}) => {
  const [isSqlPreviewOpen, setIsSqlPreviewOpen] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const steps: {
    step: number;
    shape: GuideShapeKind;
    title: string;
    description: string;
    extra?: React.ReactNode;
  }[] = [
    {
      step: 1,
      shape: 'scallop8',
      title: 'Create a free account',
      description:
        'Open Supabase and sign up or sign in. You get your own private Postgres database on the free plan with zero shared user tables.',
      extra: (
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition shadow-2xs"
        >
          <span>Open Supabase.com</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
    {
      step: 2,
      shape: 'clover4',
      title: 'New project & region',
      description:
        'Click New Project in the dashboard, name it (for example EhsaanPlay), set an admin database password for your records, pick your nearest cloud region, and wait ~1 minute for provisioning.',
    },
    {
      step: 3,
      shape: 'starburst10',
      title: 'Copy URL & public key',
      description:
        'Open Project Settings → API and copy your Project URL (https://<id>.supabase.co) and your Publishable / Anon key (starts with sb_publishable_ or eyJ). Never paste a secret service_role key.',
      extra: (
        <a
          href="https://supabase.com/dashboard/project/_/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition shadow-2xs border border-[var(--border-subtle)]"
        >
          <span>Open API Settings</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
    {
      step: 4,
      shape: 'pebble',
      title: 'Run the SQL schema',
      description:
        'Open SQL Editor in your Supabase sidebar, click + New Query, copy and paste the EhsaanPlay migration script below, and click Run to create your tables and security policies.',
      extra: (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopySql}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              {isSqlCopied ? (
                <Check className="w-3.5 h-3.5 stroke-[2.8]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{isSqlCopied ? 'Copied SQL Script' : 'Copy SQL Script'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSqlPreviewOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold hover:opacity-85 active:scale-95 transition cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isSqlPreviewOpen ? 'Hide SQL' : 'View SQL'}</span>
            </button>
          </div>

          {isSqlPreviewOpen && (
            <pre className="p-3.5 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-[11px] max-h-48 overflow-y-auto no-scrollbar border border-[var(--border-subtle)] leading-relaxed">
              {EHSAAN_PLAY_SUPABASE_SQL_MIGRATION}
            </pre>
          )}
        </div>
      ),
    },
    {
      step: 5,
      shape: 'arch',
      title: 'Connect & verify schema',
      description:
        'Paste the Project URL and Publishable Key into the credentials form above and tap Connect Database. EhsaanPlay verifies endpoint reachability, schema tables, and Row Level Security automatically.',
      extra: onTestConnection ? (
        <button
          type="button"
          onClick={onTestConnection}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Verifying...' : 'Test Connection'}</span>
        </button>
      ) : undefined,
    },
    {
      step: 6,
      shape: 'blossom5',
      title: 'Create your cloud account',
      description:
        'Sign up or sign in inside Section 2 (Cloud Account & Identity). Every row in your Supabase database is scoped strictly to your signed-in account.',
    },
    {
      step: 7,
      shape: 'hexagon',
      title: 'Sync across all devices',
      description:
        'Open EhsaanPlay on another phone, tablet, or computer, enter the same Project URL and Publishable Key, and sign in with the same email and password to sync everything live.',
    },
  ];

  const howItWorksItems = [
    {
      icon: Cloud,
      title: 'One personal library',
      description:
        'Your connected devices share one private library. Watchlists, ratings, notes, custom lists, and episode progress stay unified wherever you open EhsaanPlay.',
    },
    {
      icon: RefreshCw,
      title: 'Instant realtime sync',
      description:
        'Mark a movie watched, adjust a rating, or add a title to a shelf on one screen and Supabase Realtime updates your other browsers automatically.',
    },
    {
      icon: HardDrive,
      title: 'Offline-safe change queue',
      description:
        'Offline or paused sync for a few days? Every change saves immediately in local storage and uploads automatically once connection or sync resumes.',
    },
    {
      icon: ShieldCheck,
      title: 'Private by architecture',
      description:
        'Row Level Security isolates every record to your authenticated account, while your Supabase keys stay exclusively in your local browser storage.',
    },
  ];

  const troubleshootingFaqs = [
    {
      question: 'My connection test says schema not installed',
      answer:
        'Open your Supabase project → SQL Editor → + New Query, copy the full SQL script from Step 4 above, paste it in, and press Run. Then tap Test Connection again.',
    },
    {
      question: 'My database shows paused or unreachable',
      answer:
        'Free-tier Supabase projects automatically pause after 7 days of inactivity. Tap Resume Database at the top of this page (or open your Supabase dashboard and click Restore project), wait 1–2 minutes, and EhsaanPlay will reconnect.',
    },
    {
      question: 'My Project URL or Publishable Key is rejected',
      answer:
        'Verify your URL uses the exact https://<project-id>.supabase.co base address and your key begins with sb_publishable_ or eyJ (anon public key). Never enter a service_role or database password here.',
    },
    {
      question: "My other device isn't showing my titles",
      answer:
        'Make sure both devices use the exact same Supabase Project URL, Publishable Key, and email/password account. If you added titles locally before signing in, run Local-to-Cloud Migration in Section 3 once.',
    },
    {
      question: 'Can anyone else see my watchlist or data?',
      answer:
        'No. Your data lives inside your own Supabase project protected by Postgres Row Level Security policies, and only your authenticated user account can read or write it.',
    },
  ];

  return (
    <div className="pt-4 space-y-7 animate-fade-in">
      {/* Video Walkthrough Card: Google Vids Guide */}
      <div className="rounded-[1.75rem] bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)]">
                Video Walkthrough
              </div>
              <h5 className="text-base sm:text-[17px] font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
                How to connect Supabase to EHSAAN PLAY
              </h5>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                Watch the quick video guide to set up your database, run the SQL schema, and sync your library.
              </p>
            </div>
          </div>

          <a
            href="https://docs.google.com/videos/d/19Pf4ygSsrRM0vZKS1dHJrNRzNFZZ9_7SERHWRFxTJ-I/play?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-extrabold hover:opacity-92 active:scale-95 transition shadow-2xs shrink-0"
          >
            <span>Open Video</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="hidden md:block relative w-full aspect-video rounded-2xl overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-subtle)] shadow-2xs">
          <iframe
            src="https://docs.google.com/videos/d/19Pf4ygSsrRM0vZKS1dHJrNRzNFZZ9_7SERHWRFxTJ-I/preview"
            title="Video Guide: Connect Supabase to EHSAAN PLAY"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Part 1: Expressive Numbered Step Cards */}
      <div className="space-y-3">
        {steps.map((item, idx) => {
          const tone = STEP_TONES[idx % STEP_TONES.length];
          return (
            <div
              key={item.step}
              className={`rounded-[1.75rem] p-4 sm:p-5 flex items-start gap-4 transition-colors ${tone.containerClass}`}
            >
              {/* Expressive Wavy / Organic Shape Number Badge */}
              <div
                aria-hidden="true"
                className="relative w-14 h-14 sm:w-15 sm:h-15 flex items-center justify-center shrink-0 mt-0.5 select-none"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <path
                    d={BADGE_PATHS[item.shape]}
                    fill={tone.badgeFillColor}
                  />
                </svg>
                <span
                  className="relative z-10 text-xl sm:text-2xl font-extrabold tabular-nums leading-none"
                  style={{ color: tone.badgeTextColor }}
                >
                  {item.step}
                </span>
              </div>

              {/* Step Title, Explanation & Optional Inline Control */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h5 className="text-base sm:text-[17px] font-extrabold tracking-tight leading-snug">
                  {item.title}
                </h5>
                <p className={`mt-1 text-xs sm:text-[13px] leading-relaxed ${tone.bodyTextClass}`}>
                  {item.description}
                </p>
                {item.extra && <div className="mt-3">{item.extra}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Part 2: "Then cloud sync just works" Explanation Cards (Matches Reference Image 2 & 3) */}
      <div className="space-y-3">
        <h5 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight px-0.5">
          Then cloud sync just works
        </h5>
        <div className="space-y-2.5">
          {howItWorksItems.map((entry) => {
            const Icon = entry.icon;
            return (
              <div
                key={entry.title}
                className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 flex items-start gap-3.5"
              >
                <Icon className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5 stroke-[2.1]" />
                <div className="min-w-0">
                  <h6 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    {entry.title}
                  </h6>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 3: "If something doesn't connect" Expandable FAQ Rows (Matches Reference Image 2 & 3) */}
      <div className="space-y-3">
        <h5 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight px-0.5">
          If something doesn&apos;t connect
        </h5>
        <div className="space-y-2">
          {troubleshootingFaqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={faq.question}
                className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-elevated)]/65 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]"
                >
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-[var(--border-subtle)]/70 text-xs text-[var(--text-secondary)] leading-relaxed animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
