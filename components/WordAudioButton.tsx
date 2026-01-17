"use client";

import { Volume2 } from "lucide-react"; // Eğer lucide-react yüklü değilse aşağıya bakın

export default function WordAudioButton({ word }: { word: string }) {
  const playSound = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <button 
      onClick={playSound}
      className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full transition-all inline-flex items-center justify-center"
      title="Telaffuzu Dinle"
    >
      {/* Lucide-react yoksa direkt SVG kullanabilirsiniz */}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    </button>
  );
}
