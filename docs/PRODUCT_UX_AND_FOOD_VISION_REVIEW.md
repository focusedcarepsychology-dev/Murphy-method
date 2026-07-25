# Murphy Method product, UX and food-vision review

Date: 25 July 2026

This is a source-level product assessment of PR #19. It does not replace physical Android testing, user research or clinical review.

## 1. Progress assessment

### Architecture and data integrity: strong

The remediation has moved the product from a convincing prototype to a genuine owner-scoped application foundation.

The strongest outcomes are:

- fictional user data has been removed from authenticated routes;
- programmes and workouts are stored as real records;
- equipment selection is enforced server-side;
- programme generation is deterministic and server-authoritative;
- BodyScan images remain private;
- database ownership and grants are extensively tested;
- incomplete product areas no longer pretend to be personalised.

Source-level rating: 9 out of 10.

The remaining point is withheld because hosted staging has not yet been deployed and verified.

### Functional completeness: good, not release-complete

The main fitness loop now exists:

1. complete onboarding;
2. generate a programme;
3. view the next session;
4. start a full, quick or minimum workout;
5. log sets;
6. complete and resume workouts;
7. review real progress;
8. restructure the programme without deleting history.

Source-level rating: 8 out of 10.

The main gaps are device acceptance, offline-first workout persistence, live-camera BodyScan overlays and several future product areas that remain intentionally unavailable.

### Security and privacy: strong for the current scope

Positive features include private storage, short-lived signed URLs, owner-scoped repositories, row-level security, restricted grants, server-authoritative sensitive operations, consent-led BodyScan flows and permanent deletion.

Source-level rating: 8.5 out of 10.

The remaining work is hosted verification, retention-policy decisions, privacy-policy wording, analytics consent and operational monitoring after release.

### Automated quality: strong

The exact Stage 1 validation passed:

- 38 application suites and 197 tests;
- 19 database files and 513 pgTAP assertions;
- TypeScript, lint and formatting;
- Expo web export;
- source and bundle secret scanning;
- clean database migration reset.

Source-level rating: 9 out of 10.

The automation is unusually thorough for this stage, but it cannot validate Android camera behaviour, keyboard overlap, performance on low-memory phones or visual polish.

### UX and visual polish: competent foundation, still prototype-like in places

The design system already has several Apple-adjacent strengths:

- semantic light and dark themes;
- native system typography on iOS;
- restrained shadows;
- large titles;
- consistent spacing and rounded shapes;
- 44-point minimum touch targets;
- truthful loading, empty and error states;
- decorative exercise visuals hidden from screen readers.

Source-level rating: 6.5 out of 10.

The main issue is not poor styling. It is that too many screens still rely on similarly weighted cards and vertically stacked actions, so hierarchy can feel like a polished component library rather than a distinctive premium product.

### Overall release readiness

Current rating: 6 out of 10.

The codebase is ready for staging deployment and an APK test. It is not yet ready for a production launch because no hosted deployment or physical-device acceptance run has happened.

## 2. Apple-inspired design direction

The recommendation is to pursue an Apple-inspired sense of clarity, restraint and tactility without copying iOS or making Android feel like an imitation.

### A. Make content primary and cards secondary

Today currently gives many sections similar visual weight. The next workout should dominate the screen, while momentum, goals and limitations should sit beneath it as quieter grouped content.

Recommended hierarchy:

1. greeting and large title;
2. one prominent next-workout surface;
3. one clear primary action;
4. quick and minimum modes in a compact segmented control or action sheet;
5. secondary progress information in grouped rows rather than repeated large cards.

This will reduce scrolling and decision fatigue.

### B. Use a concentric corner system

The current card radius is 28 points and buttons are nearly always pills. That feels friendly but can become visually soft and generic.

Recommended radius system:

- small controls: 10 to 12;
- standard rows and compact cards: 14 to 16;
- hero surfaces and sheets: 20 to 24;
- pills only for tags, filters and one-line primary actions.

Nested surfaces should use visibly related radii so the interface feels constructed rather than decorated.

### C. Add materials only to navigation layers

Use blur or glass for tab bars, navigation bars and temporary sheets, not for ordinary content cards.

`expo-glass-effect` is already installed, but native Liquid Glass availability must be checked at runtime and it is not a universal Android treatment. Use a stable `BlurView` or an opaque elevated surface as the fallback.

Respect reduced-transparency settings and never allow glass to weaken contrast.

### D. Add restrained haptics

Useful haptic moments include:

- selecting goals or equipment;
- starting a workout;
- logging a set;
- completing a workout;
- confirming permanent deletion;
- warning that medical clearance is required.

Avoid haptics for ordinary scrolling, navigation or every button press.

### E. Improve motion and state continuity

Recommended motion:

- 180 to 250 millisecond transitions;
- small spring scale on card press;
- cross-fade or shared-position transition from exercise card to exercise detail;
- animated progress changes after a completed set;
- bottom sheets for mode selection and destructive confirmation;
- reduced-motion alternative.

Motion should explain what changed, not merely decorate the screen.

### F. Refine the colour system

The current blue-violet brand and pale background are credible. Keep the palette but reduce simultaneous use of border, shadow and strong corner radius.

Suggested direction:

- slightly warmer neutral backgrounds;
- fewer visible borders;
- brand colour reserved for action, selection and progress;
- muted blue or graphite navigation surfaces;
- positive colour for achievement without making incomplete states feel punitive.

Do not use red or green to moralise food choices or body progress.

### G. Improve individual product areas

#### Today

