-- Real-device remediation Part 4/6: seed a small, high-quality v1 exercise
-- catalogue so the deterministic programme engine (Part 8) has genuine
-- exercises to select instead of the previous UI-only preview data. This
-- is deliberately the MINIMUM catalogue needed for coherent
-- beginner/intermediate programmes across bodyweight-only and common
-- home/gym-equipment tiers — not the full future content library.
--
-- Content honesty note (docs/PROGRAMME_ENGINE.md §2, remediation Part 6):
-- there is deliberately no bodyweight-only "horizontal pull" or
-- "vertical pull" exercise seeded here. A true loaded pulling movement
-- needs external resistance (a band at minimum, a bar, a machine); this
-- catalogue does not invent a fake bodyweight equivalent. A bodyweight-only
-- user's generated programme is honest about that limitation
-- (enforced in the programme engine, not by pretending here).

insert into public.muscles (key, label, muscle_group) values
  ('chest', 'Chest', 'chest'),
  ('anterior_deltoid', 'Front shoulders', 'shoulders'),
  ('lateral_deltoid', 'Side shoulders', 'shoulders'),
  ('posterior_deltoid', 'Rear shoulders', 'shoulders'),
  ('triceps', 'Triceps', 'arms'),
  ('biceps', 'Biceps', 'arms'),
  ('forearms', 'Forearms', 'arms'),
  ('lats', 'Lats', 'back'),
  ('upper_back', 'Upper back', 'back'),
  ('lower_back', 'Lower back', 'back'),
  ('glutes', 'Glutes', 'glutes'),
  ('quadriceps', 'Quadriceps', 'legs'),
  ('hamstrings', 'Hamstrings', 'legs'),
  ('calves', 'Calves', 'legs'),
  ('abs', 'Abs', 'core'),
  ('obliques', 'Obliques', 'core'),
  ('hip_flexors', 'Hip flexors', 'legs')
on conflict (key) do nothing;

