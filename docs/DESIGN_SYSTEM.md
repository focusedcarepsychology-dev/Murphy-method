# Design System

Status: authoritative direction for this phase; token _values_ may be
refined during actual design work (any material change must be logged in
[`DECISIONS.md`](DECISIONS.md) per `MASTER_SPEC.md` §33). Implements
`MASTER_SPEC.md` §33 (Visual Design) and §34 (Typography Direction) plus
§32 (Accessibility).

## 1. Design intent

Premium, intelligent, calm, modern, scientific, motivating, human.
Explicitly **not**: stereotypical macho/bodybuilding aesthetics — no
excessive black/red aggression, flames, skulls, or visual clutter. Generous
spacing, strong hierarchy, restrained animation, rounded surfaces, large
workout controls, accessible contrast, full light/dark mode and
reduced-motion support.

## 2. Relationship to the existing codebase

`src/constants/theme.ts` currently exports a minimal `Colors` / `Fonts` /
`Spacing` object (template-provided grayscale palette, not the product
palette). This document specifies the **target semantic token set**;
implementing it is Phase 1 work (`IMPLEMENTATION_PLAN.md`), not this
documentation phase. When implemented, raw hex values must never be
scattered through UI code — components consume semantic tokens
(`color.background.default`, not `#F7F9FC`) so theme switching and future
refinement are centralised.

## 3. Colour tokens

### 3.1 Base palette (light)

| Token                      | Value     | Usage                                            |
| -------------------------- | --------- | ------------------------------------------------ |
| `color.background.default` | `#F7F9FC` | screen background                                |
| `color.surface.default`    | `#FFFFFF` | cards, sheets, inputs                            |
| `color.text.primary`       | `#101828` | primary text                                     |
| `color.brand.primary`      | `#4F6EF7` | primary CTA, active/selected state, links        |
| `color.status.positive`    | `#22C7A9` | progress, success, energy                        |
| `color.status.warning`     | `#F59E0B` | caution, non-blocking issues                     |
| `color.status.critical`    | `#E5484D` | pain flags, destructive actions, blocking errors |

### 3.2 Derived/semantic tokens (both themes)

Each base token above is the seed for a small semantic scale, defined at
implementation time following standard practice (e.g. `color.text.secondary`
at reduced contrast from `color.text.primary`; `color.surface.raised` for
elevated cards; `color.border.default`; `color.brand.primaryPressed` for
interaction states). This document fixes the _seed_ values and the
requirement that everything else derive from them systematically, not the
full generated scale (design-tool/implementation detail).

### 3.3 Dark theme

Dark-theme values are not fixed numerically in this phase — they are
derived from the same semantic token names with dark-appropriate values
(e.g. `color.background.default` becomes a near-black, not pure `#000000`,
to avoid OLED smearing and to keep the "calm, premium" intent rather than
harsh true-black). Both themes must meet WCAG AA contrast for body text
against their respective backgrounds (§8).

### 3.4 Non-colour meaning

Per accessibility requirements (§8), colour is never the sole carrier of
meaning: status (safety flags, pain, PR celebrations, momentum states) pairs
colour with an icon and/or label.

## 4. Typography

Approximate scale from `MASTER_SPEC.md` §34, implemented with
responsive/accessibility-aware scaling (respecting the OS text-size
setting) rather than fixed pixel values hardcoded per screen:

| Role         | Size (pt, baseline) |
| ------------ | ------------------- |
| Hero         | 32–36               |
| Screen title | 26–30               |
| Section      | 20–22               |
| Body         | 16                  |
| Supporting   | 14                  |

Font family follows the existing `Fonts` platform-select pattern in
`src/constants/theme.ts` (system font per platform) — the product does not
require a custom typeface for MVP; revisit as a `DECISIONS.md` entry if
brand work later calls for one.

## 5. Spacing, radius, elevation

