// data/levels/b2_topics.ts

export type B2TopicSlug =
  | 'present-perfect-continuous'
  | 'past-perfect'
  | 'passive-voice'
  | 'second-conditional'
  | 'modals-deduction'
  | 'reported-speech-basic';

export type B2Topic = {
  slug: B2TopicSlug;
  title: string;
  description: string;
  questionCount: number;
};

export const b2Topics: B2Topic[] = [
  {
    slug: 'present-perfect-continuous',
    title: 'Present Perfect Continuous',
    description:
      'Talking about actions that started in the past and are still continuing, or whose results we can see now.',
    questionCount: 10,
  },
  {
    slug: 'past-perfect',
    title: 'Past Perfect (had + past participle)',
    description:
      'Describing one past action that happened before another past action.',
    questionCount: 10,
  },
  {
    slug: 'passive-voice',
    title: 'Passive Voice (Present & Past)',
    description:
      'Focusing on the action or object, not the person who does it.',
    questionCount: 10,
  },
  {
    slug: 'second-conditional',
    title: 'Second Conditional (If + past, would + verb)',
    description:
      'Talking about unreal or unlikely situations in the present or future.',
    questionCount: 10,
  },
  {
    slug: 'modals-deduction',
    title: 'Modal Verbs for Deduction (must, might, can’t)',
    description:
      'Making logical guesses about the present and past with must, might, could and can’t.',
    questionCount: 10,
  },
  {
    slug: 'reported-speech-basic',
    title: 'Reported Speech (Basic Statements & Questions)',
    description:
      'Reporting what people said using backshift of tenses and changing pronouns/time expressions.',
    questionCount: 10,
  },
];
