-- Phase 4 (docs/IMPLEMENTATION_PLAN.md): minimum real exercise ontology v1.
--
-- Extends (does not duplicate) the exercise ontology tables created in
-- 20260723090500_exercise_ontology.sql, which were deliberately left
-- unseeded as Phase 4 content-authoring scope. This migration is that
-- content authoring: a small, high-quality v1 catalogue sufficient to
-- generate genuine deterministic beginner/intermediate programmes across
-- bodyweight and common home/gym equipment, per the real-device
-- remediation brief (equipment semantics must be exact — a no-equipment
-- user must never be assigned a dumbbell/barbell/cable/machine exercise).
--
-- Column additions below are additive-only (new nullable/defaulted
-- columns on existing empty tables — confirmed no `exercises` or
-- `exercise_substitutions` rows exist yet) so no existing data or reader
-- is broken.

alter table public.exercises
  add column starting_position text,
  add column instructions text[] not null default '{}',
  add column coaching_cues text[] not null default '{}',
  add column common_mistakes text[] not null default '{}',
  add column safety_note text;

comment on column public.exercises.starting_position is
  'Plain-English starting position for Exercise Detail (real-device remediation Part 7).';
comment on column public.exercises.instructions is
  'Numbered plain-English execution steps for Exercise Detail.';
comment on column public.exercises.coaching_cues is
  '3-5 short coaching cues shown in Exercise Detail.';
comment on column public.exercises.common_mistakes is
  'Common technique mistakes shown in Exercise Detail.';
comment on column public.exercises.safety_note is
  'Optional short safety note, populated only where genuinely relevant — never a substitute '
  'for the real safety-screening restriction system (exercise_restrictions).';
comment on column public.exercises.media_url is
  'v1 note: no licensed video/image pipeline exists yet '
  '(docs/IMPLEMENTATION_PLAN.md Phase 4 non-goals), so this stores an internal, '
  'originally-authored visual-pose identifier (e.g. "squat", "pushup") that the client '
  'maps to a local original vector illustration (src/components/ui/exercise-visual.tsx) '
  '— never a URL to third-party/licensed imagery.';

alter table public.exercise_substitutions
  add column relation_type text not null default 'alternative'
    check (relation_type in ('progression', 'regression', 'alternative'));

comment on column public.exercise_substitutions.relation_type is
  'Direction of this edge relative to exercise_id: "progression" means substitute_exercise_id '
  'is a harder variant, "regression" means it is an easier variant, "alternative" means a '
  'lateral swap (e.g. an equipment-driven substitute).';

-- ---------------------------------------------------------------------
-- Muscles (reference). Matches the 13 canonical body-area keys
-- (docs/DECISIONS.md "Interactive Body Goal Map") one-for-one, plus two
-- extra granularity rows (obliques, lower_back) used for exercise tagging
-- and body_area_muscle_map weighting, per docs/DATABASE_SCHEMA.md §2's
-- deferred-to-Phase-4 note on body_area_muscle_map.
-- ---------------------------------------------------------------------
insert into public.muscles (key, label, muscle_group) values
  ('shoulders', 'Shoulders', 'shoulders'),
  ('chest', 'Chest', 'chest'),
  ('biceps', 'Biceps', 'arms'),
  ('triceps', 'Triceps', 'arms'),
  ('forearms', 'Forearms', 'arms'),
  ('upper_back', 'Upper back', 'back'),
  ('lats', 'Lats', 'back'),
  ('lower_back', 'Lower back', 'back'),
  ('core', 'Core', 'core'),
  ('obliques', 'Obliques', 'core'),
  ('glutes', 'Glutes', 'legs'),
  ('quadriceps', 'Quadriceps', 'legs'),
  ('hamstrings', 'Hamstrings', 'legs'),
  ('calves', 'Calves', 'legs');

insert into public.body_area_muscle_map (body_area_key, muscle_id, weight)
select v.body_area_key, m.id, v.weight
from (values
  ('shoulders', 'shoulders', 1.0),
  ('chest', 'chest', 1.0),
  ('biceps', 'biceps', 1.0),
  ('triceps', 'triceps', 1.0),
  ('forearms', 'forearms', 1.0),
  ('upper_back', 'upper_back', 1.0),
  ('lats', 'lats', 1.0),
  ('core', 'core', 1.0),
  ('core', 'obliques', 0.5),
  ('waist_appearance', 'obliques', 1.0),
  ('waist_appearance', 'core', 0.6),
  ('glutes', 'glutes', 1.0),
  ('quadriceps', 'quadriceps', 1.0),
  ('hamstrings', 'hamstrings', 1.0),
  ('calves', 'calves', 1.0)
) as v(body_area_key, muscle_key, weight)
join public.muscles m on m.key = v.muscle_key;

-- ---------------------------------------------------------------------
-- Exercises (v1 catalogue, 35 rows). Every row is immediately eligible
-- for selection (active = true, review_status = 'published') — a v1
-- content-review sign-off is the seed data itself, since this is the
-- first real content, not a staged draft/review workflow.
--
-- `slug` is the stable id the Programme Engine and app reference by.
-- `media_url` stores the internal visual-pose key (see comment above).
-- No 'advanced'-difficulty rows are seeded in v1 (documented limitation,
-- docs/DEFERRED.md) — every seeded exercise is usable as a primary
-- selection for at least one training_experience tier.
-- ---------------------------------------------------------------------
insert into public.exercises (
  name, slug, description, movement_pattern_id, skill_requirement, difficulty,
  stability_requirement, loading_potential, fatigue_profile,
  recommended_rep_range_low, recommended_rep_range_high, setup_time_seconds,
  media_url, dataset_version, source, review_status, reviewed_at,
  contraindication_metadata_version, locale_ready, active,
  starting_position, instructions, coaching_cues, common_mistakes, safety_note
)
select
  v.name, v.slug, v.description, mp.id, v.skill_requirement, v.difficulty,
  v.stability_requirement, v.loading_potential, v.fatigue_profile,
  v.rep_low, v.rep_high, v.setup_seconds,
  v.pose, '1', 'internal_authoring', 'published', now(),
  '1', true, true,
  v.starting_position, v.instructions, v.cues, v.mistakes, v.safety_note