- **Spacing:** extend the existing `Spacing` scale in `src/constants/theme.ts`
  (`half`/`one`/`two`/`three`/`four`/`five`/`six` = 2/4/8/16/24/32/64) as the
  single spacing source — components use these tokens, not ad-hoc magic
  numbers.
- **Radius:** rounded surfaces per `MASTER_SPEC.md` §33 — a small token set
  (e.g. `radius.sm`/`radius.md`/`radius.lg`) favouring visibly rounded
  cards/buttons over sharp corners, consistent with the "calm, human" intent
  and explicitly away from an aggressive/angular gym aesthetic.
- **Elevation:** restrained — subtle shadow/border-based elevation for
  raised surfaces (cards, sheets, the active-set control), not heavy
  drop-shadows. Dark theme favours a lighter surface tone over a heavy
  shadow to indicate elevation, per standard dark-mode practice.

## 6. Motion

Restrained by default (`MASTER_SPEC.md` §33): transitions communicate state
change (screen push, set completion, PR celebration) without decorative
animation. Every animation has a **reduced-motion equivalent** — a
functionally identical but non-animated (or cross-fade-only) transition —
driven by the OS reduced-motion setting, not a separate in-app toggle only
(an in-app override may additionally be offered in Profile, but must
respect the OS setting by default).

## 7. Core components (contract, not visual spec)

Each of these exists as a shared component in `src/components/ui/`
(`ARCHITECTURE.md` §10), themed via tokens, consumed by
[`SCREEN_SPECIFICATIONS.md`](SCREEN_SPECIFICATIONS.md):

- **Buttons:** primary (brand-filled), secondary (outlined/tonal), and
  destructive (critical-toned, used for e.g. "Stop Workout", "Delete
  Account") variants, plus a large touch-target variant specifically for
  in-workout controls (§7.1).
- **Cards:** the Today card, Coach Insight card, Progress summary cards —
  consistent surface/radius/elevation treatment.
- **Forms:** text input, numeric stepper (weight/reps — large touch targets,
  §7.1), select/segmented control (e.g. effort 0/1/2/3+, enjoyment 1–5),
  toggle.
- **Navigation:** the five-tab bar, stack headers, modal sheet chrome —
  consistent with `ROUTES.md`'s navigation structure.
- **Workout UI:** the exercise-screen layout (`MASTER_SPEC.md` §13's
  content model), the rest timer, the set logger, the PR celebration
  moment.
- **Charts / progress:** strength trend, measurement trend, BodyScan
  comparison slider/toggle, Adaptive Work Pathway progress indicator —
  all must render a clear empty state before enough data exists (no chart
  library default "empty axes with no explanation").

### 7.1 Workout-mode specific rules

Because workout mode is used mid-set, often one-handed, sometimes fatigued:
controls are large (minimum touch target well above the general baseline),
high-contrast, and require no more than one tap/one drag per common action
(log a set, adjust weight, adjust reps, start rest). This is a stricter bar
than the general accessibility minimum in §8 and applies regardless of
whether accessibility settings are enabled.

## 8. Accessibility

- Screen-reader labels on every interactive element and on non-decorative
  images (including chart data points — not just alt-text on the chart
  container).
- Type scales with the OS text-size setting (§4); layouts must not clip or
  truncate at larger accessibility text sizes on P0 screens.
- Contrast: WCAG AA minimum for text and meaningful icons in both themes.
- Large touch targets throughout, and especially in workout mode (§7.1).
- Colour is never the sole signal (§3.4).
- Reduced motion respected everywhere (§6).
- Captions/transcripts for any instructional video content (exercise
  media) where feasible.

## 9. Light/dark mode implementation

Theme resolution follows the existing `useColorScheme`/`useTheme` hook
pattern already present in `src/hooks/`, extended to read the new semantic
token set rather than the current placeholder `Colors` object. System
theme is the default; a manual override may be exposed in Profile → Units/
appearance settings (exact placement: `SCREEN_SPECIFICATIONS.md`).
