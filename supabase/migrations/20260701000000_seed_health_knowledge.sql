-- Seed the health_knowledge table used by the AI assistant (chat-rag) for retrieval.
-- Plain-language, evidence-aware, non-diagnostic guidance. Safe to re-run: it clears
-- prior seeded rows by title before inserting.

delete from public.health_knowledge
where title in (
  'Understanding your resting heart rate',
  'Blood oxygen (SpO2): what the numbers mean',
  'Blood pressure basics',
  'Recognising the signs of a medical emergency',
  'Staying active: daily steps and movement',
  'Sleep and your health',
  'Managing stress day to day',
  'Staying hydrated',
  'Heart-healthy eating',
  'When a fever needs attention',
  'Understanding heart rate variability (HRV)',
  'Taking medication safely'
);

insert into public.health_knowledge (title, category, content, tags) values
(
  'Understanding your resting heart rate',
  'heart_rate',
  'A typical resting heart rate for adults is 60–100 beats per minute (bpm); well-trained athletes may sit at 40–60. Consistently above 100 at rest (tachycardia) or below 60 without being fit (bradycardia) is worth discussing with a clinician, especially if it comes with dizziness, chest discomfort, or shortness of breath. Caffeine, stress, dehydration, fever, and some medications can temporarily raise it.',
  array['heart rate','bpm','pulse','tachycardia','bradycardia','resting']
),
(
  'Blood oxygen (SpO2): what the numbers mean',
  'spo2',
  'SpO2 measures how much oxygen your blood is carrying. 95–100% is generally normal. Readings of 92–94% may warrant attention, and below 92% (or a sudden drop) can be a sign to seek care, particularly with breathlessness, confusion, or bluish lips. Cold hands, poor sensor contact, and nail polish can cause falsely low wearable readings — re-measure before worrying.',
  array['spo2','oxygen','blood oxygen','saturation','breathing']
),
(
  'Blood pressure basics',
  'blood_pressure',
  'Blood pressure is written as systolic/diastolic (e.g. 120/80 mmHg). Normal is around 120/80. Elevated is 120–129 systolic; stage 1 hypertension is 130–139/80–89; stage 2 is 140/90 or higher. A reading of 180/120 or above with symptoms (chest pain, severe headache, vision changes, trouble speaking) is a hypertensive emergency — seek immediate care. Single high readings happen; trends over time matter most.',
  array['blood pressure','hypertension','systolic','diastolic','mmHg']
),
(
  'Recognising the signs of a medical emergency',
  'emergency',
  'Call emergency services immediately for: chest pain or pressure lasting more than a few minutes; sudden weakness or numbness on one side, facial drooping, or slurred speech (signs of stroke — remember FAST: Face, Arms, Speech, Time); severe difficulty breathing; fainting or unresponsiveness; or severe uncontrolled bleeding. When in doubt about a possible emergency, do not wait — get professional help.',
  array['emergency','stroke','heart attack','chest pain','FAST','urgent','911']
),
(
  'Staying active: daily steps and movement',
  'activity',
  'Most adults benefit from at least 150 minutes of moderate activity per week, plus muscle-strengthening twice weekly. A common daily-step goal is 7,000–10,000, but any increase over your current baseline helps. If you sit for long stretches, brief walking breaks improve circulation and mood. Build up gradually and choose activities you enjoy so they stick.',
  array['steps','activity','exercise','movement','walking','fitness']
),
(
  'Sleep and your health',
  'sleep',
  'Most adults need 7–9 hours of sleep per night. Consistent sleep and wake times, a dark and cool room, and limiting screens and caffeine before bed all help. Ongoing trouble falling or staying asleep, loud snoring with pauses in breathing, or daytime exhaustion despite enough time in bed are worth raising with a clinician.',
  array['sleep','rest','insomnia','sleep hygiene','fatigue']
),
(
  'Managing stress day to day',
  'wellness',
  'Short-term stress is normal, but chronic stress affects heart rate, blood pressure, sleep, and mood. Simple tools that help: paced breathing (e.g. inhale 4 seconds, exhale 6), regular movement, time outdoors, staying connected with people, and protecting sleep. If stress or low mood is persistent or interfering with daily life, reach out to a healthcare professional.',
  array['stress','anxiety','mental health','wellbeing','breathing','mood']
),
(
  'Staying hydrated',
  'wellness',
  'Water needs vary with body size, activity, climate, and health conditions, but a common guide is to drink enough that you rarely feel thirsty and your urine is pale yellow. Hydration supports circulation, temperature control, and concentration. Increase intake in heat or during exercise. Some heart or kidney conditions require fluid limits — follow your clinician''s advice if so.',
  array['hydration','water','fluids','dehydration']
),
(
  'Heart-healthy eating',
  'nutrition',
  'Eating patterns that support heart health emphasise vegetables, fruit, whole grains, legumes, nuts, fish, and healthy oils, while limiting added salt, added sugar, and heavily processed foods. Reducing sodium can help blood pressure. Small, sustainable changes tend to work better than restrictive diets. A dietitian can tailor guidance to your needs.',
  array['nutrition','diet','heart healthy','salt','sodium','food']
),
(
  'When a fever needs attention',
  'body_temp',
  'Normal body temperature is around 37°C (98.6°F), varying by person and time of day. A fever is generally 38°C (100.4°F) or higher. Rest and fluids help most mild fevers. Seek care for a fever above 39.4°C (103°F), a fever lasting more than a few days, or fever with a stiff neck, severe headache, difficulty breathing, confusion, rash, or dehydration.',
  array['fever','temperature','body temp','infection']
),
(
  'Understanding heart rate variability (HRV)',
  'hrv',
  'HRV is the variation in time between heartbeats. Higher HRV generally reflects good recovery and a well-balanced nervous system; lower HRV can accompany stress, poor sleep, illness, or overtraining. HRV is highly individual, so compare against your own baseline over time rather than to other people. A single low reading is rarely meaningful on its own.',
  array['hrv','heart rate variability','recovery','stress','training']
),
(
  'Taking medication safely',
  'medication',
  'Take medications exactly as prescribed — right dose, right time, and for the full course when directed. Do not stop, change, or double up on doses without advice from your clinician or pharmacist. Keep an up-to-date list of everything you take (including supplements) to avoid interactions, and ask your pharmacist if you are unsure about timing, food, or side effects.',
  array['medication','prescription','dosage','pharmacy','adherence']
);