from (values
  -- Bodyweight-compatible exercises (no exercise_equipment rows -> eligible
  -- for a no-equipment user by construction, docs/PROGRAMME_ENGINE.md §3.1).
  ('Bodyweight Squat', 'bodyweight-squat',
   'A squat using only your own bodyweight — trains your quads, glutes and hamstrings without equipment.',
   'squat', 'low', 'beginner', 'low', 'low', 'low', 10, 15, 10, 'squat',
   'Standing, feet shoulder-width apart, toes slightly turned out.',
   array['Push your hips back and bend your knees to lower down, keeping your chest up.',
         'Go as low as you comfortably can while keeping your heels on the floor.',
         'Push through your whole foot to stand back up.'],
   array['Keep your weight spread through your whole foot, not just your toes.',
         'Keep your knees tracking over your toes, not caving inward.',
         'Keep your chest lifted throughout.'],
   array['Letting the heels lift off the floor.', 'Knees collapsing inward on the way up.'],
   null),

  ('Reverse Lunge', 'reverse-lunge',
   'A single-leg lunge stepping backward — trains your quads and glutes and challenges balance, without equipment.',
   'lunge_single_leg', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 12, 10, 'lunge',
   'Standing tall with feet hip-width apart.',
   array['Step one foot backward and lower your back knee toward the floor.',
         'Keep your front shin close to vertical.',
         'Push through your front foot to return to standing.'],
   array['Keep most of your weight on the front leg.', 'Keep your torso upright.',
         'Control the descent rather than dropping into it.'],
   array['Letting the front knee travel far past the toes.', 'Losing balance by rushing the step back.'],
   null),

  ('Glute Bridge', 'glute-bridge',
   'A lying hip-raise exercise that trains your glutes and hamstrings without equipment.',
   'hip_extension', 'low', 'beginner', 'low', 'low', 'low', 10, 15, 5, 'bridge',
   'Lying on your back, knees bent, feet flat on the floor near your hips.',
   array['Squeeze your glutes and lift your hips until your body is in a straight line from knees to shoulders.',
         'Hold briefly at the top.',
         'Lower back down with control.'],
   array['Drive through your heels.', 'Squeeze your glutes hard at the top.',
         'Avoid overarching your lower back.'],
   array['Using the lower back to lift instead of the glutes.', 'Not lifting the hips fully.'],
   null),

  ('Bodyweight Good Morning', 'bodyweight-good-morning',
   'A hip-hinge drill that trains your hamstrings and glutes and teaches the hinge pattern without equipment.',
   'hip_hinge', 'moderate', 'beginner', 'moderate', 'low', 'low', 10, 15, 10, 'hinge',
   'Standing tall, hands lightly behind your head or crossed on your chest.',
   array['Push your hips backward while keeping a soft bend in your knees.',
         'Lower your torso until you feel a stretch in your hamstrings, keeping your back flat.',
         'Drive your hips forward to return to standing.'],
   array['Keep the movement at the hips, not the lower back.', 'Keep your shins close to vertical.',
         'Keep your back flat throughout.'],
   array['Rounding the lower back.', 'Bending the knees too much and turning it into a squat.'],
   null),

  ('Incline Push-Up', 'incline-pushup',
   'A push-up with your hands elevated on a sturdy surface — an easier regression that trains chest, shoulders and triceps without equipment.',
   'horizontal_push', 'low', 'beginner', 'low', 'low', 'low', 8, 12, 10, 'incline-pushup',
   'Hands on a sturdy elevated surface (a step or sturdy low table), body in a straight line.',
   array['Lower your chest toward the surface, keeping your body straight.',
         'Keep your elbows at roughly a 45-degree angle from your body.',
         'Push back up to the starting position.'],
   array['Keep a straight line from head to heels.', 'Control the lowering phase.',
         'Breathe out as you push up.'],
   array['Letting the hips sag or pike up.', 'Flaring the elbows straight out to the sides.'],
   null),

  ('Push-Up', 'pushup',
   'A floor push-up that trains your chest, shoulders and triceps without equipment.',
   'horizontal_push', 'moderate', 'intermediate', 'moderate', 'low', 'low', 6, 12, 5, 'pushup',
   'Hands on the floor under shoulders, body in a straight line, on toes.',
   array['Lower your chest toward the floor, keeping your body straight.',
         'Keep your elbows at roughly a 45-degree angle from your body.',
         'Push back up to the starting position.'],
   array['Keep a straight line from head to heels.', 'Keep your core braced.',
         'Full range: chest close to the floor at the bottom.'],
   array['Letting the hips sag or pike up.', 'Only performing a partial range of motion.'],
   null),

  ('Pike Push-Up', 'pike-pushup',
   'A push-up in a hips-high pike position that trains your shoulders and triceps without equipment.',
   'vertical_push', 'moderate', 'intermediate', 'moderate', 'low', 'moderate', 6, 10, 10, 'pike-pushup',
   'Hips high, hands and feet on the floor, forming an inverted V shape.',
   array['Bend your elbows to lower the top of your head toward the floor.',
         'Keep your hips high throughout.',
         'Push back up to the starting position.'],
   array['Keep your hips lifted, not sagging toward a push-up position.', 'Look slightly forward, not straight down.',
         'Move within a comfortable, controlled range.'],
   array['Letting the hips drop, turning it into a regular push-up.', 'Rushing the descent.'],
   'Skip this if you have any current wrist, shoulder or neck discomfort.'),

  ('Plank', 'plank',
   'A static hold that trains your core to resist your lower back from sagging, without equipment.',
   'core_anti_extension', 'low', 'beginner', 'moderate', 'low', 'low', 20, 45, 5, 'plank',
   'Forearms and toes on the floor, body in a straight line.',
   array['Brace your core as if about to be tapped in the stomach.',
         'Keep a straight line from head to heels.',
         'Hold for the target time, breathing steadily.'],
   array['Squeeze your glutes gently to support your lower back.', 'Keep your neck neutral, not craned up.',
         'Breathe — do not hold your breath.'],
   array['Letting the hips sag toward the floor.', 'Piking the hips too high.'],
   null),

  ('Dead Bug', 'dead-bug',
   'A slow, controlled core exercise that trains your core to resist your lower back arching, without equipment.',
   'core_anti_extension', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 12, 5, 'deadbug',
   'Lying on your back, arms reaching toward the ceiling, knees bent 90 degrees above your hips.',
   array['Press your lower back gently into the floor.',
         'Slowly lower one arm and the opposite leg toward the floor without your back arching.',
         'Return to the start and repeat on the other side.'],
   array['Keep your lower back pressed to the floor the whole time.', 'Move slowly and with control.',
         'Only lower as far as you can control.'],
   array['Letting the lower back arch off the floor.', 'Moving too fast to control the position.'],
   null),

  ('Bird Dog', 'bird-dog',
   'A slow, controlled core and balance exercise on hands and knees, without equipment.',
   'core_anti_rotation', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 12, 5, 'birddog',
   'On hands and knees, hands under shoulders, knees under hips.',
   array['Extend one arm forward and the opposite leg backward at the same time.',
         'Keep your hips and shoulders level, without rotating.',
         'Return to the start and repeat on the other side.'],
   array['Keep your hips square to the floor — resist rotating.', 'Move slowly.',
         'Keep your neck neutral, looking at the floor.'],
   array['Letting the hips twist open as the leg extends.', 'Arching the lower back.'],
   null),

  ('Side Plank', 'side-plank',
   'A static side hold that trains the muscles that resist your torso bending sideways, without equipment.',
   'core_anti_rotation', 'moderate', 'intermediate', 'moderate', 'low', 'low', 15, 30, 5, 'side-plank',
   'Lying on your side, propped on one forearm, body in a straight line, feet stacked.',
   array['Lift your hips so your body forms a straight line from head to feet.',
         'Hold for the target time, breathing steadily.',
         'Lower with control and repeat on the other side.'],
   array['Stack your shoulders, hips and ankles in one line.', 'Keep your hips lifted, not sagging.',
         'Breathe steadily throughout.'],
   array['Letting the hips sag toward the floor.', 'Rotating the torso forward or backward.'],
   null),

  ('Side-Lying Leg Raise', 'side-lying-hip-abduction',
   'A lying leg-raise exercise that trains the outer hip and glute muscles, without equipment.',
   'hip_abduction', 'low', 'beginner', 'low', 'low', 'low', 12, 20, 5, 'hip-abduction',
   'Lying on your side, legs stacked and straight, head resting on your lower arm.',
   array['Keeping your leg straight, lift your top leg toward the ceiling.',
         'Lower it back down with control.',
         'Complete all reps, then switch sides.'],
   array['Keep the lifted leg in line with your body, not swinging forward.', 'Move slowly and with control.',
         'Keep your hips stacked, not rolling backward.'],
   array['Letting the hip roll backward as the leg lifts.', 'Using momentum instead of a controlled lift.'],
   null),

  ('Bodyweight Calf Raise', 'calf-raise',
   'A standing heel raise that trains your calves without equipment.',
   'calf', 'low', 'beginner', 'low', 'low', 'low', 12, 20, 5, 'calf-raise',
   'Standing tall, feet hip-width apart.',
   array['Rise up onto the balls of your feet as high as you can.',
         'Hold briefly at the top.',
         'Lower back down with control.'],
   array['Get a full stretch at the bottom.', 'Rise as high as you can at the top.',
         'Control the lowering phase rather than dropping.'],
   array['Bouncing at the bottom instead of controlling the movement.', 'Only using a small range of motion.'],
   null),

  ('Reverse Snow Angel', 'reverse-snow-angel',
   'A prone arm-raise exercise that trains your upper-back and shoulder muscles without equipment. '
   'It is not a substitute for a loaded row — it is an honest, genuine way to train pulling-adjacent '
   'muscles when no pulling equipment is available.',
   'horizontal_pull', 'low', 'beginner', 'low', 'low', 'low', 10, 15, 5, 'reverse-snow-angel',
   'Lying face down, arms by your sides, forehead resting on the floor.',
   array['Lift your chest slightly and raise your arms out and up, like making a snow angel in reverse.',
         'Squeeze your shoulder blades together at the top.',
         'Lower back down with control.'],
   array['Squeeze your shoulder blades together, not just lifting your arms.', 'Keep the lift small and controlled.',
         'Keep your neck neutral, not craned up.'],
   array['Using momentum to fling the arms up.', 'Overarching the lower back to lift higher.'],
   null),

  ('Superman', 'superman',
   'A prone back-and-glute exercise that trains your lower back, glutes and hamstrings without equipment.',
   'hip_extension', 'low', 'beginner', 'low', 'low', 'low', 10, 15, 5, 'superman',
   'Lying face down, arms extended in front of you.',
   array['Lift your arms, chest and legs off the floor at the same time.',
         'Hold briefly at the top.',
         'Lower back down with control.'],
   array['Lift to a comfortable range — this is not about height.', 'Keep your neck neutral.',
         'Move slowly and with control.'],
   array['Jerking upward instead of a controlled lift.', 'Craning the neck to look up.'],
   null),

  ('Step-Up', 'step-up',
   'A single-leg step exercise using a sturdy step or stair — trains your quads and glutes without equipment.',
   'lunge_single_leg', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 12, 10, 'step-up',
   'Standing in front of a sturdy step or low sturdy platform.',
   array['Place one foot fully on the step and push through it to stand up on top.',
         'Bring the trailing leg up to standing without pushing off the floor.',
         'Step back down with control and repeat, alternating legs.'],
   array['Push through the whole foot on the step, not the trailing leg.', 'Control the step back down.',
         'Choose a step height you can control with good form.'],
   array['Pushing off the bottom leg to help lift.', 'Using a step so high that form breaks down.'],
   null),

  ('High Knees', 'high-knees',
   'A fast marching drill that raises your heart rate and trains coordination, without equipment.',
   'conditioning', 'low', 'beginner', 'low', 'low', 'moderate', 20, 40, 5, 'high-knees',
   'Standing tall, feet hip-width apart.',
   array['Drive your knees up toward hip height, alternating legs quickly.',
         'Pump your arms in rhythm with your legs.',
         'Keep a quick, controlled pace for the target time.'],
   array['Land lightly on the balls of your feet.', 'Keep your chest tall.',
         'Keep a pace you can sustain with good form.'],
   array['Leaning too far backward.', 'Slowing down so much it stops being a conditioning effort.'],
   null),

  ('Burpee', 'burpee',
   'A full-body floor-to-jump conditioning exercise, without equipment.',
   'conditioning', 'high', 'intermediate', 'high', 'low', 'high', 6, 12, 10, 'burpee',
   'Standing tall, feet shoulder-width apart.',
   array['Squat down and place your hands on the floor.',
         'Step or jump your feet back into a plank, then straight back in.',
         'Stand up and finish with a small jump.'],
   array['Keep your core braced through the plank position.', 'Land softly on the jump.',
         'Move at a pace you can sustain with good form.'],
   array['Letting the lower back sag in the plank position.', 'Landing stiff-legged on the jump.'],
   'A high-impact, high-intensity exercise — not recommended if you have joint, bone or cardiac restrictions.'),

  -- Equipment-required exercises (each declares its genuine required
  -- equipment via exercise_equipment below — never treated as
  -- bodyweight-eligible).
  ('Dumbbell Goblet Squat', 'goblet-squat',
   'A squat holding a dumbbell at chest height — trains your quads and glutes with added load.',
   'squat', 'low', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 15, 'squat',
   'Standing, holding one dumbbell vertically against your chest with both hands.',
   array['Push your hips back and bend your knees to squat down, keeping your chest up.',
         'Keep the dumbbell close to your chest throughout.',
         'Push through your whole foot to stand back up.'],
   array['Keep your elbows pointing down, close to your body.', 'Keep your chest lifted.',
         'Keep your knees tracking over your toes.'],
   array['Letting the dumbbell drift away from the chest.', 'Rounding the upper back.'],
   null),

  ('Barbell Back Squat', 'barbell-back-squat',
   'A barbell squat carried across your upper back — a foundational strength exercise for your quads, glutes and hamstrings.',
   'squat', 'high', 'intermediate', 'high', 'high', 'high', 5, 10, 45, 'squat',
   'Barbell racked across your upper back, feet shoulder-width apart.',
   array['Push your hips back and bend your knees to squat down, keeping your chest up.',
         'Descend to a depth you can control with good form.',
         'Push through your whole foot to stand back up.'],
   array['Keep your core braced throughout.', 'Keep your chest lifted and back flat.',
         'Keep your knees tracking over your toes.'],
   array['Letting the knees cave inward.', 'Rounding the lower back at the bottom.'],
   'Use a squat rack with safety bars and appropriate load for your experience level.'),

  ('Dumbbell Romanian Deadlift', 'dumbbell-rdl',
   'A hip-hinge exercise holding dumbbells — trains your hamstrings and glutes with added load.',
   'hip_hinge', 'moderate', 'beginner', 'moderate', 'moderate', 'moderate', 8, 12, 15, 'hinge',
   'Standing, holding a dumbbell in each hand in front of your thighs.',
   array['Push your hips backward while keeping a soft bend in your knees.',
         'Lower the dumbbells along your legs until you feel a stretch in your hamstrings.',
         'Drive your hips forward to return to standing.'],
   array['Keep the dumbbells close to your legs.', 'Keep the movement at the hips, not the lower back.',
         'Keep your back flat throughout.'],
   array['Rounding the lower back.', 'Bending the knees too much and turning it into a squat.'],
   null),

  ('Barbell Deadlift', 'barbell-deadlift',
   'A barbell hip-hinge lift from the floor — a foundational strength exercise for your hamstrings, glutes and back.',
   'hip_hinge', 'high', 'intermediate', 'high', 'high', 'high', 4, 8, 45, 'hinge',
   'Barbell over midfoot, feet hip-width apart, gripping the bar just outside your legs.',
   array['Set your back flat, chest up, and grip the bar firmly.',
         'Push the floor away with your legs while keeping the bar close to your body.',
         'Stand tall, then return the bar to the floor with control.'],
   array['Keep the bar close to your shins and legs throughout.', 'Keep your back flat, never rounding.',
         'Push through the whole foot, not just the toes.'],
   array['Rounding the lower back.', 'Letting the bar drift away from the body.'],
   'Use a load appropriate for your experience level and prioritise a flat back over lifting more weight.'),

  ('Flat Barbell Bench Press', 'flat-barbell-bench-press',
   'A barbell pressing exercise lying on a bench — a foundational strength exercise for chest, shoulders and triceps.',
   'horizontal_push', 'high', 'intermediate', 'moderate', 'high', 'high', 6, 10, 45, 'bench-press',
   'Lying on a flat bench, feet flat on the floor, bar racked above your chest.',
   array['Unrack the bar and lower it under control to your mid-chest.',
         'Keep your shoulder blades pulled together and down.',
         'Press the bar back up to full arm extension.'],
   array['Keep your feet planted and your upper back tight against the bench.', 'Control the bar on the way down.',
         'Keep your wrists stacked over your elbows.'],
   array['Bouncing the bar off the chest.', 'Flaring the elbows straight out to the sides.'],
   'Use a spotter or safety arms when lifting near your maximum.'),

  ('Dumbbell Bench Press', 'dumbbell-bench-press',
   'A dumbbell pressing exercise lying on a bench — trains chest, shoulders and triceps with a greater range of motion than a barbell.',
   'horizontal_push', 'moderate', 'beginner', 'moderate', 'moderate', 'moderate', 8, 12, 30, 'bench-press',
   'Lying on a flat bench, a dumbbell in each hand at chest level.',
   array['Press both dumbbells up until your arms are extended.',
         'Lower them back down under control to chest level.',
         'Keep your shoulder blades pulled together and down throughout.'],
   array['Keep your wrists stacked over your elbows.', 'Control the descent rather than dropping the weight.',
         'Keep your feet planted on the floor.'],
   array['Letting the dumbbells drift too far out to the sides.', 'Arching the lower back excessively.'],
   null),

  ('Dumbbell Shoulder Press', 'dumbbell-shoulder-press',
   'A standing or seated overhead press with dumbbells — trains your shoulders and triceps.',
   'vertical_push', 'moderate', 'beginner', 'moderate', 'moderate', 'moderate', 8, 12, 20, 'overhead-press',
   'Standing or seated, holding a dumbbell in each hand at shoulder height.',
   array['Press both dumbbells straight overhead until your arms are extended.',
         'Lower them back down under control to shoulder height.',
         'Keep your core braced throughout.'],
   array['Avoid overarching your lower back.', 'Keep the dumbbells travelling in a straight line overhead.',
         'Exhale as you press up.'],
   array['Excessively arching the back to press the weight up.', 'Only pressing partway up.'],
   null),

  ('Seated Cable Row', 'seated-cable-row',
   'A seated pulling exercise on a cable machine — trains your upper back and biceps with continuous tension.',
   'horizontal_pull', 'moderate', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 30, 'row',
   'Seated at the cable row station, feet braced, handle held with arms extended.',
   array['Pull the handle toward your torso, leading with your elbows.',
         'Squeeze your shoulder blades together at the end of the pull.',
         'Extend your arms back out under control.'],
   array['Keep your torso upright rather than rocking to help the pull.', 'Lead with the elbows, not the hands.',
         'Control the return rather than letting the weight stack slam.'],
   array['Using body momentum to heave the weight.', 'Rounding the lower back.'],
   null),

  ('Resistance Band Row', 'resistance-band-row',
   'A seated or standing pulling exercise using a resistance band — trains your upper back and biceps.',
   'horizontal_pull', 'low', 'beginner', 'low', 'low', 'low', 10, 15, 15, 'row',
   'Seated or standing, band anchored in front of you at chest height, one end in each hand.',
   array['Pull both handles toward your torso, leading with your elbows.',
         'Squeeze your shoulder blades together at the end of the pull.',
         'Extend your arms back out under control.'],
   array['Keep your torso upright rather than leaning back to help the pull.', 'Lead with the elbows, not the hands.',
         'Control the return — do not let the band snap back.'],
   array['Leaning back excessively to create momentum.', 'Rounding the shoulders forward.'],
   null),

  ('Lat Pulldown', 'lat-pulldown',
   'A seated pulling exercise on a machine — trains your lats and biceps with a genuine vertical pulling stimulus.',
   'vertical_pull', 'moderate', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 30, 'pulldown',
   'Seated at the machine, thighs braced under the pads, bar held wider than shoulder width.',
   array['Pull the bar down toward your upper chest, leading with your elbows.',
         'Squeeze your shoulder blades together and down at the bottom.',
         'Extend your arms back up under control.'],
   array['Lean back only slightly — avoid excessive body swing.', 'Lead with the elbows, not the hands.',
         'Control the return rather than letting the weight stack slam.'],
   array['Pulling the bar behind the neck.', 'Using excessive body swing to move the weight.'],
   null),

  ('Pull-Up', 'pull-up',
   'A hanging vertical pull on a bar — a genuine loaded pulling exercise that trains your lats, upper back and biceps.',
   'vertical_pull', 'high', 'intermediate', 'high', 'high', 'high', 3, 8, 15, 'pullup',
   'Hanging from a pull-up bar with an overhand grip, arms fully extended.',
   array['Pull yourself up until your chin clears the bar.',
         'Lead with your elbows and squeeze your shoulder blades together.',
         'Lower back down under control to full arm extension.'],
   array['Avoid excessive kipping or swinging.', 'Control the descent rather than dropping.',
         'Aim for a full range of motion each rep.'],
   array['Only performing a partial range of motion.', 'Using momentum instead of controlled pulling strength.'],
   null),

  ('Dumbbell Bicep Curl', 'dumbbell-bicep-curl',
   'A standing arm-curl exercise with dumbbells — trains your biceps.',
   'elbow_flexion', 'low', 'beginner', 'low', 'low', 'low', 8, 12, 10, 'curl',
   'Standing tall, a dumbbell in each hand, arms extended by your sides.',
   array['Curl the dumbbells up toward your shoulders, keeping your elbows close to your body.',
         'Squeeze your biceps at the top.',
         'Lower back down under control.'],
   array['Keep your elbows still — avoid swinging them forward.', 'Control the lowering phase.',
         'Avoid using your back to heave the weight up.'],
   array['Swinging the body to generate momentum.', 'Only performing a partial range of motion.'],
   null),

  ('Cable Triceps Pushdown', 'cable-triceps-pushdown',
   'A standing pressing-down exercise on a cable machine — trains your triceps.',
   'elbow_extension', 'low', 'beginner', 'low', 'moderate', 'low', 10, 15, 20, 'pushdown',
   'Standing at the cable station, elbows tucked at your sides, holding the bar at chest height.',
   array['Push the bar down until your arms are fully extended, keeping your elbows tucked in.',
         'Squeeze your triceps at the bottom.',
         'Let the bar rise back to chest height under control.'],
   array['Keep your elbows pinned to your sides throughout.', 'Avoid leaning your whole body into the movement.',
         'Control the return rather than letting the weight stack slam.'],
   array['Letting the elbows drift away from the body.', 'Using body weight to force the bar down.'],
   null),

  ('Bench Dip', 'bench-dip',
   'A dip using a bench for support — trains your triceps and shoulders.',
   'elbow_extension', 'moderate', 'intermediate', 'moderate', 'low', 'moderate', 8, 12, 10, 'bench-dip',
   'Hands on the edge of a bench behind you, legs extended in front, hips just off the bench.',
   array['Bend your elbows to lower your hips toward the floor.',
         'Keep your elbows pointing backward, not flaring out.',
         'Push back up to the starting position.'],
   array['Keep your shoulders down, away from your ears.', 'Keep the movement slow and controlled.',
         'Only lower as far as feels comfortable in your shoulders.'],
   array['Lowering too far and straining the shoulders.', 'Flaring the elbows out to the sides.'],
   'Skip this if you have current shoulder discomfort.'),

  ('Leg Press', 'leg-press',
   'A seated machine exercise pressing a weighted platform — trains your quads, glutes and hamstrings with a supported back.',
   'squat', 'low', 'beginner', 'low', 'high', 'moderate', 8, 12, 30, 'leg-press',
   'Seated in the machine, feet shoulder-width apart on the platform, back against the pad.',
   array['Lower the platform toward you by bending your knees, keeping your lower back on the pad.',
         'Lower to a depth you can control with good form.',
         'Press through your whole foot to extend your legs back out.'],
   array['Keep your lower back flat against the pad throughout.', 'Avoid locking your knees out hard at the top.',
         'Keep your knees tracking in line with your toes.'],
   array['Letting the lower back round off the pad.', 'Using a range of motion that lifts the hips off the pad.'],
   null),

  ('Kettlebell Swing', 'kettlebell-swing',
   'A hip-hinge power exercise with a kettlebell — trains your glutes, hamstrings and conditioning.',
   'hip_hinge', 'high', 'intermediate', 'moderate', 'moderate', 'high', 10, 20, 20, 'kettlebell-swing',
   'Standing, feet shoulder-width apart, kettlebell on the floor slightly in front of you.',
   array['Hinge at your hips to grip the kettlebell with both hands.',
         'Drive your hips forward powerfully to swing the kettlebell to chest height.',
         'Let it swing back between your legs under control and repeat.'],
   array['Power comes from the hips, not the arms.', 'Keep your back flat throughout.',
         'Keep the kettlebell close to your body on the backswing.'],
   array['Squatting the movement instead of hinging at the hips.', 'Using the arms to lift the kettlebell.'],
   'A high-intensity, high-skill exercise — not recommended if you have cardiac, joint or pregnancy-related restrictions.'),

  ('Farmer''s Carry', 'farmers-carry',
   'A loaded walk holding weights at your sides — trains your grip, core and overall stability.',
   'loaded_carry', 'low', 'beginner', 'moderate', 'moderate', 'moderate', 20, 40, 15, 'carry',
   'Standing tall, holding a dumbbell in each hand by your sides.',
   array['Walk forward with a tall, controlled posture for the target distance or time.',
         'Keep your shoulders back and core braced throughout.',
         'Set the weights down under control at the end.'],
   array['Keep your posture tall — avoid leaning to one side.', 'Take controlled, even steps.',
         'Keep your shoulders pulled back, not rounded forward.'],
   array['Leaning to one side to compensate for the load.', 'Rushing the steps and losing posture.'],
   null)
) as v(
  name, slug, description, pattern_key, skill_requirement, difficulty,
  stability_requirement, loading_potential, fatigue_profile,
  rep_low, rep_high, setup_seconds, pose,
  starting_position, instructions, cues, mistakes, safety_note
)
join public.movement_patterns mp on mp.key = v.pattern_key;

