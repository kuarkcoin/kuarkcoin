'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// --- FORMAT TEXT HELPER (Aynı görünüm için) ---
function formatText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      let content = part.slice(2, -2).replace(/^['"]+|['"]+$/g, '');
      return (
        <span key={index} className="bg-blue-100 text-blue-700 font-extrabold px-3 py-1 rounded-lg mx-1 border border-blue-200 shadow-sm inline-block transform -translate-y-0.5 tracking-wide">
          {content}
        </span>
      );
    }
    return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
  });
}

export default function MyMistakesPage() {
  const [mistakes, setMistakes] = useState<any[]>([]);

  useEffect(() => {
    // Sayfa açılınca LocalStorage'dan hataları çek
    const raw = localStorage.getItem('my_mistakes');
    if (raw) {
      setMistakes(JSON.parse(raw).reverse()); // En son eklenen en üstte görünsün
    }
  }, []);

  const clearMistakes = () => {
    if (confirm('Are you sure you want to clear your mistake history?')) {
      localStorage.removeItem('my_mistakes');
      setMistakes([]);
    }
  };

  const removeMistake = (id: string) => {
    const newMistakes = mistakes.filter((m) => m.id !== id);
    setMistakes(newMistakes);
    localStorage.setItem('my_mistakes', JSON.stringify(newMistakes));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span>📕</span> My Mistakes
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review and learn from your past errors.
            </p>
          </div>
          <div className="flex gap-3">
             <Link href="/" className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
               Go Home
             </Link>
             {mistakes.length > 0 && (
               <button 
                 onClick={clearMistakes} 
                 className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100"
               >
                 Clear All
               </button>
             )}
          </div>
        </div>

        {/* LIST */}
        {mistakes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-slate-700">No mistakes found!</h3>
            <p className="text-slate-400">Great job. Go solve some tests.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {mistakes.map((q, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                {/* Delete Button (Hover) */}
                <button 
                  onClick={() => removeMistake(q.id)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-2"
                  title="Remove this question"
                >
                  ✕
                </button>

                <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                  {q.testTitle || 'Test Question'}
                </div>

                <div className="text-lg font-medium text-slate-800 mb-5 leading-loose">
                  {formatText(q.prompt)}
                </div>

                {/* Show Options - Highlight Correct Answer */}
                <div className="grid gap-2 opacity-90">
                  {q.choices.map((c: any) => {
                    // Doğru cevap mı? (Verideki flag veya id kontrolü)
                    const isCorrect = c.isCorrect || 
                                      c.id === q.correctChoiceId || 
                                      c.id === q.correct ||
                                      c.id === q.answer;
                    
                    // Kullanıcının yanlış verdiği cevap mı?
                    const isMyWrongAnswer = c.id === q.myWrongAnswer;

                    let style = "p-3 rounded-lg border flex items-center gap-3 ";
                    if (isCorrect) style += "bg-green-50 border-green-200 text-green-800 font-bold";
                    else if (isMyWrongAnswer) style += "bg-red-50 border-red-200 text-red-800 line-through opacity-70";
                    else style += "bg-slate-50 border-slate-100 text-slate-400 text-sm";

                    return (
                      <div key={c.id} className={style}>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${isCorrect ? 'bg-green-500 text-white border-green-500' : 'border-slate-300'}`}>
                           {isCorrect ? '✓' : c.id}
                         </div>
                         <span>{c.text}</span>
                      </div>
                    )
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                     <div className="text-sm text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
                       <span className="font-bold">💡 Explanation:</span> {q.explanation}
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
