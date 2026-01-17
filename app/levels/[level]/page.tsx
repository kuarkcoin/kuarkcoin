'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { a1Topics } from '@/data/levels/a1_topics';
import { a2Topics } from '@/data/levels/a2_topics';
import { b1Topics } from '@/data/levels/b1_topics';
import { b2Topics } from '@/data/levels/b2_topics';
import { c1Topics } from '@/data/levels/c1_topics';
import { c2Topics } from '@/data/levels/c2_topics';

type RouteParams = {
  level?: string | string[];
};

export default function LevelPage() {
  const params = useParams() as RouteParams;
  const levelParam = Array.isArray(params.level) ? params.level[0] : params.level || '';
  const level = levelParam.toUpperCase(); // "A1", "A2", ..., "C2"

  const isA1 = level === 'A1';
  const isA2 = level === 'A2';
  const isB1 = level === 'B1';
  const isB2 = level === 'B2';
  const isC1 = level === 'C1';
  const isC2 = level === 'C2';

  // hangi levele hangi topic listesi
  const topics =
    isA1 ? a1Topics :
    isA2 ? a2Topics :
    isB1 ? b1Topics :
    isB2 ? b2Topics :
    isC1 ? c1Topics :
    isC2 ? c2Topics :
    [];

  const hasTopics = topics.length > 0;

  const mixedTestSlug = `level-${level.toLowerCase()}`; // level-a1, level-c2 vs.

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
          {level} Level Grammar Tests
        </h1>

        <p className="text-slate-600 mb-6">
          Practise key grammar structures for level {level}. Start a complete mixed test
          or choose a specific topic.
        </p>

        {/* Mixed Test butonu */}
        <div className="mb-8">
          <Link
            href={`/start?testSlug=${mixedTestSlug}`}
            className="block w-full text-center bg-slate-900 text-white font-semibold py-4 rounded-2xl shadow-lg hover:bg-slate-800"
          >
            {isA1 && '⭐ Start A1 Mixed Test'}
            {isA2 && '⭐ Start A2 Mixed Test'}
            {isB1 && '⭐ Start B1 Mixed Test'}
            {isB2 && '⭐ Start B2 Mixed Test'}
            {isC1 && '⭐ Start C1 Mixed Test'}
            {isC2 && '⭐ Start C2 Mixed Test'}
            {!isA1 && !isA2 && !isB1 && !isB2 && !isC1 && !isC2 && `Start ${level} Mixed Test`}
          </Link>
        </div>

        {/* Topic-based tests */}
        {hasTopics && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Topic-Based Tests ({level})
            </h2>
            <div className="space-y-3 mb-8">
              {topics.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/levels/${level.toLowerCase()}/${topic.slug}`}
                  className="block w-full text-center py-4 rounded-2xl border font-semibold bg-blue-50 border-blue-100 text-blue-800"
                >
                  {topic.title}
                </Link>
              ))}
            </div>
          </>
        )}

        <Link
          href="/"
          className="text-sm text-slate-600 hover:underline inline-flex items-center"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