-- ---------------------------------------------------------------------
-- exercise_muscles (primary + secondary)
-- ---------------------------------------------------------------------
insert into public.exercise_muscles (exercise_id, muscle_id, role)
select e.id, m.id, v.role
from (values
  ('bodyweight-squat', 'quadriceps', 'primary'), ('bodyweight-squat', 'glutes', 'secondary'), ('bodyweight-squat', 'hamstrings', 'secondary'),
  ('reverse-lunge', 'quadriceps', 'primary'), ('reverse-lunge', 'glutes', 'secondary'),
  ('glute-bridge', 'glutes', 'primary'), ('glute-bridge', 'hamstrings', 'secondary'),
  ('bodyweight-good-morning', 'hamstrings', 'primary'), ('bodyweight-good-morning', 'glutes', 'secondary'), ('bodyweight-good-morning', 'lower_back', 'secondary'),
  ('incline-pushup', 'chest', 'primary'), ('incline-pushup', 'triceps', 'secondary'), ('incline-pushup', 'shoulders', 'secondary'),
  ('pushup', 'chest', 'primary'), ('pushup', 'triceps', 'secondary'), ('pushup', 'shoulders', 'secondary'),
  ('pike-pushup', 'shoulders', 'primary'), ('pike-pushup', 'triceps', 'secondary'),
  ('plank', 'core', 'primary'),
  ('dead-bug', 'core', 'primary'),
  ('bird-dog', 'core', 'primary'), ('bird-dog', 'glutes', 'secondary'),
  ('side-plank', 'obliques', 'primary'), ('side-plank', 'core', 'secondary'),
  ('side-lying-hip-abduction', 'glutes', 'primary'),
  ('calf-raise', 'calves', 'primary'),
  ('reverse-snow-angel', 'upper_back', 'primary'), ('reverse-snow-angel', 'shoulders', 'secondary'),
  ('superman', 'lower_back', 'primary'), ('superman', 'glutes', 'secondary'), ('superman', 'hamstrings', 'secondary'),
  ('step-up', 'quadriceps', 'primary'), ('step-up', 'glutes', 'secondary'),
  ('high-knees', 'quadriceps', 'secondary'),
  ('burpee', 'chest', 'secondary'), ('burpee', 'quadriceps', 'secondary'),
  ('goblet-squat', 'quadriceps', 'primary'), ('goblet-squat', 'glutes', 'secondary'), ('goblet-squat', 'hamstrings', 'secondary'),
  ('barbell-back-squat', 'quadriceps', 'primary'), ('barbell-back-squat', 'glutes', 'secondary'), ('barbell-back-squat', 'hamstrings', 'secondary'),
  ('dumbbell-rdl', 'hamstrings', 'primary'), ('dumbbell-rdl', 'glutes', 'secondary'), ('dumbbell-rdl', 'lower_back', 'secondary'),
  ('barbell-deadlift', 'hamstrings', 'primary'), ('barbell-deadlift', 'glutes', 'secondary'), ('barbell-deadlift', 'lower_back', 'secondary'), ('barbell-deadlift', 'upper_back', 'secondary'),
  ('flat-barbell-bench-press', 'chest', 'primary'), ('flat-barbell-bench-press', 'triceps', 'secondary'), ('flat-barbell-bench-press', 'shoulders', 'secondary'),
  ('dumbbell-bench-press', 'chest', 'primary'), ('dumbbell-bench-press', 'triceps', 'secondary'), ('dumbbell-bench-press', 'shoulders', 'secondary'),
  ('dumbbell-shoulder-press', 'shoulders', 'primary'), ('dumbbell-shoulder-press', 'triceps', 'secondary'),
  ('seated-cable-row', 'upper_back', 'primary'), ('seated-cable-row', 'lats', 'secondary'), ('seated-cable-row', 'biceps', 'secondary'),
  ('resistance-band-row', 'upper_back', 'primary'), ('resistance-band-row', 'lats', 'secondary'), ('resistance-band-row', 'biceps', 'secondary'),
  ('lat-pulldown', 'lats', 'primary'), ('lat-pulldown', 'upper_back', 'secondary'), ('lat-pulldown', 'biceps', 'secondary'),
  ('pull-up', 'lats', 'primary'), ('pull-up', 'upper_back', 'secondary'), ('pull-up', 'biceps', 'secondary'),
  ('dumbbell-bicep-curl', 'biceps', 'primary'), ('dumbbell-bicep-curl', 'forearms', 'secondary'),
  ('cable-triceps-pushdown', 'triceps', 'primary'),
  ('bench-dip', 'triceps', 'primary'), ('bench-dip', 'shoulders', 'secondary'),
  ('leg-press', 'quadriceps', 'primary'), ('leg-press', 'glutes', 'secondary'), ('leg-press', 'hamstrings', 'secondary'),
  ('kettlebell-swing', 'glutes', 'primary'), ('kettlebell-swing', 'hamstrings', 'secondary'), ('kettlebell-swing', 'core', 'secondary'),
  ('farmers-carry', 'forearms', 'primary'), ('farmers-carry', 'core', 'secondary')
) as v(slug, muscle_key, role)
join public.exercises e on e.slug = v.slug
join public.muscles m on m.key = v.muscle_key;

