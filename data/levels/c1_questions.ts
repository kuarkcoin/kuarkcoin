// data/levels/c1_questions.ts
import type { C1TopicSlug } from './c1_topics';

export type C1Question = {
  id: string;
  level: 'C1';
  topic: C1TopicSlug;
  question: string;
  options: string[];
  correctIndex: number;
};

export const c1Questions: C1Question[] = [
  // MIXED CONDITIONALS (10 soru)
  {
    id: 'c1-mixed-1',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If I had taken that job in London, I ___ in a very different situation now.',
    options: [
      'am',
      'would be',
      'would have been',
      'will be',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-2',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'She wouldn’t be so tired now if she ___ to bed earlier last night.',
    options: [
      'went',
      'had gone',
      'would go',
      'has gone',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-3',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If he weren’t so stubborn, he ___ the argument yesterday.',
    options: [
      'wouldn’t lose',
      'wouldn’t have lost',
      'hadn’t lost',
      'won’t have lost',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-4',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If they had listened to the advice, they ___ facing such serious problems now.',
    options: [
      'wouldn’t be',
      'won’t be',
      'wouldn’t have been',
      'aren’t',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-mixed-5',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If I ___ more organised, I wouldn’t have missed the deadline last week.',
    options: [
      'were',
      'had been',
      'am',
      'would be',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-mixed-6',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If she had grown up in the countryside, she probably ___ so scared of insects now.',
    options: [
      'isn’t',
      'wouldn’t be',
      'wouldn’t have been',
      'wasn’t',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-7',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'He wouldn’t have failed the exam if he ___ more serious about his studies.',
    options: [
      'were',
      'had been',
      'would be',
      'has been',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-8',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If the weather were warmer, we ___ on the beach instead of sitting inside all day.',
    options: [
      'would have sat',
      'would sit',
      'sat',
      'had sat',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-9',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'If I hadn’t met you, my life ___ completely different now.',
    options: [
      'is',
      'would be',
      'would have been',
      'was',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-mixed-10',
    level: 'C1',
    topic: 'mixed-conditionals',
    question:
      'She’d be earning much more money now if she ___ that promotion two years ago.',
    options: [
      'accepted',
      'would accept',
      'had accepted',
      'has accepted',
    ],
    correctIndex: 2,
  },

  // WISH / IF ONLY (10 soru)
  {
    id: 'c1-wish-1',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'I wish I ___ so much money on things I don’t really need.',
    options: [
      'don’t spend',
      'didn’t spend',
      'hadn’t spent',
      'wouldn’t spend',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-2',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'If only we ___ earlier; now we’re going to be late.',
    options: [
      'left',
      'had left',
      'would leave',
      'have left',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-3',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'She wishes she ___ more confident when speaking in public.',
    options: [
      'was',
      'were',
      'had been',
      'would be',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-4',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'I wish you ___ interrupt me when I’m talking.',
    options: [
      'didn’t',
      'hadn’t',
      'wouldn’t',
      'won’t',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-wish-5',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'If only I ___ my phone at home; now I can’t call anyone.',
    options: [
      'don’t forget',
      'hadn’t forgotten',
      'didn’t forget',
      'wouldn’t forget',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-6',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'I wish it ___ so cold today; I’d love to go for a walk.',
    options: [
      'isn’t',
      'wasn’t',
      'hadn’t been',
      'weren’t',
    ],
    correctIndex: 3,
  },
  {
    id: 'c1-wish-7',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'He wishes he ___ what he said during the meeting.',
    options: [
      'didn’t say',
      'hadn’t said',
      'wouldn’t say',
      'hasn’t said',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-8',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'If only people ___ more carefully before sharing things online.',
    options: [
      'think',
      'thought',
      'had thought',
      'would think',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-wish-9',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'I wish I ___ up earlier; now I don’t have time for breakfast.',
    options: [
      'got',
      'had got',
      'would get',
      'get',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-wish-10',
    level: 'C1',
    topic: 'wish-if-only',
    question:
      'If only you ___ to me instead of ignoring my messages.',
    options: [
      'replied',
      'had replied',
      'would reply',
      'reply',
    ],
    correctIndex: 2,
  },

  // INVERSION FOR EMPHASIS (10 soru)
  {
    id: 'c1-inv-1',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Only after the meeting ___ how serious the situation was.',
    options: [
      'I realised',
      'did I realise',
      'I had realised',
      'had I realised',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-2',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Under no circumstances ___ this door to be left unlocked.',
    options: [
      'you must allow',
      'must you allow',
      'you should allow',
      'should you allowing',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-3',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Hardly ___ the room when the fire alarm went off.',
    options: [
      'we entered',
      'had we entered',
      'we had entered',
      'did we enter',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-4',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Not until much later ___ the real reason for his behaviour.',
    options: [
      'we understood',
      'did we understand',
      'we had understood',
      'had we understood',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-5',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Seldom ___ such an impressive performance.',
    options: [
      'I have seen',
      'have I seen',
      'I saw',
      'did I see',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-6',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'No sooner ___ the announcement than people started complaining.',
    options: [
      'they heard',
      'did they hear',
      'had they heard',
      'they had heard',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-inv-7',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Rarely ___ such a challenging exam.',
    options: [
      'students were given',
      'were students given',
      'students had been given',
      'had students been given',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-8',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'At no time ___ to sign any legal documents.',
    options: [
      'I was asked',
      'was I asked',
      'I had been asked',
      'had I asked',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-inv-9',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Only when the storm stopped ___ the mountain.',
    options: [
      'were we able to leave',
      'we were able to leave',
      'had we been able to leave',
      'we had been able to leave',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-inv-10',
    level: 'C1',
    topic: 'inversion-emphasis',
    question:
      'Little ___ that this decision would change his life completely.',
    options: [
      'he knew',
      'did he know',
      'had he known',
      'he had known',
    ],
    correctIndex: 1,
  },

  // PARTICIPLE CLAUSES (10 soru)
  {
    id: 'c1-part-1',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ the instructions carefully, she started assembling the furniture.',
    options: [
      'Read',
      'Reading',
      'Having read',
      'Having been read',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-part-2',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      'Not ___ what to do, he decided to call customer service.',
    options: [
      'knowing',
      'known',
      'to know',
      'having known',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-part-3',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ in traffic for over two hours, they arrived exhausted.',
    options: [
      'Being stuck',
      'Stuck',
      'Having stuck',
      'To be stuck',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-part-4',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      'Having been told the news, ___ to make a decision immediately.',
    options: [
      'they were expected',
      'it was expected of them',
      'they expected',
      'they were expecting',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-part-5',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ his homework, he went out to meet his friends.',
    options: [
      'Finished',
      'Having finished',
      'Being finished',
      'To finish',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-part-6',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      'The conference, ___ next month, has already sold out.',
    options: [
      'to hold',
      'being held',
      'held',
      'having held',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-part-7',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ more carefully, you wouldn’t have made so many mistakes.',
    options: [
      'You checked',
      'If you had checked',
      'Having checked',
      'Had you checked',
    ],
    correctIndex: 3,
  },
  {
    id: 'c1-part-8',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ the room, she noticed that someone had opened the window.',
    options: [
      'Entering',
      'Entered',
      'Being entered',
      'Having entering',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-part-9',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      '___ so much experience, he was the ideal person for the job.',
    options: [
      'Having had',
      'Having',
      'Had',
      'Has had',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-part-10',
    level: 'C1',
    topic: 'participle-clauses',
    question:
      'The road ___ by heavy snow, the village was completely cut off.',
    options: [
      'blocked',
      'blocking',
      'being blocked',
      'having blocked',
    ],
    correctIndex: 0,
  },

  // CLEFT SENTENCES (10 soru)
  {
    id: 'c1-cleft-1',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      '___ that first got me interested in linguistics.',
    options: [
      'It was reading that book',
      'What was reading that book',
      'Reading that book was',
      'That book it was',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-cleft-2',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'It was ___ caused all the confusion.',
    options: [
      'he who',
      'him who',
      'he which',
      'who he',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-cleft-3',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'What I really need right now ___ a good night’s sleep.',
    options: [
      'is',
      'it is',
      'was',
      'it was',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-cleft-4',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'It was in Paris ___ we first met.',
    options: [
      'which',
      'where',
      'that',
      'when',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-cleft-5',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      '___ I find most annoying is the way he always interrupts people.',
    options: [
      'It what',
      'What',
      'That',
      'Which',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-cleft-6',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'It was not until last year ___ I finally learned to drive.',
    options: [
      'when',
      'that',
      'which',
      'where',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-cleft-7',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'What surprised me most ___ how calm she was.',
    options: [
      'was',
      'it was',
      'that it was',
      'has been',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-cleft-8',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'It was ___ the manager spoke to, not the assistant.',
    options: [
      'me who',
      'me whom',
      'I whom',
      'I who',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-cleft-9',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'What I’d like to do this weekend ___ absolutely nothing.',
    options: [
      'be',
      'being',
      'is',
      'to be',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-cleft-10',
    level: 'C1',
    topic: 'cleft-sentences',
    question:
      'It was her determination ___ made the project a success.',
    options: [
      'which',
      'who',
      'what',
      'that',
    ],
    correctIndex: 3,
  },

  // ADVANCED RELATIVE CLAUSES (10 soru)
  {
    id: 'c1-rel-1',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The conference, ___ was held in Berlin, attracted experts from all over the world.',
    options: [
      'that',
      'which',
      'where',
      'who',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-rel-2',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'Students ___ native language is not English often struggle with articles.',
    options: [
      'whose',
      'who',
      'which',
      'that',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-rel-3',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The company for ___ I used to work has moved to another country.',
    options: [
      'which',
      'that',
      'whom',
      'who',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-rel-4',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'He showed me the report, ___ I had already read.',
    options: [
      'that',
      'which',
      'what',
      'whose',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-rel-5',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'Anyone ___ arrives late will have to wait outside.',
    options: [
      'who',
      'whom',
      'whose',
      'which',
    ],
    correctIndex: 0,
  },
  {
    id: 'c1-rel-6',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The man to ___ you spoke is my supervisor.',
    options: [
      'who',
      'that',
      'whom',
      'which',
    ],
    correctIndex: 2,
  },
  {
    id: 'c1-rel-7',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'I don’t like the way ___ he talks to people.',
    options: [
      'that',
      'which',
      'what',
      '—',
    ],
    correctIndex: 3,
  },
  {
    id: 'c1-rel-8',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The building ___ windows were broken has now been repaired.',
    options: [
      'which',
      'whose',
      'that',
      'its',
    ],
    correctIndex: 1,
  },
  {
    id: 'c1-rel-9',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The reason ___ he left the company is still unclear.',
    options: [
      'that',
      'why',
      'which',
      'for which',
    ],
    correctIndex: 3,
  },
  {
    id: 'c1-rel-10',
    level: 'C1',
    topic: 'advanced-relative-clauses',
    question:
      'The people living next door, ___ are both doctors, have just had a baby.',
    options: [
      'who',
      'that',
      'which',
      'whom',
    ],
    correctIndex: 0,
  },
];

