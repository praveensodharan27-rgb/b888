import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBaseUrl, getApiBaseOrigin } from '@/lib/seo';
import { getBlogPostBySlug } from '@/lib/directory';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post Not Found' };
  const title = (post.metaTitle as string) || post.title;
  const description = (post.metaDescription as string) || (post.excerpt as string) || post.title;
  const canonical = `${getBaseUrl()}/blog/${post.slug}`;
  const image = post.image
    ? (post.image.startsWith('http') ? post.image : `${getApiBaseOrigin()}${post.image.startsWith('/') ? '' : '/'}${post.image}`)
    : undefined;
  return {
    title: title.slice(0, 60),
    description: description.slice(0, 160),
    keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
    openGraph: { title: title.slice(0, 60), description: description.slice(0, 160), url: canonical, type: 'article', ...(image && { images: [{ url: image, alt: post.title }] }) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: title.slice(0, 60), description: description.slice(0, 160) },
    alternates: { canonical },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const base = getBaseUrl();
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    url: `${base}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: post.author ? { '@type': 'Person', name: post.author } : undefined,
    publisher: { '@type': 'Organization', name: 'Sell Box Directory', url: base },
    ...(post.image && { image: post.image.startsWith('http') ? post.image : `${base}${post.image}` }),
  };

  const faqMatch = (post.content as string)?.match(/<h2[^>]*>FAQ<\/h2>[\s\S]*?(?=<h2|$)/i);
  const faqLd = faqMatch
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: Array.from((post.content as string).matchAll(/<p><strong>(.*?)<\/strong>\s*(.*?)<\/p>/g)).map((m) => ({
          '@type': 'Question',
          name: m[1].replace(/<[^>]+>/g, ''),
          acceptedAnswer: { '@type': 'Answer', text: m[2].replace(/<[^>]+>/g, '') },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && faqLd.mainEntity?.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/blog" className="hover:text-gray-700">Blog</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-900">{post.title}</span>
        </nav>
        {post.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={post.image.startsWith('http') ? post.image : `${getApiBaseOrigin()}${post.image.startsWith('/') ? '' : '/'}${post.image}`}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
        )}
        <h1 className="mt-6 text-3xl font-bold text-gray-900">{post.title}</h1>
        {(post.author || post.publishedAt) && (
          <p className="mt-2 text-sm text-gray-500">
            {post.author && <span>{post.author}</span>}
            {post.publishedAt && (
              <span>{post.author ? ' · ' : ''}{new Date(post.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
            )}
          </p>
        )}
        <div
          className="prose prose-gray mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content as string }}
        />
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t: string) => (
              <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300">
                {t}
              </Link>
            ))}
          </div>
        )}
        <p className="mt-8">
          <Link href="/in" className="text-blue-600 hover:underline">Browse business directory</Link>
        </p>
      </article>
    </div>
  );
}
