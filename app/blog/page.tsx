// app/blog/page.tsx
import Link from 'next/link';
import { blogPosts } from '@/data/blogPosts';

export default function BlogPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">EnglishMeter Blog</h1>

      <div className="space-y-8">
        {blogPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <div className="border rounded-xl p-4 hover:shadow-md transition">
              <img
                src={post.image}
                alt={post.title}
                className="rounded-lg w-full h-48 object-cover mb-4"
              />

              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-gray-600 text-sm mt-1">{post.description}</p>

              <p className="text-gray-400 text-sm mt-2">
                {post.date} • {post.readingTime}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}