- one hero workout card;
- time, focus and exercise count visible immediately;
- mode selection condensed;
- momentum displayed as a slim progress row;
- limitations moved behind an information disclosure unless they block training.

#### Plan

- weekly calendar strip at the top;
- session rows grouped by day;
- swipe or menu actions for view, reschedule and explain;
- programme history presented as a version timeline.

#### Workout

- large exercise visual and target;
- one-thumb set logging;
- persistent next action near the bottom safe area;
- subtle successful-set haptic and animation;
- clear offline/network state.

#### Progress

- use charts only when enough real data exists;
- avoid invented trends;
- let the user choose week, month and programme version;
- keep BodyScan visually separate from performance metrics.

#### BodyScan

- full-screen viewer;
- draggable comparison slider rather than only fixed opacity buttons;
- consistent crop and zoom locking;
- privacy status visible near the image;
- optional local face blur before upload;
- later live alignment overlay through `expo-camera`.

#### Onboarding

- continue using one decision per screen;
- show why sensitive information is requested before asking;
- add a final review screen before programme generation;
- explain how each answer changes the programme.

## 3. Food camera and calorie estimation feasibility

### Recommendation

A food camera and gallery can provide useful rough calorie ranges, but a single photograph should not be presented as an exact measurement.

Reliability varies substantially:

- packaged food with a barcode and confirmed serving amount: relatively high;
- a simple single-item plate with visible scale: moderate;
- mixed meals, sauces, cooking oil, fillings and restaurant dishes: low to moderate;
- exact calories from one unstructured image: not reliable enough for a precise claim.

The feature should therefore return a range and confidence level, then require user confirmation.

### Safe estimation pipeline

1. Capture a new image or select one from the gallery.
2. Detect visible food components.
3. Ask the user to confirm, remove or add components.
4. Estimate portions using two angles, plate size or a known reference when possible.
5. Ask targeted questions about hidden variables such as oil, dressing, cheese, sauces and cooking method.
6. Match the confirmed foods to a nutrient database.
7. Calculate calories deterministically from estimated grams and database values.
8. Show a range, confidence and the assumptions used.
9. Let the user adjust portions before saving.

The AI should identify foods and estimate portions. It should not invent a final calorie number without a traceable nutrient-data match.

### Recommended data sources

For UK and Ireland users:

- use the UK Composition of Foods Integrated Dataset for common foods and recipes;
- use a branded-food source for packaged products;
- use USDA FoodData Central as a broad fallback;
- use barcode lookup for packaged foods wherever possible.

The database result should record its source and version.

### Recommended capture experience

#### Quick estimate

- one photo;
- visible warning that portion uncertainty is higher;
- estimated calorie range;
- user confirmation required.

#### Better estimate

- overhead photo;
- second photo at approximately 45 degrees;
- known plate diameter or a standard reference;
- cooking method and added-fat questions.

#### Packaged food

- scan barcode;
- confirm serving quantity;
- photograph nutrition label only when barcode data is missing or doubtful.

### Camera and gallery technology

The existing `expo-image-picker` can take a photo or open the system gallery.

For a guided multi-angle camera, plate outline, live framing and barcode scanning, use `expo-camera` in a later native-tested increment.

Food photos should follow the same privacy pattern as BodyScan:

- private storage;
- owner-scoped database records;
- short-lived signed URLs;
- server-side AI calls through a protected function;
- no model-provider API key in the app;
- clear retention and deletion controls.

### Suggested database model

- `food_logs`: owner, meal time, total range, confidence and confirmation state;
- `food_log_images`: private storage path, angle and capture metadata;
- `food_log_items`: food match, estimated grams, calorie range, source and user edits;
- `food_data_sources`: dataset name and version;
- `food_log_feedback`: optional correction data for future quality improvement.

### Eating-disorder and wellbeing safeguards

Calorie tracking should be optional rather than the default fitness experience.

Recommended safeguards:

- allow users to hide calories and focus on protein, fibre or meal regularity;
- avoid moral labels such as good, bad, clean or cheating;
- avoid aggressive deficit prompts;
- do not infer eating disorders from photographs;
- do not claim medical accuracy;
- provide a way to disable the feature completely;
- obtain specific consent before analysing or retaining food photos.

## 4. Recommended implementation order

### Priority 1: finish the current release path

1. deploy Supabase staging;
2. build the Android preview APK;
3. complete real-device acceptance testing;
4. correct device-only defects.

Do not expand scope before the current core loop has been tested on a real phone.

### Priority 2: premium UX pass

1. simplify Today hierarchy;
2. standardise concentric radii;
3. introduce restrained navigation blur or glass with fallbacks;
4. add haptics and motion tokens;
5. improve workout one-thumb ergonomics;
6. add BodyScan comparison slider;
7. run TalkBack, large-text and reduced-motion checks.

### Priority 3: nutrition foundation

1. manual food search and quantity entry;
2. barcode scanning for packaged food;
3. food diary and private gallery;
4. nutrient-data source tracking;
5. optional goals for protein, fibre and meal regularity.

### Priority 4: assisted photo estimation

1. one-photo food identification;
2. user-confirmed items;
3. calorie ranges and confidence;
4. two-angle guided capture;
5. portion reference and hidden-ingredient questions;
6. quality monitoring against weighed test meals.

## 5. Final product recommendation

The current branch should remain focused on becoming a reliable, honest fitness product. The Apple-inspired UX pass is highly worthwhile, but it should be implemented after the first staging APK reveals real device behaviour.

The food feature is also worthwhile, but it should launch first as an assisted food log with barcode and user confirmation. Photo-only calorie estimation should be positioned as a rough convenience feature with ranges, not as a precise nutritional measurement.
