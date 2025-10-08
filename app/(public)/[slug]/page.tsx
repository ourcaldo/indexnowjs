import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import DefaultPageContent from './components/DefaultPageContent'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: 'default'
  featured_image_url: string | null
  status: string
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

async function getPageBySlug(slug: string): Promise<CMSPage | null> {
  try {
    // Use .maybeSingle() instead of .single() to avoid PGRST116 errors
    const { data: page, error } = await supabase
      .from('indb_cms_pages')
      .select(`
        id,
        title,
        slug,
        content,
        template,
        featured_image_url,
        status,
        meta_title,
        meta_description,
        custom_css,
        custom_js,
        published_at,
        created_at,
        updated_at
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .maybeSingle()

    if (error) {
      console.error('Error fetching page:', error)
      return null
    }

    return page
  } catch (error) {
    console.error('Error in getPageBySlug:', error)
    return null
  }
}

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  // Prevent CMS route from overriding static auth routes only
  if (slug === 'login' || slug === 'register') {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.'
    }
  }
  
  const page = await getPageBySlug(slug)

  if (!page) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.'
    }
  }

  const title = page.meta_title || `${page.title} - IndexNow Studio` || 'IndexNow Studio'
  const description = page.meta_description || 'Professional web application for automated Google URL indexing and rank tracking'
  const url = `https://indexnow.studio/${page.slug}`

  return {
    title,
    description,
    keywords: 'indexnow, seo, rank tracking, google indexing',
    openGraph: {
      title,
      description,
      url,
      siteName: 'IndexNow Studio',
      locale: 'en_US',
      type: 'article',
      images: page.featured_image_url ? [
        {
          url: page.featured_image_url,
          width: 1200,
          height: 630,
          alt: title
        }
      ] : []
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: page.featured_image_url ? [page.featured_image_url] : []
    },
    alternates: {
      canonical: url
    }
  }
}

// ISR Configuration
export const revalidate = 3600 // Revalidate every 1 hour
export const dynamicParams = true // Allow new slugs

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params
  
  // Prevent CMS route from overriding static auth routes only
  if (slug === 'login' || slug === 'register') {
    notFound()
  }
  
  const page = await getPageBySlug(slug)

  if (!page) {
    notFound()
  }

  // Always use default template for static pages
  const renderPageContent = () => {
    return <DefaultPageContent page={page} />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Custom CSS */}
      {page.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
      )}

      {/* Page Content */}
      {renderPageContent()}

      {/* Custom JavaScript */}
      {page.custom_js && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                ${page.custom_js}
              });
            `
          }}
        />
      )}

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `https://indexnow.studio/${page.slug}#webpage`,
            "url": `https://indexnow.studio/${page.slug}`,
            "name": page.meta_title || page.title,
            "description": page.meta_description,
            "inLanguage": "en-US",
            "isPartOf": {
              "@type": "WebSite",
              "@id": "https://indexnow.studio#website",
              "url": "https://indexnow.studio",
              "name": "IndexNow Studio"
            },
            "datePublished": page.published_at,
            "dateModified": page.updated_at,
            "author": {
              "@type": "Organization",
              "name": "IndexNow Studio"
            },
            ...(page.featured_image_url && {
              "primaryImageOfPage": {
                "@type": "ImageObject",
                "url": page.featured_image_url,
                "caption": page.meta_title || page.title
              }
            })
          })
        }}
      />
    </div>
  )
}