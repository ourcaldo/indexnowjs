import { Metadata } from 'next'
import FAQPageContent from './components/FAQPageContent'

export const metadata: Metadata = {
  title: 'FAQ - IndexNow Studio',
  description: 'Frequently asked questions about IndexNow rank tracking tool. Get answers about pricing, features, billing, team management, and technical support.',
  keywords: 'rank tracker FAQ, keyword tracking questions, SEO tool support, IndexNow help, rank tracking pricing questions, technical support',
  openGraph: {
    title: 'FAQ - IndexNow Studio',
    description: 'Get answers to common questions about IndexNow rank tracker - from setup to billing and everything in between.',
    type: 'website',
    url: '/faq',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ - IndexNow Studio',
    description: 'Frequently asked questions about IndexNow rank tracking tool. Find answers to pricing, features, and support questions.',
  },
  alternates: {
    canonical: '/faq'
  }
}

export default function FAQPage() {
  return <FAQPageContent />
}