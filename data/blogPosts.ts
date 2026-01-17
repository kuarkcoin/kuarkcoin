// data/blogPosts.ts
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  image: string;
  contentHtml: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'advanced-grammar-mistakes',
    title: '10 Grammar Mistakes Even Advanced Learners Still Make',
    description:
      'Think your grammar is advanced? These 10 common mistakes still trap C1–C2 learners. See if you make any of them.',
    date: '2025-11-27',
    readingTime: '7 min read',
    image: '/images/blog/advanced_grammar_mistakes.jpg',
    contentHtml: `
      <p>Even advanced learners...</p>
    `,
  },

  {
    slug: 'c1-c2-grammar-test-most-people-score-6-10',
    title: 'Can You Pass This C1–C2 Grammar Test? Most People Score 6/10',
    description:
      'Think your English is advanced? Try this C1–C2 grammar challenge. Most learners score between 5 and 7 out of 10.',
    date: '2025-11-27',
    readingTime: '6 min read',
    image: '/images/blog/c1_c2_grammar_test.jpg',
    contentHtml: `
      <p>Many learners say...</p>
    `,
  },

  {
    slug: 'daily-grammar-quiz-improve-english-in-2-minutes',
    title: 'Daily Grammar Quiz – Improve Your English in 2 Minutes',
    description:
      'Build a daily habit with quick grammar questions. One short quiz a day can slowly transform your English.',
    date: '2025-11-27',
    readingTime: '5 min read',
    image: '/images/blog/daily_grammar_quiz.jpg',
    contentHtml: `
      <p>Improving your English...</p>
    `,
  },

  {
    slug: 'ielts-grammar-tricks-you-need-to-know',
    title: 'IELTS Grammar Tricks You Need to Know',
    description:
      'Small grammar details can make a big difference in your IELTS score. Learn key structures examiners look for.',
    date: '2025-11-27',
    readingTime: '8 min read',
    image: '/images/blog/ielts_grammar_tricks.jpg',
    contentHtml: `
      <p>Many IELTS candidates...</p>
    `,
  },

  {
    slug: 'prepositions-advanced-learners-get-wrong',
    title: '20 Prepositions Advanced Learners Still Get Wrong',
    description:
      'Prepositions are small but dangerous. Here are 20 common mistakes and the correct forms for each one.',
    date: '2025-11-27',
    readingTime: '7 min read',
    image: '/images/blog/advanced_prepositions.jpg',
    contentHtml: `
      <p>Prepositions are...</p>
    `,
  },
];