with staged (
  slug, name, description, movement_pattern_key, skill_requirement, difficulty,
  stability_requirement, loading_potential, fatigue_profile, rep_low, rep_high,
  setup_time_seconds, visual_key, starting_position, instructions, coaching_cues,
  common_mistakes
) as (
  values
  ('bodyweight-squat', 'Bodyweight Squat',
   'A basic squat using only your body weight. Builds the squat pattern and trains your quads and glutes.',
   'squat', 'low', 'beginner', 'low', 'low', 'low', 10, 20, 10, 'pose_squat',
   'Stand with feet shoulder-width apart, toes turned slightly outward.',
   array['Bend your knees and push your hips back as if sitting into a chair.',
     'Lower until your thighs are roughly parallel to the floor, or as low as feels controlled.',
     'Push through your feet to stand back up.'],
   array['Keep your chest up.', 'Push your knees out in line with your toes.', 'Keep your weight through your whole foot, not just your toes.'],
   array['Letting the knees collapse inward.', 'Rising onto the toes instead of staying flat-footed.']),

  ('reverse-lunge', 'Reverse Lunge',
   'A single-leg lunge stepping backward. Builds single-leg strength and balance in your quads and glutes.',
   'lunge_single_leg', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 15, 10, 'pose_lunge',
   'Stand tall with feet hip-width apart.',
   array['Step one leg back and lower your back knee toward the floor.',
     'Keep most of your weight on your front leg.',
     'Push through your front foot to return to standing.'],
   array['Keep your torso upright.', 'Lower straight down rather than leaning forward.', 'Control the step back rather than dropping into it.'],
   array['Letting the front knee travel far past the toes.', 'Losing balance by taking too long a step.']),

  ('glute-bridge', 'Glute Bridge',
   'A hip-extension exercise lying on your back. Trains your glutes and hamstrings.',
   'hip_extension', 'low', 'beginner', 'low', 'low', 'low', 12, 20, 5, 'pose_bridge',
   'Lie on your back, knees bent, feet flat on the floor close to your hips.',
   array['Squeeze your glutes and lift your hips toward the ceiling.',
     'Pause briefly at the top with your body in a straight line from shoulders to knees.',
     'Lower back down with control.'],
   array['Drive through your heels.', 'Squeeze your glutes at the top rather than arching your lower back.', 'Keep your ribs down.'],
   array['Overarching the lower back at the top.', 'Using the heels only briefly instead of a controlled squeeze.']),

  ('knee-push-up', 'Kneeling Push-Up',
   'A push-up performed from the knees. The easiest entry point for building pushing strength in your chest, shoulders and triceps.',
   'horizontal_push', 'low', 'beginner', 'low', 'low', 'low', 8, 15, 5, 'pose_pushup',
   'Kneel on the floor with hands under your shoulders, body in a straight line from knees to head.',
   array['Lower your chest toward the floor by bending your elbows.',
     'Keep your core braced so your hips don''t sag.',
     'Push back up to the starting position.'],
   array['Keep elbows at roughly 45 degrees from your body.', 'Keep your body in one straight line.', 'Breathe out as you push up.'],
   array['Letting the hips sag toward the floor.', 'Flaring the elbows straight out to the sides.']),

  ('incline-push-up', 'Incline Push-Up',
   'A push-up with your hands elevated on a sturdy surface like a step or low table. An easier regression of the standard push-up.',
   'horizontal_push', 'low', 'beginner', 'low', 'low', 'low', 8, 15, 10, 'pose_pushup',
   'Place your hands on a stable elevated surface, feet on the floor, body in a straight line.',
   array['Lower your chest toward the surface by bending your elbows.',
     'Keep your body straight from head to heels.',
     'Push back up to the starting position.'],
   array['The higher the surface, the easier the exercise.', 'Keep your core braced throughout.', 'Fully extend your arms at the top without locking out hard.'],
   array['Letting the hips sag.', 'Using a surface that isn''t stable.']),

  ('push-up', 'Push-Up',
   'The standard push-up from the floor. Trains your chest, shoulders and triceps without any equipment.',
   'horizontal_push', 'moderate', 'intermediate', 'moderate', 'low', 'moderate', 6, 12, 5, 'pose_pushup',
   'Start in a plank position, hands slightly wider than shoulders, body in a straight line.',
   array['Lower your chest toward the floor by bending your elbows.',
     'Keep your body rigid from head to heels throughout.',
     'Push back up to the starting position.'],
   array['Keep elbows at roughly 45 degrees from your body.', 'Keep your core and glutes braced.', 'Lower under control rather than dropping.'],
   array['Letting the hips sag or pike up.', 'Only performing a partial range of motion.']),

  ('pike-push-up', 'Pike Push-Up',
   'A push-up variation with hips raised high, shifting emphasis onto your shoulders. A bodyweight option for vertical pressing.',
   'vertical_push', 'moderate', 'intermediate', 'moderate', 'moderate', 'moderate', 6, 12, 5, 'pose_pike',
   'Start in a downward-dog-like position: hands and feet on the floor, hips lifted high, forming an inverted V.',
   array['Bend your elbows to lower the top of your head toward the floor.',
     'Keep your hips high throughout the movement.',
     'Push back up to the starting position.'],
   array['Keep your hips as the highest point.', 'Look slightly forward, not straight down.', 'Move through a range that feels controlled.'],
   array['Letting the hips drop, turning it into a regular push-up.', 'Rushing the descent.']),

  ('standing-hip-hinge', 'Standing Hip Hinge Drill',
   'A bodyweight drill that teaches the hip-hinge pattern used in deadlift-style movements. Trains your hamstrings and glutes.',
   'hip_hinge', 'moderate', 'beginner', 'moderate', 'low', 'low', 10, 15, 5, 'pose_hinge',
   'Stand tall with feet hip-width apart, a soft bend in your knees.',
   array['Push your hips back while keeping your back flat, letting your torso lean forward.',
     'Lower until you feel a stretch in your hamstrings.',
     'Drive your hips forward to return to standing.'],
   array['Keep the movement at the hips, not the lower back.', 'Keep a flat back throughout.', 'Keep the knees only softly bent, not squatting.'],
   array['Rounding the lower back.', 'Turning it into a squat by bending the knees too much.']),

  ('step-up', 'Step-Up',
   'A single-leg exercise stepping onto a sturdy elevated surface such as a step or low bench. Trains your quads and glutes.',
   'lunge_single_leg', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 15, 10, 'pose_lunge',
   'Stand facing a sturdy step or platform at about knee height.',
   array['Place one foot fully on the step.',
     'Push through that foot to bring your body up, tapping the other foot down lightly.',
     'Step back down with control and repeat.'],
   array['Drive through the whole foot on the step, not just the toes.', 'Keep your torso upright.', 'Control the step down rather than dropping.'],
   array['Pushing off the bottom leg instead of the top leg doing the work.', 'Using a surface that is unstable.']),

  ('calf-raise', 'Standing Calf Raise',
   'A simple standing exercise that trains your calves through a full range of motion.',
   'calf', 'low', 'beginner', 'low', 'low', 'low', 12, 20, 5, 'pose_calf',
   'Stand tall, feet hip-width apart, holding onto something stable for balance if needed.',
   array['Rise up onto the balls of your feet as high as you can.',
     'Pause briefly at the top.',
     'Lower back down with control.'],
   array['Rise all the way up.', 'Control the lowering phase.', 'Keep your knees soft, not locked.'],
   array['Bouncing at the bottom instead of controlling the descent.', 'Only moving through a small range.']),

  ('dead-bug', 'Dead Bug',
   'A core exercise lying on your back that trains control of your trunk while your limbs move.',
   'core_anti_extension', 'moderate', 'beginner', 'low', 'low', 'low', 8, 12, 5, 'pose_deadbug',
   'Lie on your back with arms reaching toward the ceiling and knees bent at 90 degrees above your hips.',
   array['Slowly lower one arm and the opposite leg toward the floor.',
     'Keep your lower back pressed into the floor throughout.',
     'Return to the start and repeat on the other side.'],
   array['Keep your lower back flat against the floor.', 'Move slowly and with control.', 'Only lower as far as you can keep your back flat.'],
   array['Letting the lower back arch off the floor.', 'Moving too fast to control.']),

  ('bird-dog', 'Bird Dog',
   'A core and balance exercise on hands and knees that trains stability through your trunk.',
   'core_anti_rotation', 'moderate', 'beginner', 'moderate', 'low', 'low', 8, 12, 5, 'pose_birddog',
   'Start on hands and knees, hands under shoulders, knees under hips.',
   array['Extend one arm forward and the opposite leg back at the same time.',
     'Hold briefly while keeping your hips and shoulders level.',
     'Return to the start and repeat on the other side.'],
   array['Keep your hips level, don''t let them rotate.', 'Move slowly.', 'Keep your neck in a neutral position.'],
   array['Letting the hips twist toward the raised leg.', 'Arching the lower back.']),

  ('plank', 'Plank',
   'A static core hold that trains your abs and lower back to resist movement.',
   'core_anti_extension', 'low', 'beginner', 'low', 'low', 'low', 20, 45, 5, 'pose_plank',
   'Support yourself on forearms and toes, body in a straight line from head to heels.',
   array['Brace your core and squeeze your glutes.',
     'Hold the position, keeping your body straight.',
     'Breathe steadily throughout.'],
   array['Keep hips level, not sagging or piking up.', 'Keep your neck neutral.', 'Breathe rather than holding your breath.'],
   array['Letting the hips sag toward the floor.', 'Holding the breath instead of breathing normally.']),

  ('side-plank', 'Side Plank',
   'A static core hold on one side that trains the obliques and lateral trunk stability.',
   'core_anti_rotation', 'moderate', 'intermediate', 'high', 'low', 'low', 15, 30, 5, 'pose_sideplank',
   'Lie on your side, supporting yourself on one forearm, body in a straight line.',
   array['Lift your hips off the floor so your body forms a straight line.',
     'Hold the position, keeping your hips lifted.',
     'Lower with control and repeat on the other side.'],
   array['Stack your shoulders and hips.', 'Keep your hips lifted throughout.', 'Keep your supporting elbow under your shoulder.'],
   array['Letting the hips drop toward the floor.', 'Rotating the torso forward or backward.']),

  ('prone-superman', 'Prone Superman Hold',
   'A bodyweight posterior-chain hold lying face down. Trains your lower back and glutes. This is an endurance/postural exercise, not a substitute for a loaded pulling movement.',
   'hip_extension', 'low', 'beginner', 'low', 'low', 'low', 10, 20, 5, 'pose_superman',
   'Lie face down with arms extended overhead and legs straight.',
   array['Simultaneously lift your arms, chest and legs a small distance off the floor.',
     'Hold briefly, squeezing your glutes and upper back.',
     'Lower with control.'],
   array['Lift a small, controlled amount rather than straining upward.', 'Keep your neck neutral, looking at the floor.', 'Squeeze your glutes at the top.'],
   array['Overextending the lower back.', 'Craning the neck to look up.']),

  ('march-in-place', 'Standing March',
   'A simple standing conditioning exercise that raises your heart rate without any equipment.',
   'conditioning', 'low', 'beginner', 'low', 'low', 'moderate', 20, 60, 0, 'pose_march',
   'Stand tall with feet hip-width apart.',
   array['Drive one knee up toward hip height.',
     'Lower it and immediately drive the other knee up.',
     'Continue at a steady, sustainable pace.'],
   array['Keep your torso upright.', 'Pump your arms naturally.', 'Land softly on the balls of your feet.'],
   array['Leaning back excessively.', 'Going faster than you can control.']),

  ('dumbbell-goblet-squat', 'Dumbbell Goblet Squat',
   'A squat holding a single dumbbell at chest height. Adds load to the squat pattern for your quads and glutes.',
   'squat', 'moderate', 'intermediate', 'low', 'moderate', 'moderate', 8, 12, 15, 'pose_squat',
   'Stand with feet shoulder-width apart, holding one dumbbell vertically against your chest with both hands.',
   array['Bend your knees and push your hips back to squat down.',
     'Keep the dumbbell close to your chest throughout.',
     'Push through your feet to stand back up.'],
   array['Keep your elbows pointing down, close to your body.', 'Keep your chest up.', 'Push your knees out in line with your toes.'],
   array['Letting the dumbbell drift away from your chest.', 'Rounding the upper back.']),

  ('dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift',
   'A hip-hinge exercise holding dumbbells. Trains your hamstrings and glutes through a loaded stretch.',
   'hip_hinge', 'moderate', 'intermediate', 'moderate', 'moderate', 'moderate', 8, 12, 15, 'pose_hinge',
   'Stand holding a dumbbell in each hand in front of your thighs, feet hip-width apart.',
   array['Push your hips back while keeping the dumbbells close to your legs.',
     'Lower until you feel a stretch in your hamstrings, keeping your back flat.',
     'Drive your hips forward to return to standing.'],
   array['Keep the dumbbells close to your legs throughout.', 'Keep a flat back.', 'Keep the movement at the hips, not the knees.'],
   array['Rounding the lower back.', 'Squatting the weight down instead of hinging.']),

  ('dumbbell-bench-press', 'Dumbbell Bench Press',
   'A pressing exercise lying on a bench with dumbbells. Trains your chest, shoulders and triceps.',
   'horizontal_push', 'moderate', 'intermediate', 'moderate', 'moderate', 'moderate', 8, 12, 20, 'pose_pushup',
   'Lie on a bench holding a dumbbell in each hand above your chest, arms extended.',
   array['Lower the dumbbells to the sides of your chest with control.',
     'Keep your feet flat on the floor and your back in contact with the bench.',
     'Press the dumbbells back up to the starting position.'],
   array['Keep your shoulder blades pulled back and down.', 'Lower under control rather than dropping.', 'Press in a straight line, not flaring wide.'],
   array['Bouncing the dumbbells off the chest.', 'Letting the lower back arch excessively off the bench.']),

  ('dumbbell-row', 'Single-Arm Dumbbell Row',
   'A supported pulling exercise using a bench and one dumbbell. Trains your back and biceps with real external load.',
   'horizontal_pull', 'moderate', 'intermediate', 'moderate', 'moderate', 'moderate', 8, 12, 20, 'pose_row',
   'Place one knee and one hand on a bench for support, holding a dumbbell in the opposite hand, back flat.',
   array['Pull the dumbbell up toward your hip, leading with your elbow.',
     'Squeeze your shoulder blade at the top.',
     'Lower with control and repeat.'],
   array['Keep your back flat, not rounded.', 'Pull with your back, not just your arm.', 'Keep your torso still throughout.'],
   array['Rounding the back.', 'Using momentum by twisting the torso.']),

  ('dumbbell-shoulder-press', 'Dumbbell Shoulder Press',
   'A vertical pressing exercise with dumbbells. Trains your shoulders and triceps.',
   'vertical_push', 'moderate', 'intermediate', 'moderate', 'moderate', 'moderate', 8, 12, 15, 'pose_pike',
   'Stand or sit holding a dumbbell in each hand at shoulder height, palms facing forward.',
   array['Press the dumbbells straight overhead until your arms are extended.',
     'Keep your core braced so your lower back doesn''t arch.',
     'Lower with control back to shoulder height.'],
   array['Keep your core braced throughout.', 'Press in a straight line overhead.', 'Avoid shrugging your shoulders up toward your ears.'],
   array['Arching the lower back to press the weight up.', 'Pressing the dumbbells forward instead of straight up.']),

  ('resistance-band-row', 'Resistance Band Seated Row',
   'A seated pulling exercise using a resistance band anchored around your feet. A genuine, minimal-equipment way to train real pulling strength.',
   'horizontal_pull', 'low', 'beginner', 'low', 'moderate', 'low', 10, 15, 10, 'pose_row',
   'Sit on the floor with legs extended, band looped around your feet, holding one end in each hand.',
   array['Pull the band toward your torso, leading with your elbows.',
     'Squeeze your shoulder blades together at the end of the movement.',
     'Extend your arms back out with control.'],
   array['Keep your back straight, don''t lean back to pull.', 'Keep your elbows close to your body.', 'Control the return rather than letting the band snap back.'],
   array['Leaning back and using body weight instead of your back muscles.', 'Rounding the shoulders forward at the start.']),

  ('lat-pulldown-machine', 'Lat Pulldown',
   'A machine-based pulling exercise. Trains your lats and biceps with an easier setup than a pull-up.',
   'vertical_pull', 'low', 'beginner', 'low', 'moderate', 'moderate', 8, 12, 20, 'pose_row',
   'Sit at the machine with thighs secured under the pads, holding the bar with a wide overhand grip.',
   array['Pull the bar down toward your upper chest, leading with your elbows.',
     'Squeeze your shoulder blades together at the bottom.',
     'Let the bar rise back up with control.'],
   array['Keep a slight backward lean, not a big swing.', 'Pull with your back, not just your arms.', 'Control the weight on the way up.'],
   array['Using body swing to move the weight.', 'Pulling the bar behind the neck.']),

  ('seated-cable-row', 'Seated Cable Row',
   'A machine-based pulling exercise. Trains your back and biceps with continuous cable tension.',
   'horizontal_pull', 'low', 'intermediate', 'low', 'moderate', 'moderate', 8, 12, 20, 'pose_row',
   'Sit at the cable row station with feet on the platform, knees slightly bent, holding the handle.',
   array['Pull the handle toward your torso, leading with your elbows.',
     'Squeeze your shoulder blades together.',
     'Extend your arms back out with control, allowing a slight forward lean.'],
   array['Keep your back flat throughout.', 'Avoid using your lower back to heave the weight.', 'Control the return.'],
   array['Rounding the lower back at the start.', 'Using momentum instead of controlled pulling.']),

  ('barbell-back-squat', 'Barbell Back Squat',
   'A loaded squat with a barbell across the upper back. A high-loading-potential exercise for experienced lifters.',
   'squat', 'high', 'advanced', 'moderate', 'high', 'high', 5, 8, 30, 'pose_squat',
   'Position the barbell across your upper back, feet shoulder-width apart, unracked and stepped back.',
   array['Bend your knees and hips together to descend, keeping your chest up.',
     'Descend until your thighs are at least parallel to the floor.',
     'Drive through your feet to stand back up.'],
   array['Keep your core braced throughout.', 'Keep the bar path vertical over your midfoot.', 'Keep your knees tracking in line with your toes.'],
   array['Letting the knees cave inward.', 'Rounding the lower back under load.']),

  ('barbell-bench-press', 'Barbell Bench Press',
   'A loaded pressing exercise lying on a bench with a barbell. A high-loading-potential exercise for experienced lifters.',
   'horizontal_push', 'high', 'advanced', 'moderate', 'high', 'high', 5, 8, 30, 'pose_pushup',
   'Lie on a bench with eyes under the bar, feet flat on the floor, grip slightly wider than shoulders.',
   array['Unrack the bar and lower it to your mid-chest with control.',
     'Keep your shoulder blades pulled back and down throughout.',
     'Press the bar back up to full arm extension.'],
   array['Keep your feet planted and your hips on the bench.', 'Control the bar down rather than dropping it.', 'Use a spotter when working near your limits.'],
   array['Bouncing the bar off the chest.', 'Flaring the elbows out to 90 degrees.']),

  ('pull-up', 'Pull-Up',
   'A bodyweight pulling exercise hanging from a bar. A genuine, high-value pulling exercise that needs only a pull-up bar.',
   'vertical_pull', 'high', 'advanced', 'high', 'moderate', 'high', 3, 8, 15, 'pose_row',
   'Hang from a pull-up bar with an overhand grip, hands slightly wider than shoulders, arms fully extended.',
   array['Pull yourself up until your chin clears the bar, leading with your chest.',
     'Avoid swinging your legs to generate momentum.',
     'Lower back down with control to a full hang.'],
   array['Engage your shoulder blades before pulling.', 'Keep your core braced to limit swinging.', 'Control the descent rather than dropping.'],
   array['Using momentum/kipping instead of controlled strength.', 'Only performing a partial range of motion.']),

  ('kettlebell-swing', 'Kettlebell Swing',
   'A hip-hinge power exercise with a kettlebell. Trains your glutes, hamstrings and conditioning together.',
   'hip_hinge', 'moderate', 'intermediate', 'moderate', 'moderate', 'high', 10, 20, 15, 'pose_hinge',
   'Stand with feet shoulder-width apart, kettlebell on the floor slightly in front of you.',
   array['Hinge at the hips to grip the kettlebell, then hike it back between your legs.',
     'Drive your hips forward powerfully to swing the kettlebell to chest height.',
     'Let it swing back down and repeat the hinge.'],
   array['Power comes from the hips, not the arms.', 'Keep a flat back throughout.', 'Keep the kettlebell close on the backswing.'],
   array['Squatting the movement instead of hinging.', 'Using the arms to lift the kettlebell.']),

  ('leg-press', 'Leg Press',
   'A machine-based squat-pattern exercise. Trains your quads and glutes with a supported, stable setup.',
   'squat', 'low', 'beginner', 'low', 'high', 'moderate', 8, 12, 20, 'pose_squat',
   'Sit in the machine with your back against the pad, feet shoulder-width apart on the platform.',
   array['Release the safety and lower the platform by bending your knees toward your chest.',
     'Lower until your knees reach roughly 90 degrees.',
     'Press through your feet to extend your legs back out.'],
   array['Keep your lower back against the pad.', 'Avoid locking your knees out hard at the top.', 'Control the descent.'],
   array['Letting the lower back round off the pad.', 'Using a range of motion that lifts the hips off the seat.'])
)
insert into public.exercises (
  slug, name, description, movement_pattern_id, skill_requirement, difficulty,
  stability_requirement, loading_potential, fatigue_profile, recommended_rep_range_low,
  recommended_rep_range_high, setup_time_seconds, visual_key, starting_position,
  instructions, coaching_cues, common_mistakes, source, review_status, reviewed_at,
  dataset_version, content_version, locale_ready, active
)
select
  s.slug, s.name, s.description, mp.id, s.skill_requirement, s.difficulty,
  s.stability_requirement, s.loading_potential, s.fatigue_profile, s.rep_low, s.rep_high,
  s.setup_time_seconds, s.visual_key, s.starting_position, s.instructions, s.coaching_cues,
  s.common_mistakes, 'internal_authoring', 'published', now(), '1', '1', true, true
