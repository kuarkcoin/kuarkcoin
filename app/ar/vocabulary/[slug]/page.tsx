import dailyEnAr from '@/data/daily_en_ar.json';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface VocabItem {
  word: string;
  meaning: string;
  s: string;
  t: string;
}

const vocabData = dailyEnAr as VocabItem[];

// Slug oluşturma fonksiyonuna güvenlik kontrolü ekledik
const getSlug = (word: string) => {
  if (!word) return "";
  return word.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
};

export async function generateStaticParams() {
  // Sadece geçerli word alanına sahip olanları filtreleyelim
  // Bu, build sırasında olası bir crash'i engeller.
  const validParams = vocabData
    .filter(item => item && item.word)
    .map((item) => ({
      slug: getSlug(item.word),
    }));

  console.log(`🚀 Build: ${validParams.length} Arapça sayfa üretiliyor...`);
  return validParams;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = vocabData.find((i) => getSlug(i?.word) === params.slug);
  
  if (!item) return { title: 'Word Not Found' };

  return {
    title: `${item.word} - Arapça Anlamı | EnglishMeter`,
    description: `İngilizce ${item.word} kelimesinin Arapça anlamı: ${item.meaning}.`,
  };
}

export default function ArabicWordPage({ params }: { params: { slug: string } }) {
  // Params'ı bulurken güvenlik kontrolü
  const item = vocabData.find((i) => i?.word && getSlug(i.word) === params.slug);

  if (!item) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-5xl font-bold mb-2">{item.word}</h1>
          <p className="text-xl opacity-90">English - Arabic Vocabulary</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center border-b pb-8">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <span className="text-sm text-gray-500 uppercase tracking-widest">English Word</span>
              <h2 className="text-3xl font-semibold text-gray-800">{item.word}</h2>
            </div>
            
            <div className="text-center md:text-right" dir="rtl">
              <span className="text-sm text-gray-500 uppercase tracking-widest">المعنى بالعربية</span>
              <h2 className="text-4xl font-bold text-blue-600 leading-relaxed">{item.meaning}</h2>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-700 border-l-4 border-blue-500 pl-3">Example Usage</h3>
            <div className="bg-gray-50 p-6 rounded-lg italic text-gray-700 text-lg">"{item.s}"</div>
            <div className="bg-blue-50 p-6 rounded-lg text-right text-blue-900 text-xl font-medium" dir="rtl">"{item.t}"</div>
          </div>
        </div>
      </div>
    </main>
  );
}
