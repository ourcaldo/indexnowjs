import { Metadata } from 'next'
import BlogArchiveContent from './components/BlogArchiveContent'

export const metadata: Metadata = {
  title: 'Blog - IndexNow Studio',
  description: 'Discover expert SEO insights, rank tracking strategies, and digital marketing tips. Stay updated with the latest trends in search engine optimization and website indexing.',
  keywords: 'SEO blog, rank tracking tips, digital marketing insights, search engine optimization, website indexing, SEO strategies, SERP analysis, keyword research',
  openGraph: {
    title: 'Blog - IndexNow Studio',
    description: 'Expert SEO insights and rank tracking strategies to boost your website\'s search performance.',
    type: 'website',
    url: '/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - IndexNow Studio',
    description: 'Expert SEO insights and rank tracking strategies to boost your website\'s search performance.',
  },
  alternates: {
    canonical: '/blog'
  },
  robots: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  }
}

// Structured Data for Blog
const blogStructuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "IndexNow Studio Blog",
  "description": "Expert SEO insights, rank tracking strategies, and digital marketing tips",
  "url": "https://indexnow.studio/blog",
  "publisher": {
    "@type": "Organization",
    "name": "IndexNow Studio",
    "url": "https://indexnow.studio"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://indexnow.studio/blog"
  }
}

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogStructuredData)
        }}
      />
      <BlogArchiveContent />
    </>
  )
}