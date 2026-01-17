// app/cookie/page.tsx
import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | EnglishMeter',
  description: 'Learn how EnglishMeter uses cookies to improve your experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm p-8 sm:p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
             {/* Cookie Icon */}
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
          <p className="text-gray-500 mt-2">Last updated: November 2025</p>
        </div>
        
        <div className="prose prose-blue max-w-none text-gray-600">
          <p>
            This Cookie Policy explains how EnglishMeter uses cookies and similar technologies to recognize you when you visit our website.
          </p>
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">What are cookies?</h3>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">How can I control cookies?</h3>
          <p>
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your browser controls to accept or refuse cookies.
          </p>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
             <p className="text-sm text-blue-800 font-medium">Contact us</p>
             <p className="text-sm text-blue-600">support@englishmeter.net</p>
          </div>
        </div>
      </div>
    </div>
  );
}
