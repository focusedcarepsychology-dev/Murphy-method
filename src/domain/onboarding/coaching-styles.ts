import type { CoachingStyle } from '@/domain/onboarding/types';

/**
 * Coaching Style option copy (`MASTER_SPEC.md` §20.1,
 * `DATABASE_SCHEMA.md` §1 `profiles.coaching_style` enum). No style is
 * pre-selected — the user makes an explicit choice
 * (`IMPLEMENTATION_PLAN.md` Phase 3 §19), never an inferred default.
 */
export const COACHING_STYLE_OPTIONS: { key: CoachingStyle; label: string; description: string }[] =
  [
    {
      key: 'supportive',
      label: 'Supportive',
      description: 'Encouraging check-ins that celebrate progress and keep pressure low.',
    },
    {
      key: 'direct',
      label: 'Direct',
      description: 'Short, clear guidance — what to do next, without extra framing.',
    },
    {
      key: 'analytical',
      label: 'Analytical',
      description: 'Data-forward updates that explain the reasoning behind each change.',
    },
    {
      key: 'competitive',
      label: 'Competitive',
      description: 'Framed around personal bests and beating your own numbers.',
    },
    {
      key: 'calm_minimal',
      label: 'Calm / Minimal',
      description: 'Just the essentials — minimal messaging, no extra prompts.',
    },
  ];
