'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Send, Mail } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus('error');
      setFeedback('Please fill in all fields.');
      return;
    }

    setStatus('loading');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim(),
        }),
      });

      // API yoksa → SADECE development'ta demo
      if (res.status === 404) {
        if (process.env.NODE_ENV === 'development') {
          await new Promise((r) => setTimeout(r, 1300));
          setStatus('success');
          setFeedback('Message sent successfully! (Demo mode – no API)');
          resetForm();
          return;
        }
        throw new Error('Contact API not found.');
      }

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || 'Failed to send message');

      setStatus('success');
      setFeedback('Thank you! We’ve received your message and will reply soon');
      resetForm();
    } catch (err: any) {
      setStatus('error');
      setFeedback(err?.message || 'Connection error. Please try again.');
      console.error('Contact form:', err);
    }
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Have a question, suggestion, or just want to say hello? We’d love to hear from you!
          </p>

          <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-2xl shadow-sm">
            <Mail className="w-6 h-6 text-blue-600" />
            <span className="text-gray-700">Email us directly:</span>
            <a
              href="mailto:support@englishmeter.net"
              className="font-bold text-blue-600 hover:text-blue-800 underline transition"
            >
              support@englishmeter.net
            </a>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          <div className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-7" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading || isSuccess}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition disabled:opacity-60"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || isSuccess}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition disabled:opacity-60"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={isLoading || isSuccess}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition resize-none disabled:opacity-60"
                  placeholder="How can we help you today?"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`
                  w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-bold text-white text-lg shadow-lg
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                  ${isSuccess
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}
                  disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin" /> Sending...
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-7 h-7" /> Sent Successfully!
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" /> Send Message
                  </>
                )}
              </button>

              {feedback && (
                <div
                  className={`mt-6 p-5 rounded-2xl border flex gap-4 animate-in fade-in slide-in-from-bottom duration-500
                  ${status === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                >
                  {status === 'success' ? (
                    <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-7 h-7 flex-shrink-0" />
                  )}
                  <p className="font-semibold text-lg">{feedback}</p>
                </div>
              )}
            </form>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-12 text-sm">
          We usually reply within <span className="font-bold text-gray-700">24 hours</span>
        </p>
      </div>
    </div>
  );
}