from staged s
join public.movement_patterns mp on mp.key = s.movement_pattern_key
on conflict (slug) do nothing;

-- exercise_muscles ----------------------------------------------------------

with staged (slug, muscle_key, role) as (
  values
  ('bodyweight-squat', 'quadriceps', 'primary'), ('bodyweight-squat', 'glutes', 'primary'), ('bodyweight-squat', 'hamstrings', 'secondary'),
  ('reverse-lunge', 'quadriceps', 'primary'), ('reverse-lunge', 'glutes', 'primary'), ('reverse-lunge', 'hamstrings', 'secondary'),
  ('glute-bridge', 'glutes', 'primary'), ('glute-bridge', 'hamstrings', 'secondary'),
  ('knee-push-up', 'chest', 'primary'), ('knee-push-up', 'anterior_deltoid', 'secondary'), ('knee-push-up', 'triceps', 'secondary'),
  ('incline-push-up', 'chest', 'primary'), ('incline-push-up', 'anterior_deltoid', 'secondary'), ('incline-push-up', 'triceps', 'secondary'),
  ('push-up', 'chest', 'primary'), ('push-up', 'anterior_deltoid', 'secondary'), ('push-up', 'triceps', 'secondary'),
  ('pike-push-up', 'anterior_deltoid', 'primary'), ('pike-push-up', 'lateral_deltoid', 'primary'), ('pike-push-up', 'triceps', 'secondary'),
  ('standing-hip-hinge', 'hamstrings', 'primary'), ('standing-hip-hinge', 'glutes', 'primary'), ('standing-hip-hinge', 'lower_back', 'secondary'),
  ('step-up', 'quadriceps', 'primary'), ('step-up', 'glutes', 'primary'), ('step-up', 'hamstrings', 'secondary'),
  ('calf-raise', 'calves', 'primary'),
  ('dead-bug', 'abs', 'primary'), ('dead-bug', 'hip_flexors', 'secondary'),
  ('bird-dog', 'abs', 'primary'), ('bird-dog', 'lower_back', 'primary'), ('bird-dog', 'glutes', 'secondary'),
  ('plank', 'abs', 'primary'), ('plank', 'lower_back', 'secondary'),
  ('side-plank', 'obliques', 'primary'), ('side-plank', 'abs', 'secondary'),
  ('prone-superman', 'lower_back', 'primary'), ('prone-superman', 'glutes', 'primary'), ('prone-superman', 'hamstrings', 'secondary'),
  ('march-in-place', 'hip_flexors', 'primary'), ('march-in-place', 'quadriceps', 'secondary'), ('march-in-place', 'calves', 'secondary'),
  ('dumbbell-goblet-squat', 'quadriceps', 'primary'), ('dumbbell-goblet-squat', 'glutes', 'primary'), ('dumbbell-goblet-squat', 'hamstrings', 'secondary'),
  ('dumbbell-romanian-deadlift', 'hamstrings', 'primary'), ('dumbbell-romanian-deadlift', 'glutes', 'primary'), ('dumbbell-romanian-deadlift', 'lower_back', 'secondary'),
  ('dumbbell-bench-press', 'chest', 'primary'), ('dumbbell-bench-press', 'anterior_deltoid', 'secondary'), ('dumbbell-bench-press', 'triceps', 'secondary'),
  ('dumbbell-row', 'lats', 'primary'), ('dumbbell-row', 'upper_back', 'primary'), ('dumbbell-row', 'biceps', 'secondary'),
  ('dumbbell-shoulder-press', 'anterior_deltoid', 'primary'), ('dumbbell-shoulder-press', 'lateral_deltoid', 'primary'), ('dumbbell-shoulder-press', 'triceps', 'secondary'),
  ('resistance-band-row', 'upper_back', 'primary'), ('resistance-band-row', 'lats', 'primary'), ('resistance-band-row', 'biceps', 'secondary'),
  ('lat-pulldown-machine', 'lats', 'primary'), ('lat-pulldown-machine', 'biceps', 'secondary'), ('lat-pulldown-machine', 'upper_back', 'secondary'),
  ('seated-cable-row', 'upper_back', 'primary'), ('seated-cable-row', 'lats', 'primary'), ('seated-cable-row', 'biceps', 'secondary'),
  ('barbell-back-squat', 'quadriceps', 'primary'), ('barbell-back-squat', 'glutes', 'primary'), ('barbell-back-squat', 'hamstrings', 'secondary'), ('barbell-back-squat', 'lower_back', 'secondary'),
  ('barbell-bench-press', 'chest', 'primary'), ('barbell-bench-press', 'anterior_deltoid', 'secondary'), ('barbell-bench-press', 'triceps', 'secondary'),
  ('pull-up', 'lats', 'primary'), ('pull-up', 'biceps', 'secondary'), ('pull-up', 'upper_back', 'secondary'),
  ('kettlebell-swing', 'glutes', 'primary'), ('kettlebell-swing', 'hamstrings', 'primary'), ('kettlebell-swing', 'lower_back', 'secondary'),
  ('leg-press', 'quadriceps', 'primary'), ('leg-press', 'glutes', 'primary'), ('leg-press', 'hamstrings', 'secondary')
)
insert into public.exercise_muscles (exercise_id, muscle_id, role)
select e.id, m.id, s.role
from staged s
join public.exercises e on e.slug = s.slug
join public.muscles m on m.key = s.muscle_key
on conflict (exercise_id, muscle_id) do nothing;

