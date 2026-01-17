// lib/quizManager.ts

// --- DATA IMPORTS ---
import grammarTopicTests from '@/data/grammar_topic_tests.json';
import levelTests from '@/data/english_test_questions.json';
import vocabTests from '@/data/vocabulary_b1_c1_test.json';
import ieltsGrammar from '@/data/ielts_grammar.json';

import ydsVocabulary from '@/data/yds_vocabulary.json';
import ydsGrammarQuestions from '@/data/yds_grammar.json';
import ydsPhrasals from '@/data/yds_phrasal_verbs.json';
import ydsReadingPassages from '@/data/yds_reading.json';
import ydsSynonyms from '@/data/yds_synonyms.json';
import ydsConjunctions from '@/data/yds_conjunctions.json';

// --- YDS EXAM DENEMELERİ (1..15) ---
import ydsExam1 from '@/data/yds_exam_questions.json';
import ydsExam2 from '@/data/yds_exam_questions_2.json';
// Not: Diğer 13 denemeyi eklediğinde buraya import etmelisin.
const YDS_EXAM_MAP: Record<string, any[]> = {
  '1': ydsExam1,
  '2': ydsExam2,
};

// --- TYPES ---
export interface StandardQuestion {
  id: string;
  prompt: string;
  choices: { id: string; text: string; isCorrect: boolean }[];
  explanation?: string;
}

// --- HELPERS ---
function shuffleArray<T>(arr: T[]): T[] {
  // (Genel kullanım için random kalabilir; SEO kritik yerlerde seeded kullanıyoruz)
  return [...arr].sort(() => Math.random() - 0.5);
}

