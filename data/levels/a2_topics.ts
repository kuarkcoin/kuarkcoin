// data/levels/a2_topics.ts

export type A2TopicSlug =
  | 'past-simple'
  | 'present-continuous'
  | 'countable-uncountable'
  | 'comparatives-superlatives'
  | 'some-any-a-lot-of'
  | 'adverbs-of-frequency';

export type A2Topic = {
  slug: A2TopicSlug;
  title: string;
  description: string;
  questionCount: number;
};

export const a2Topics: A2Topic[] = [
  {
    slug: 'past-simple',
    title: 'Past Simple (regular & irregular verbs)',
    description: 'Yesterday, last week, ago – talking about finished actions in the past.',
    questionCount: 10,
  },
  {
    slug: 'present-continuous',
    title: 'Present Continuous (now & current plans)',
    description: 'am/is/are + -ing for actions happening now or around now.',
    questionCount: 10,
  },
  {
    slug: 'countable-uncountable',
    title: 'Countable & Uncountable Nouns',
    description: 'Much / many, a few / a little, some / any with countable and uncountable nouns.',
    questionCount: 10,
  },
  {
    slug: 'comparatives-superlatives',
    title: 'Comparatives & Superlatives',
    description: 'Bigger, more interesting, the most important – comparing people and things.',
    questionCount: 10,
  },
  {
    slug: 'some-any-a-lot-of',
    title: 'Some / Any / A lot of',
    description: 'Using some, any, a lot of in positive, negative and question forms.',
    questionCount: 10,
  },
  {
    slug: 'adverbs-of-frequency',
    title: 'Adverbs of Frequency',
    description: 'Always, usually, often, sometimes, never with present simple.',
    questionCount: 10,
  },
];