-- exercise_equipment ---------------------------------------------------------

with staged (slug, equipment_key, required) as (
  values
  ('bodyweight-squat', 'bodyweight', true),
  ('reverse-lunge', 'bodyweight', true),
  ('glute-bridge', 'bodyweight', true),
  ('knee-push-up', 'bodyweight', true),
  ('incline-push-up', 'bodyweight', true),
  ('push-up', 'bodyweight', true),
  ('pike-push-up', 'bodyweight', true),
  ('standing-hip-hinge', 'bodyweight', true),
  ('step-up', 'bodyweight', true),
  ('calf-raise', 'bodyweight', true),
  ('dead-bug', 'bodyweight', true),
  ('bird-dog', 'bodyweight', true),
  ('plank', 'bodyweight', true),
  ('side-plank', 'bodyweight', true),
  ('prone-superman', 'bodyweight', true),
  ('march-in-place', 'bodyweight', true),
  ('dumbbell-goblet-squat', 'dumbbell', true),
  ('dumbbell-romanian-deadlift', 'dumbbell', true),
  ('dumbbell-bench-press', 'dumbbell', true),
  ('dumbbell-bench-press', 'bench', true),
  ('dumbbell-row', 'dumbbell', true),
  ('dumbbell-row', 'bench', true),
  ('dumbbell-shoulder-press', 'dumbbell', true),
  ('resistance-band-row', 'resistance_band', true),
  ('lat-pulldown-machine', 'lat_pulldown_machine', true),
  ('seated-cable-row', 'cable_machine', true),
  ('barbell-back-squat', 'barbell', true),
  ('barbell-bench-press', 'barbell', true),
  ('barbell-bench-press', 'bench', true),
  ('pull-up', 'pull_up_bar', true),
  ('kettlebell-swing', 'kettlebell', true),
  ('leg-press', 'leg_press_machine', true)
)
insert into public.exercise_equipment (exercise_id, equipment_id, required)
select e.id, eq.id, s.required
from staged s
join public.exercises e on e.slug = s.slug
join public.equipment eq on eq.key = s.equipment_key
on conflict (exercise_id, equipment_id) do nothing;

