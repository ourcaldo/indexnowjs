import { Metadata } from 'next'
import ContactPageContent from './components/ContactPageContent'

export const metadata: Metadata = {
  title: 'Contact Us - IndexNow Studio',
  description: 'Get in touch with IndexNow Studio support team. Report issues, request features, or contact our community. Professional rank tracking support and customer service.',
  keywords: 'IndexNow contact, rank tracker support, SEO tool help, customer service, technical support, feature request',
  openGraph: {
    title: 'Contact Us - IndexNow Studio',
    description: 'Get in touch with our support team. Report issues, request features, or contact our community for help with rank tracking.',
    type: 'website',
    url: '/contact',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us - IndexNow Studio',
    description: 'Get in touch with IndexNow Studio support team for rank tracking help and customer service.',
  },
  alternates: {
    canonical: '/contact'
  },
  robots: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  }
}

export default function ContactPage() {
  return <ContactPageContent />
}