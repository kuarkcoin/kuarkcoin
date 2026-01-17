// app/about/page.tsx
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | EnglishMeter',
  description: 'Learn about EnglishMeter’s mission to provide free, high-quality English level tests and vocabulary practice.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Başlık */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
            Making English Practice <span className="text-blue-600">Accessible</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            EnglishMeter is a modern platform designed to help you test your level, learn vocabulary, and prepare for exams like YDS & IELTS—completely for free.
          </p>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="grid md:grid-cols-2">
            
            {/* Sol Taraf - Görsel Alanı */}
            <div className="bg-blue-600 p-12 flex flex-col justify-center text-white">
              <div className="mb-6">
                {/* Globe Icon (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">Global Standard</h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                We strictly follow the CEFR (Common European Framework of Reference for Languages) standards. Whether you are A1 or C2, our metrics are designed to be accurate and recognized worldwide.
              </p>
            </div>

            {/* Sağ Taraf - Metin */}
            <div className="p-10 sm:p-14 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                We believe that quality education tools should be free. Many students struggle to find accurate placement tests without signing up or paying fees. 
              </p>
              <p className="text-slate-600 leading-relaxed">
                EnglishMeter solves this by offering instant, no-login required tests with detailed analytics, helping you identify exactly where you need to improve.
              </p>
            </div>
          </div>
        </div>

        {/* Özellikler Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              {/* Zap/Lightning Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Fast & Free</h3>
            <p className="text-slate-600">No paywalls, no hidden fees. Get your results in seconds.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              {/* Target Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Exam Focused</h3>
            <p className="text-slate-600">Curated vocabulary lists specifically for YDS, YÖKDİL, and IELTS.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              {/* Users Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">For Everyone</h3>
            <p className="text-slate-600">From students to professionals, tools adapted for every learning stage.</p>
          </div>
        </div>

        {/* İletişim */}
        <div className="text-center bg-slate-900 rounded-3xl p-10 sm:p-16">
          <h2 className="text-3xl font-bold text-white mb-4">Have Questions?</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            We are always open to feedback and collaboration opportunities.
          </p>
          <a href="mailto:support@englishmeter.net" className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-slate-900 bg-white rounded-full hover:bg-blue-50 transition-colors">
            Contact Support
          </a>
        </div>

      </div>
    </div>
  );
}
