import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import LandingPage from '@/app/components/LandingPage'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'
import DefaultPageContent from './[slug]/components/DefaultPageContent'
import LandingPageContent from './[slug]/components/LandingPageContent'
import AboutPageContent from './[slug]/components/AboutPageContent'
import ContactPageContent from './[slug]/components/ContactPageContent'
import ServicesPageContent from './[slug]/components/ServicesPageContent'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
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

async function getHomepagePage(): Promise<CMSPage | null> {
  try {
    // Since CMS pages should not have homepage functionality for this project
    // and the database relationship is causing errors, we'll disable this feature
    // CMS pages are meant for static content like privacy policy, terms, etc.
    return null
  } catch (error) {
    console.error('Error in getHomepagePage:', error)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const customHomepage = await getHomepagePage()

  if (customHomepage) {
    const title = customHomepage.meta_title || customHomepage.title || 'IndexNow Studio'
    const description = customHomepage.meta_description || 'Professional web application for automated Google URL indexing and rank tracking'

    return {
      title,
      description,
      keywords: 'indexnow, seo, rank tracking, google indexing',
      authors: [{ name: customHomepage.author_name || 'IndexNow Studio' }],
      openGraph: {
        title,
        description,
        url: 'https://indexnow.studio',
        siteName: 'IndexNow Studio',
        locale: 'en_US',
        type: 'website',
        images: customHomepage.featured_image_url ? [
          {
            url: customHomepage.featured_image_url,
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
        images: customHomepage.featured_image_url ? [customHomepage.featured_image_url] : []
      },
      alternates: {
        canonical: 'https://indexnow.studio'
      }
    }
  }

  // Default metadata
  return {
    title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
    description: 'Simple. Accurate. Affordable. IndexNow focuses on one job and does it right: precise keyword rankings with clean reports and fair pricing. No tool fatigue. No surprise fees.',
    keywords: 'rank tracker, keyword ranking, SEO tracking, SERP monitoring, local rank tracking, mobile rank tracking, keyword position tracker, SEO analytics, rank tracking tool',
    openGraph: {
      title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
      description: 'Know where you rank—any device, any location—without the headache. Built for SEO professionals who want accuracy without complexity.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
      description: 'Simple. Accurate. Affordable. Precise keyword rankings with clean reports and fair pricing.',
    }
  }
}

// ISR Configuration for Homepage
export const revalidate = 1800 // Revalidate every 30 minutes

export default async function HomePage() {
  const customHomepage = await getHomepagePage()

  // If custom homepage is set, render it
  if (customHomepage) {
    const renderHomepageContent = () => {
      switch (customHomepage.template) {
        case 'landing':
          return <LandingPageContent page={customHomepage} />
        case 'about':
          return <AboutPageContent page={customHomepage} />
        case 'contact':
          return <ContactPageContent page={customHomepage} />
        case 'services':
          return <ServicesPageContent page={customHomepage} />
        default:
          return <DefaultPageContent page={customHomepage} />
      }
    }

    return (
      <div>
        {/* Custom CSS */}
        {customHomepage.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: customHomepage.custom_css }} />
        )}

        {/* Custom Homepage Content */}
        {renderHomepageContent()}

        {/* Custom JavaScript */}
        {customHomepage.custom_js && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.addEventListener('DOMContentLoaded', function() {
                  ${customHomepage.custom_js}
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
              "@type": "WebSite",
              "@id": "https://indexnow.studio#website",
              "url": "https://indexnow.studio",
              "name": customHomepage.meta_title || customHomepage.title || "IndexNow Studio",
              "description": customHomepage.meta_description,
              "inLanguage": "en-US",
              "author": {
                "@type": "Organization",
                "name": "IndexNow Studio"
              },
              ...(customHomepage.featured_image_url && {
                "image": {
                  "@type": "ImageObject",
                  "url": customHomepage.featured_image_url,
                  "caption": customHomepage.meta_title || customHomepage.title
                }
              })
            })
          }}
        />
      </div>
    )
  }

  // Default homepage
  return (
    <ClientOnlyWrapper fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-info mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading IndexNow Studio...</p>
        </div>
      </div>
    }>
      <LandingPage />
    </ClientOnlyWrapper>
  )
}