import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: November 24, 2025</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <p>
            Welcome to <strong>EnglishMeter.net</strong>. These terms and conditions outline the rules and regulations for the use of our Website. By accessing this website we assume you accept these terms and conditions. Do not continue to use EnglishMeter.net if you do not agree to take all of the terms and conditions stated on this page.
          </p>

          <h3 className="text-xl font-bold text-slate-900">1. Intellectual Property Rights</h3>
          <p>
            Other than the content you own, under these Terms, EnglishMeter and/or its licensors own all the intellectual property rights and materials contained in this Website. You are granted limited license only for purposes of viewing the material contained on this Website, provided that you comply with these Terms.
          </p>

          <h3 className="text-xl font-bold text-slate-900">2. Restrictions and Prohibited Use</h3>
          <p>
            You are specifically restricted from all of the following:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Publishing any Website material in any other media without prior written consent.</li>
            <li>Selling, sublicensing and/or otherwise commercializing any Website material.</li>
            <li>Using this Website in any way that is or may be damaging to this Website or its users.</li>
            <li>Engaging in any data mining, data harvesting, data extracting or any other similar activity in relation to this Website.</li>
            <li>Using this Website to engage in any unauthorized advertising or marketing.</li>
            <li>Using this Website contrary to applicable laws and regulations, or in any way that may cause harm to the Website, or to any person or business entity.</li>
          </ul>

          <h3 className="text-xl font-bold text-slate-900">3. Limitation of Liability</h3>
          <p>
            In no event shall EnglishMeter, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this Website, whether such liability is under contract, tort or otherwise, and EnglishMeter, including its officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this Website.
          </p>
          
          <h3 className="text-xl font-bold text-slate-900">4. Indemnification</h3>
          <p>
            You hereby indemnify to the fullest extent EnglishMeter from and against any and/or all liabilities, costs, demands, causes of action, damages and expenses arising in any way related to your breach of any of the provisions of these Terms.
          </p>

          <h3 className="text-xl font-bold text-slate-900">5. Contact Us</h3>
          <p>
            If you have any questions about these Terms, please contact us via our <a href="/contact" className="text-blue-600 hover:underline">Contact Page</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
