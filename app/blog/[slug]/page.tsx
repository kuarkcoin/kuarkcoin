// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { blogPosts } from '@/data/blogPosts';

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      images: [post.image],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);

  if (!post) return notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <img
        src={post.image}
        alt={post.title}
        className="rounded-xl w-full h-64 object-cover mb-6"
      />

      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-gray-500 mb-6">
        {post.date} • {post.readingTime}
      </p>

      <article
        className="prose prose-lg"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </main>
  );
}