'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
// Geçici tek soru verisi (Eve gidince 600 soruyu buraya atınca otomatik çalışır)
import allQuestions from '@/data/race_questions.json'

// --- SAHTE BOT İSİMLERİ (Sanki canlıymış gibi) ---
const FAKE_NAMES = [
  "Jessica M.", "David B.", "Sarah K.", "Michael R.", "Emma W.", 
  "Daniel P.", "Olivia S.", "James L.", "Sophia C.", "William H.",
  "Isabella F.", "Lucas G.", "Mia T.", "Benjamin D.", "Charlotte N."
];
  
export default function RaceArena() {
  // --- STATE'LER ---
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(50 * 60) // 50 Dakika
  const [gameState, setGameState] = useState<'LOADING' | 'PLAYING' | 'FINISHED'>('LOADING')
  
  // Canlı Katılımcı Sayısı (Sürekli değişecek)
  const [onlineCount, setOnlineCount] = useState(3420)
  
  // Sonuç Ekranı Verileri
  const [finalRank, setFinalRank] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [topList, setTopList] = useState<any[]>([])

  // --- 1. BAŞLANGIÇ AYARLARI ---
  useEffect(() => {
    // Soruları Karıştır (Shuffle) ve ilk 50'yi al
    // (Eğer 50'den az soru varsa hepsini alır, hata vermez)
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 50));
    setGameState('PLAYING');

    // Başlangıçta rastgele bir katılımcı sayısı belirle (2000 - 8000 arası)
    setOnlineCount(Math.floor(Math.random() * (8000 - 2000) + 2000));
  }, [])

  // --- 2. CANLI SAYAÇ EFEKTİ ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Sayıyı +5 ile -5 arasında rastgele değiştir
      setOnlineCount(prev => prev + Math.floor(Math.random() * 11) - 5);
    }, 2000);
    return () => clearInterval(interval);
  }, [])

  // --- 3. SAYAÇ ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // --- 4. CEVAP VERME ---
  const handleAnswer = (option: string) => {
    const currentQuestion = questions[currentQ];
    // JSON'daki doğru cevap "A", "Option A" vs. olabilir, temizliyoruz:
    const correct = currentQuestion.correct_option ? currentQuestion.correct_option.toString().charAt(0).toUpperCase() : 'A';
    
    if (option === correct) {
      setScore(s => s + 1);
    }

    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
    } else {
      finishExam(); // Son soruydu, bitir
    }
  }

  // --- 5. SINAVI BİTİR VE SIRALAMAYI HESAPLA ---
  const finishExam = () => {
    setGameState('FINISHED');
    
    // O anki toplam katılımcı sayısını dondur
    const finalTotal = onlineCount;
    setTotalParticipants(finalTotal);

    // --- SIRALAMA ALGORİTMASI ---
    // Puanına göre sıralamanı belirle
    let myRank = 0;

    if (score === questions.length && score > 0) {
      myRank = 1; // Hepsini bildiyse Şampiyon
    } else if (score >= (questions.length * 0.9)) {
      // %90 üstü: İlk 20 içindesin
      myRank = Math.floor(Math.random() * 15) + 2; 
    } else if (score === 0) {
      myRank = finalTotal; // Sonuncu
    } else {
      // Formül: Puan düştükçe sıralama geriye gider
      const maxScore = questions.length || 50;
      const dropRate = (maxScore - score); 
      myRank = 20 + Math.floor(dropRate * (finalTotal / (maxScore + 5))) + Math.floor(Math.random() * 50);
      
      // Asla toplam kişiyi geçmesin
      if (myRank > finalTotal) myRank = finalTotal;
    }

    setFinalRank(myRank);

    // --- LİDER TABLOSU OLUŞTUR (FAKE) ---
    // İlk 10 kişiyi oluşturuyoruz
    const fakeLeaderboard = FAKE_NAMES.slice(0, 10).map((name, i) => ({
      name: name,
      score: questions.length > 0 ? questions.length - Math.floor(i / 3) : 50, 
      rank: i + 1,
      isUser: false
    }));

    // Eğer kullanıcı ilk 10'a girdiyse araya sıkıştır
    if (myRank <= 10) {
      fakeLeaderboard.splice(myRank - 1, 0, { name: "YOU", score: score, rank: myRank, isUser: true });
      fakeLeaderboard.pop();
      fakeLeaderboard.forEach((p, i) => p.rank = i + 1);
    }

    setTopList(fakeLeaderboard);
  }


  // --- EKRAN 1: SONUÇ (BİTİNCE) ---
  if (gameState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4">
        
        {/* Üst Başlık */}
        <div className="w-full max-w-md text-center mb-6 mt-4">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            RACE FINISHED
          </h1>
          <p className="text-slate-400 text-sm">
            Total Participants: <span className="text-white font-bold">{totalParticipants}</span>
          </p>
        </div>

        {/* Skor Kartı */}
        <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6 relative overflow-hidden">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase">Your Score</p>
              <p className="text-4xl font-bold text-white">{score}<span className="text-xl text-slate-500">/{questions.length}</span></p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs font-bold uppercase">Your Rank</p>
              <p className={`text-4xl font-bold ${finalRank <= 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                #{finalRank}
              </p>
            </div>
          </div>
          
          {/* Eğer derece kötüyse motive edici mesaj */}
          {finalRank > 20 && (
            <div className="mt-4 pt-4 border-t border-slate-700 text-center">
              <p className="text-sm text-slate-300">
                You performed better than <span className="text-green-400 font-bold">%{(100 - (finalRank/totalParticipants)*100).toFixed(1)}</span> of racers!
              </p>
            </div>
          )}
        </div>

        {/* Lider Tablosu */}
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-blue-600 p-3 text-center">
             <h3 className="font-bold text-white uppercase tracking-widest text-sm">🏆 TOP 10 LEADERS</h3>
          </div>
          <div className="p-2">
             {topList.map((player, idx) => (
               <div key={idx} className={`flex justify-between items-center p-3 mb-1 rounded-lg ${player.isUser ? 'bg-yellow-100 border-2 border-yellow-400 scale-[1.02]' : 'bg-slate-50 border-b border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                     <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-400 text-black' : 'bg-slate-200 text-slate-600'}`}>
                       {player.rank}
                     </span>
                     <span className={`font-bold ${player.isUser ? 'text-black' : 'text-slate-700'}`}>
                       {player.name}
                     </span>
                  </div>
                  <span className="font-mono font-bold text-blue-600">{player.score}</span>
               </div>
             ))}
             
             {/* Eğer ilk 10'da değilsek, listeye temsili ekleme */}
             {finalRank > 10 && (
               <>
                 <div className="text-center text-slate-400 text-xs py-1">. . .</div>
                 <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 border-2 border-yellow-400">
                    <div className="flex items-center gap-3">
                       <span className="w-8 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-slate-800 text-white">
                         {finalRank}
                       </span>
                       <span className="font-bold text-black">YOU</span>
                    </div>
                    <span className="font-mono font-bold text-blue-600">{score}</span>
                 </div>
               </>
             )}
          </div>
        </div>

        <div className="mt-8 mb-8 flex gap-4 w-full max-w-md">
           <Link href="/" className="flex-1 py-4 bg-slate-700 rounded-xl text-center font-bold text-slate-300 hover:bg-slate-600">
             EXIT
           </Link>
           <button onClick={() => window.location.reload()} className="flex-1 py-4 bg-blue-600 rounded-xl text-center font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30">
             RACE AGAIN ↻
           </button>
        </div>

      </div>
    )
  }

  // --- EKRAN 2: YÜKLENİYOR ---
  if (gameState === 'LOADING' || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold">MATCHMAKING...</h2>
        <p className="text-slate-400 text-sm animate-pulse">Finding opponents ({onlineCount})...</p>
      </div>
    )
  }

  // --- EKRAN 3: OYUN (QUIZ) ---
  const q = questions[currentQ];
  
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Üst Bar */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           <span className="font-mono text-xs text-green-400">{onlineCount} Live</span>
        </div>
        <div className={`font-mono font-bold text-xl ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* İlerleme Çubuğu */}
      <div className="w-full bg-slate-200 h-2">
        <div className="bg-yellow-500 h-2 transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}></div>
      </div>

      {/* Soru Alanı */}
      <div className="flex-1 flex flex-col items-center p-4 pt-8">
        <div className="w-full max-w-2xl">
          
          <div className="flex justify-between text-slate-500 text-sm font-bold mb-2 uppercase tracking-wider">
             <span>Question {currentQ + 1}</span>
             <span>Score: {score}</span>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl border-b-4 border-slate-200 mb-6">
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">
               {q.question_text}
             </h2>
          </div>

          <div className="grid gap-3">
            {['A', 'B', 'C', 'D'].map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full text-left p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4 group"
              >
                <span className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl font-bold text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition shadow-inner">
                  {opt}
                </span>
                <span className="font-semibold text-slate-700 text-lg">
                  {q[`option_${opt.toLowerCase()}`]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
