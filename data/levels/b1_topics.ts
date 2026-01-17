// data/levels/b1_topics.ts

export type B1TopicSlug =
  | 'present-perfect'
  | 'past-continuous'
  | 'present-perfect-vs-past-simple'
  | 'first-conditional'
  | 'modals-ability-permission-advice'
  | 'relative-clauses-basic';

export type B1Topic = {
  slug: B1TopicSlug;
  title: string;
  description: string;
  questionCount: number;
};

export const b1Topics: B1Topic[] = [
  {
    slug: 'present-perfect',
    title: 'Present Perfect (have/has + past participle)',
    description:
      'Talking about life experience, recent actions and unfinished time periods.',
    questionCount: 10,
  },
  {
    slug: 'past-continuous',
    title: 'Past Continuous (was/were + -ing)',
    description:
      'Describing actions in progress at a specific moment in the past.',
    questionCount: 10,
  },
  {
    slug: 'present-perfect-vs-past-simple',
    title: 'Present Perfect vs Past Simple',
    description:
      'Choosing between finished past time and life experience / results now.',
    questionCount: 10,
  },
  {
    slug: 'first-conditional',
    title: 'First Conditional (If + present, will + verb)',
    description:
      'Talking about real and possible future situations and their results.',
    questionCount: 10,
  },
  {
    slug: 'modals-ability-permission-advice',
    title: 'Modal Verbs (Ability, Permission, Advice)',
    description:
      'Using can, could, may, might, should, ought to for ability, permission and advice.',
    questionCount: 10,
  },
  {
    slug: 'relative-clauses-basic',
    title: 'Relative Clauses (who, which, that, where)',
    description:
      'Joining sentences with who, which, that, where to give extra information.',
    questionCount: 10,
  },
];