-- exercise_substitutions ------------------------------------------------------

with staged (slug, substitute_slug, similarity_score, relation_type) as (
  values
  ('knee-push-up', 'incline-push-up', 0.80, 'progression'),
  ('incline-push-up', 'knee-push-up', 0.80, 'regression'),
  ('incline-push-up', 'push-up', 0.75, 'progression'),
  ('push-up', 'incline-push-up', 0.75, 'regression'),
  ('bodyweight-squat', 'dumbbell-goblet-squat', 0.70, 'progression'),
  ('dumbbell-goblet-squat', 'bodyweight-squat', 0.70, 'regression'),
  ('dumbbell-goblet-squat', 'barbell-back-squat', 0.70, 'progression'),
  ('barbell-back-squat', 'dumbbell-goblet-squat', 0.70, 'regression'),
  ('standing-hip-hinge', 'dumbbell-romanian-deadlift', 0.65, 'progression'),
  ('dumbbell-romanian-deadlift', 'standing-hip-hinge', 0.65, 'regression'),
  ('dumbbell-romanian-deadlift', 'kettlebell-swing', 0.60, 'alternative'),
  ('kettlebell-swing', 'dumbbell-romanian-deadlift', 0.60, 'alternative'),
  ('seated-cable-row', 'resistance-band-row', 0.70, 'alternative'),
  ('resistance-band-row', 'seated-cable-row', 0.70, 'alternative'),
  ('seated-cable-row', 'dumbbell-row', 0.65, 'alternative'),
  ('dumbbell-row', 'seated-cable-row', 0.65, 'alternative'),
  ('lat-pulldown-machine', 'pull-up', 0.70, 'progression'),
  ('pull-up', 'lat-pulldown-machine', 0.70, 'regression'),
  ('dumbbell-bench-press', 'barbell-bench-press', 0.75, 'progression'),
  ('barbell-bench-press', 'dumbbell-bench-press', 0.75, 'regression'),
  ('dumbbell-shoulder-press', 'pike-push-up', 0.55, 'alternative'),
  ('pike-push-up', 'dumbbell-shoulder-press', 0.55, 'alternative'),
  ('leg-press', 'dumbbell-goblet-squat', 0.60, 'alternative'),
  ('dumbbell-goblet-squat', 'leg-press', 0.60, 'alternative'),
  ('leg-press', 'barbell-back-squat', 0.55, 'alternative'),
  ('barbell-back-squat', 'leg-press', 0.55, 'alternative')
)
insert into public.exercise_substitutions (exercise_id, substitute_exercise_id, similarity_score, relation_type)
select e.id, sub.id, s.similarity_score, s.relation_type
from staged s
join public.exercises e on e.slug = s.slug
join public.exercises sub on sub.slug = s.substitute_slug
on conflict (exercise_id, substitute_exercise_id) do nothing;

-- exercise_restrictions -------------------------------------------------------
-- Minimal, genuine v1 mapping of existing submit_safety_screening restriction
-- codes (20260724080100_onboarding_rpc_functions.sql) to this catalogue.
-- 'exclude' rows are enforced as a hard filter by the programme engine;
-- 'modify' rows are informational for v1 (no automated modification logic
-- yet — documented in docs/DEFERRED.md).

with staged (slug, restriction_code, effect, notes) as (
  values
  ('side-plank', 'dizziness_balance_risk', 'exclude',
   'Single-side static balance hold; excluded when balance/dizziness risk is flagged.'),
  ('bird-dog', 'dizziness_balance_risk', 'modify',
   'Lower balance demand than a standing exercise; can be performed against a wall for extra support.'),
  ('pull-up', 'joint_or_bone_limitation', 'modify',
   'High shoulder loading; a lat pulldown (this catalogue''s regression) is the safer default when a joint/bone limitation is flagged.')
)
insert into public.exercise_restrictions (exercise_id, restriction_code, effect, notes)
select e.id, s.restriction_code, s.effect, s.notes
from staged s
join public.exercises e on e.slug = s.slug;
