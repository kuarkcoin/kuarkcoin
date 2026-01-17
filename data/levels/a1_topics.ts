// data/levels/a1_topics.ts

export type A1TopicSlug =
  | 'present-simple'
  | 'verb-to-be'
  | 'a-an'
  | 'this-that-these-those'
  | 'prepositions-of-place'
  | 'possessive-adjectives';

export type A1Topic = {
  slug: A1TopicSlug;
  title: string;
  description: string;
  questionCount: number;
};

export const a1Topics: A1Topic[] = [
  {
    slug: 'present-simple',
    title: 'Present Simple (Daily Routines)',
    description: 'He/She/They, do/does, simple habits and routines.',
    questionCount: 10,
  },
  {
    slug: 'verb-to-be',
    title: 'Verb “to be” (am / is / are)',
    description: 'Basic sentences with am, is, are – positive & negative.',
    questionCount: 10,
  },
  {
    slug: 'a-an',
    title: 'Articles: a / an',
    description: 'When to use “a” and “an” with easy nouns.',
    questionCount: 10,
  },
  {
    slug: 'this-that-these-those',
    title: 'This / That / These / Those',
    description: 'Near & far, singular & plural objects.',
    questionCount: 10,
  },
  {
    slug: 'prepositions-of-place',
    title: 'Prepositions of Place',
    description: 'in, on, under, next to, behind, between…',
    questionCount: 10,
  },
  {
    slug: 'possessive-adjectives',
    title: 'Possessive Adjectives',
    description: 'my, your, his, her, our, their.',
    questionCount: 10,
  },
];