-- ---------------------------------------------------------------------
-- exercise_equipment (required equipment only — every exercise without a
-- row here is genuinely bodyweight-eligible, docs/PROGRAMME_ENGINE.md §3.1(b)).
-- ---------------------------------------------------------------------
insert into public.exercise_equipment (exercise_id, equipment_id, required)
select e.id, eq.id, true
from (values
  ('goblet-squat', 'dumbbell'),
  ('barbell-back-squat', 'barbell'),
  ('dumbbell-rdl', 'dumbbell'),
  ('barbell-deadlift', 'barbell'),
  ('flat-barbell-bench-press', 'barbell'),
  ('flat-barbell-bench-press', 'bench'),
  ('dumbbell-bench-press', 'dumbbell'),
  ('dumbbell-bench-press', 'bench'),
  ('dumbbell-shoulder-press', 'dumbbell'),
  ('seated-cable-row', 'cable_machine'),
  ('resistance-band-row', 'resistance_band'),
  ('lat-pulldown', 'lat_pulldown_machine'),
  ('pull-up', 'pull_up_bar'),
  ('dumbbell-bicep-curl', 'dumbbell'),
  ('cable-triceps-pushdown', 'cable_machine'),
  ('bench-dip', 'bench'),
  ('leg-press', 'leg_press_machine'),
  ('kettlebell-swing', 'kettlebell'),
  ('farmers-carry', 'dumbbell')
) as v(slug, equipment_key)
join public.exercises e on e.slug = v.slug
join public.equipment eq on eq.key = v.equipment_key;