// SEO İçin Kritik: Google botu her geldiğinde aynı soruları görsün diye Sabit Rastgelelik (LCG)
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seededUniqueIndices(total: number, need: number, seed: number) {
  const rand = lcg(seed);
  const picked = new Set<number>();
  while (picked.size < Math.min(need, total)) {
    picked.add(Math.floor(rand() * total));
  }
  return Array.from(picked);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rand = lcg(seed);
  // Fisher-Yates
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// --- MAPPINGS ---
const grammarSlugToTag: Record<string, string> = {
  'test-perfect-past': 'perfect_tenses',
  'test-conditionals': 'conditionals',
  'test-relatives': 'relative_clauses',
  'test-articles': 'articles',
  'test-tenses-mixed': 'mixed_tenses',
  'test-passive-voice': 'passive_voice_adv',
  'test-reported-speech': 'reported_speech',
  'test-gerunds-infinitives': 'gerunds_infinitives',
  'test-clauses-advanced': 'clauses_advanced',
  'test-modals-advanced': 'modals_advanced',
  'test-prepositions-advanced': 'prepositions_advanced',
};

const grammarTitleMap: Record<string, string> = {
  'test-perfect-past': 'Perfect Tenses',
  'test-conditionals': 'Conditionals',
  'test-relatives': 'Relative Clauses',
  'test-articles': 'Articles',
  'test-tenses-mixed': 'Mixed Tenses',
  'test-passive-voice': 'Passive Voice (Adv)',
  'test-reported-speech': 'Reported Speech (Adv)',
  'test-gerunds-infinitives': 'Gerunds & Infinitives',
  'test-clauses-advanced': 'Noun/Adj/Adv Clauses',
  'test-modals-advanced': 'Modal Verbs (Adv)',
  'test-prepositions-advanced': 'Prepositions (Adv)',
};

// --- MAIN FUNCTION ---
export const getQuestionsBySlug = (
  slug: string
): { title: string; duration: number; questions: StandardQuestion[] } => {
  let rawQuestions: any[] = [];
  let title = 'English Practice Test';
  let duration = 30; // Varsayılan süre (dakika)

  // 1) YDS 3850 MINI VOCAB TESTS (yds-3850-mini-1 .. 77)
  // Geriye dönük: yds-3750-mini-... slug’larını da kabul ediyoruz.
  if (slug.startsWith('yds-3850-mini-') || slug.startsWith('yds-3750-mini-')) {
    const nRaw = parseInt(slug.split('-').pop() || '1', 10);
    const n = Number.isFinite(nRaw) ? clampInt(nRaw, 1, 77) : 1;

    const pool = ydsVocabulary as any[];
    const indices = seededUniqueIndices(pool.length, 50, 1000 + n * 9991); // Sabit seed

    title = `YDS 3850 Words - Mini Test ${n}`;
    duration = 25;

    rawQuestions = indices.map((i) => {
      const item = pool[i];

      // Distractor havuzu (aynı meaning hariç)
      const dPool = pool.filter((x) => x.meaning !== item.meaning);

      // ✅ Distractor seçimi seeded (SEO tutarlı)
      const rand2 = lcg(5000 + n * 777 + i);
      const picked = new Set<number>();
      while (picked.size < Math.min(3, dPool.length)) {
        picked.add(Math.floor(rand2() * dPool.length));
      }
      const selectedDistractors = Array.from(picked).map((idx) => dPool[idx]?.meaning).filter(Boolean);

      // ✅ Şık karıştırma da seeded (SEO tutarlı)
      const baseChoices = [item.meaning, ...selectedDistractors];
      const shuffledChoices = seededShuffle(baseChoices, 9000 + n * 111 + i);

      const letterIds = ['a', 'b', 'c', 'd'];
      const choices = shuffledChoices.slice(0, 4).map((text, idx) => ({
        id: letterIds[idx],
        text,
        isCorrect: text === item.meaning,
      }));

      return {
        id: `yds3850-mini-${n}-v-${i}`,
        prompt: `What is the Turkish meaning of **"${item.word}"**?`,
        choices,
        explanation: `**${item.word}** means **${item.meaning}**.`,
      };
    });

    return { title, duration, questions: rawQuestions as StandardQuestion[] };
  }

  // 2) YDS REAL EXAM PACK (yds-exam-test-1 .. 15)
  else if (slug.startsWith('yds-exam-test-')) {
    const num = slug.split('-').pop() || '1';
    rawQuestions = YDS_EXAM_MAP[num] || [];
    title = `YDS Real Exam - Mock Test ${num}`;
    duration = 150;
  }

  // 3) GRAMMAR FOCUS TESTLERİ
  else if (grammarSlugToTag[slug]) {
    const tag = grammarSlugToTag[slug];
    rawQuestions = (grammarTopicTests as any[]).filter((q) => q.tags?.includes(tag)).slice(0, 20);
    title = (grammarTitleMap[slug] || 'Grammar') + ' Practice';
    duration = 30;
  }

  // 4) CEFR LEVEL TESTLERİ (level-a1 .. level-c2)
  else if (slug.startsWith('level-')) {
    const targetLevel = slug.replace('level-', '').toUpperCase();
    rawQuestions = (levelTests as any[]).filter((q) => q.level === targetLevel).slice(0, 20);
    title = `${targetLevel} Level Assessment`;
    duration = 20;
  }

  // 5) DİĞER ÖZEL TESTLER
  else if (slug === 'ielts-grammar') {
    rawQuestions = ieltsGrammar;
    title = 'IELTS Grammar (Advanced)';
    duration = 45;
  } else if (slug === 'grammar-mega-test-100') {
    rawQuestions = shuffleArray(grammarTopicTests).slice(0, 100);
    title = 'Grammar Mega Test (100Q)';
    duration = 90;
  } else if (slug === 'vocab-b1-c1-50') {
    rawQuestions = shuffleArray(vocabTests).slice(0, 50);
    title = 'Vocabulary Challenge (B1-C1)';
    duration = 40;
  } else if (slug === 'quick-placement') {
    rawQuestions = shuffleArray(levelTests).slice(0, 25);
    title = 'Quick Placement Test';
    duration = 15;
  } else if (slug === 'yds-reading') {
    rawQuestions = ydsReadingPassages; // Not: Reading için özel render gerekebilir
    title = 'YDS Reading Comprehension';
    duration = 80;
  } else if (slug === 'yds-phrasal-verbs') {
    rawQuestions = shuffleArray(ydsPhrasals).slice(0, 50);
    title = 'YDS Phrasal Verbs Practice';
    duration = 40;
  } else if (slug === 'yds-synonyms') {
    rawQuestions = shuffleArray(ydsSynonyms).slice(0, 50);
    title = 'YDS Synonyms Practice';
    duration = 40;
  } else if (slug === 'yds-conjunctions') {
    rawQuestions = shuffleArray(ydsConjunctions).slice(0, 50);
    title = 'YDS Conjunctions (Bağlaçlar)';
    duration = 35;
  } else if (slug === 'yds-grammar') {
    rawQuestions = shuffleArray(ydsGrammarQuestions).slice(0, 50);
    title = 'YDS Grammar Practice';
    duration = 45;
  } else {
    // Fallback
    rawQuestions = (levelTests as any[]).slice(0, 10);
    title = 'English Practice';
    duration = 15;
  }

  // --- FORMATLAMA: TÜM VERİLERİ STANDART StandardQuestion FORMATINA ÇEVİR ---
  const formattedQuestions: StandardQuestion[] = rawQuestions.map((q, index) => {
    const prompt = q.prompt || q.question || q.text || 'Question missing?';
    let choices: any[] = [];

    // Format 1: A, B, C, D, E alanları varsa (Grammar/Exam)
    if (q.A !== undefined) {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const correctLetter = String(q.correct || q.answer || 'A').trim().toUpperCase();
      choices = letters
        .map((L) => ({
          id: L.toLowerCase(),
          text: q[L],
          isCorrect: correctLetter === L,
        }))
        .filter((c) => !!c.text);
    }
    // Format 2: options nesnesi varsa (IELTS)
    else if (q.options && !Array.isArray(q.options)) {
      const correctKey = String(q.correct_option || q.answer || 'A').trim().toUpperCase();
      choices = Object.keys(q.options).map((key) => ({
        id: String(key).toLowerCase(),
        text: q.options[key],
        isCorrect: String(key).toUpperCase() === correctKey,
      }));
    }
    // Format 3: choices array ise
    else if (Array.isArray(q.choices)) {
      choices = q.choices.map((c: any, i: number) => ({
        id: c.id || ['a', 'b', 'c', 'd'][i],
        text: c.text,
        isCorrect: !!c.isCorrect,
      }));
    }
    // Format 4: options array ise (levelTests gibi)
    else if (Array.isArray(q.options)) {
      const labels = ['a', 'b', 'c', 'd'];
      const opts = q.options.slice(0, 4);
      const rawAnswer = q.answer ?? q.correct_option ?? q.correct;

      let correctIndex = -1;
      if (typeof rawAnswer === 'number') {
        correctIndex = rawAnswer;
      } else if (typeof rawAnswer === 'string') {
        const byLetter = ['A', 'B', 'C', 'D'].indexOf(rawAnswer.toUpperCase());
        if (byLetter !== -1) correctIndex = byLetter;
        else correctIndex = opts.findIndex((o: any) => String(o) === rawAnswer);
      }

      choices = opts.map((opt: any, i: number) => ({
        id: labels[i],
        text: String(opt),
        isCorrect: i === correctIndex,
      }));
    }

    return {
      id: q.id || `${slug}-${index}`,
      prompt,
      choices,
      explanation: q.explanation,
    };
  });

  return { title, duration, questions: formattedQuestions };
};