-- ---------------------------------------------------------------------
-- exercise_restrictions. Illustrative v1 content, deliberately
-- conservative — mirrors the same "not final clinical/legal-reviewed
-- copy" status already recorded for safety-screening wording
-- (docs/OPEN_QUESTIONS.md #5, docs/RISKS.md #1). restriction_code values
-- match exactly what submit_safety_screening() (20260724080100) writes
-- into health_screenings.restriction_flags.
-- ---------------------------------------------------------------------
insert into public.exercise_restrictions (exercise_id, restriction_code, effect, notes)
select e.id, v.restriction_code, v.effect, v.notes
from (values
  ('burpee', 'cardiac_supervision_required', 'exclude', 'High-intensity conditioning exercise.'),
  ('burpee', 'exertional_chest_pain', 'exclude', 'High-intensity conditioning exercise.'),
  ('burpee', 'joint_or_bone_limitation', 'exclude', 'High-impact landing.'),
  ('burpee', 'pregnancy_or_recent_postpartum', 'exclude', 'High-impact, high-intra-abdominal-pressure movement.'),
  ('kettlebell-swing', 'cardiac_supervision_required', 'exclude', 'High-intensity power exercise.'),
  ('kettlebell-swing', 'joint_or_bone_limitation', 'exclude', 'Ballistic hip-hinge loading.'),
  ('kettlebell-swing', 'pregnancy_or_recent_postpartum', 'exclude', 'High intra-abdominal pressure movement.'),
  ('barbell-deadlift', 'joint_or_bone_limitation', 'exclude', 'High spinal/joint loading.'),
  ('barbell-back-squat', 'joint_or_bone_limitation', 'exclude', 'High joint loading under load.'),
  ('pull-up', 'joint_or_bone_limitation', 'exclude', 'High shoulder/elbow joint loading.'),
  ('bench-dip', 'joint_or_bone_limitation', 'exclude', 'Shoulder joint stress in the bottom position.'),
  ('high-knees', 'joint_or_bone_limitation', 'exclude', 'Repetitive impact.'),
  ('barbell-deadlift', 'pregnancy_or_recent_postpartum', 'exclude', 'High intra-abdominal pressure, spinal loading.'),
  ('barbell-back-squat', 'pregnancy_or_recent_postpartum', 'exclude', 'High intra-abdominal pressure, spinal loading.'),
  ('side-plank', 'dizziness_balance_risk', 'exclude', 'Balance-dependent hold.'),
  ('bird-dog', 'dizziness_balance_risk', 'exclude', 'Balance-dependent movement.')
) as v(slug, restriction_code, effect, notes)
join public.exercises e on e.slug = v.slug;

-- ---------------------------------------------------------------------
-- exercise_substitutions (progressions / regressions / lateral
-- alternatives). Modest v1 graph covering the most useful chains.
-- ---------------------------------------------------------------------
insert into public.exercise_substitutions (exercise_id, substitute_exercise_id, similarity_score, relation_type)
select e1.id, e2.id, v.score, v.relation_type
from (values
  ('pushup', 'incline-pushup', 0.85, 'regression'),
  ('incline-pushup', 'pushup', 0.85, 'progression'),
  ('bodyweight-squat', 'goblet-squat', 0.80, 'progression'),
  ('goblet-squat', 'bodyweight-squat', 0.80, 'regression'),
  ('goblet-squat', 'barbell-back-squat', 0.75, 'progression'),
  ('barbell-back-squat', 'goblet-squat', 0.75, 'regression'),
  ('dumbbell-rdl', 'barbell-deadlift', 0.75, 'progression'),
  ('barbell-deadlift', 'dumbbell-rdl', 0.75, 'regression'),
  ('bodyweight-good-morning', 'dumbbell-rdl', 0.70, 'progression'),
  ('dumbbell-rdl', 'bodyweight-good-morning', 0.70, 'regression'),
  ('dumbbell-bench-press', 'flat-barbell-bench-press', 0.85, 'alternative'),
  ('flat-barbell-bench-press', 'dumbbell-bench-press', 0.85, 'alternative'),
  ('resistance-band-row', 'seated-cable-row', 0.80, 'alternative'),
  ('seated-cable-row', 'resistance-band-row', 0.80, 'alternative'),
  ('lat-pulldown', 'pull-up', 0.70, 'progression'),
  ('pull-up', 'lat-pulldown', 0.70, 'regression'),
  ('reverse-snow-angel', 'resistance-band-row', 0.55, 'progression'),
  ('resistance-band-row', 'reverse-snow-angel', 0.55, 'regression'),
  ('plank', 'side-plank', 0.60, 'alternative'),
  ('side-plank', 'plank', 0.60, 'alternative'),
  ('dead-bug', 'bird-dog', 0.65, 'alternative'),
  ('bird-dog', 'dead-bug', 0.65, 'alternative'),
  ('reverse-lunge', 'step-up', 0.70, 'alternative'),
  ('step-up', 'reverse-lunge', 0.70, 'alternative'),
  ('cable-triceps-pushdown', 'bench-dip', 0.60, 'alternative'),
  ('bench-dip', 'cable-triceps-pushdown', 0.60, 'alternative'),
  ('barbell-back-squat', 'leg-press', 0.65, 'alternative'),
  ('leg-press', 'barbell-back-squat', 0.65, 'alternative')
) as v(slug, sub_slug, score, relation_type)
join public.exercises e1 on e1.slug = v.slug
join public.exercises e2 on e2.slug = v.sub_slug;
