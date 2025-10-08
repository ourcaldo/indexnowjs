'use client'

interface PostContentProps {
  content: string
  className?: string
}

export default function PostContent({ content, className = '' }: PostContentProps) {
  // Function to process content and add styling
  const processContent = (htmlContent: string) => {
    // For now, we'll render HTML content as-is
    // In a production environment, you might want to sanitize this content
    // using a library like DOMPurify or similar
    return { __html: htmlContent }
  }

  // If content is empty, show mockup content
  const mockContent = `
    <p>This is a sample blog post content. In a real implementation, this would be the actual content from your CMS.</p>
    
    <h2>Key Benefits of Professional Rank Tracking</h2>
    <p>Understanding where your website ranks for important keywords is crucial for SEO success. Here are the main benefits:</p>
    
    <ul>
      <li>Monitor your SEO progress over time</li>
      <li>Identify opportunities for improvement</li>
      <li>Track competitor performance</li>
      <li>Make data-driven decisions</li>
    </ul>
    
    <h2>Advanced SEO Strategies</h2>
    <p>To achieve better rankings, consider implementing these advanced strategies:</p>
    
    <h3>1. Technical SEO Optimization</h3>
    <p>Ensure your website has a solid technical foundation with fast loading times, mobile responsiveness, and proper crawlability.</p>
    
    <h3>2. Content Quality and Relevance</h3>
    <p>Create high-quality, relevant content that addresses your audience's needs and search intent.</p>
    
    <h3>3. Link Building and Authority</h3>
    <p>Build authoritative backlinks from reputable sources in your industry to improve your domain authority.</p>
    
    <blockquote>
      <p>"SEO is not about gaming the system anymore; it's about learning how to play by the rules." - Jordan Teicher</p>
    </blockquote>
    
    <h2>Measuring Success</h2>
    <p>Track your SEO success using these key metrics:</p>
    
    <ol>
      <li>Keyword ranking positions</li>
      <li>Organic traffic growth</li>
      <li>Click-through rates</li>
      <li>Conversion rates from organic traffic</li>
    </ol>
    
    <p>By implementing these strategies and consistently monitoring your performance, you can achieve sustainable SEO success and improve your website's visibility in search results.</p>
  `

  const contentToRender = content || mockContent

  return (
    <article 
      className={`prose prose-invert prose-lg max-w-none ${className}`}
      style={{
        // Custom CSS for the prose content using project colors
        '--tw-prose-body': 'hsl(var(--muted-foreground))',
        '--tw-prose-headings': '#ffffff',
        '--tw-prose-lead': 'hsl(var(--muted-foreground))',
        '--tw-prose-links': 'hsl(var(--accent))',
        '--tw-prose-bold': 'hsl(var(--foreground))',
        '--tw-prose-counters': 'hsl(var(--muted-foreground))',
        '--tw-prose-bullets': 'hsl(var(--muted-foreground))',
        '--tw-prose-hr': 'hsl(var(--border))',
        '--tw-prose-quotes': 'hsl(var(--muted))',
        '--tw-prose-quote-borders': 'hsl(var(--border))',
        '--tw-prose-captions': 'hsl(var(--muted-foreground))',
        '--tw-prose-code': 'hsl(var(--muted))',
        '--tw-prose-pre-code': 'hsl(var(--muted-foreground))',
        '--tw-prose-pre-bg': 'hsl(var(--background))',
        '--tw-prose-th-borders': 'hsl(var(--border))',
        '--tw-prose-td-borders': 'hsl(var(--border))'
      } as React.CSSProperties}
      data-testid="post-content"
    >
      <div dangerouslySetInnerHTML={processContent(contentToRender)} />
      
      <style jsx>{`
        .prose {
          color: var(--tw-prose-body);
          max-width: none;
        }
        
        .prose h1,
        .prose h2,
        .prose h3,
        .prose h4,
        .prose h5,
        .prose h6 {
          color: var(--tw-prose-headings);
          font-weight: 600;
        }
        
        .prose h2 {
          font-size: 1.875rem;
          line-height: 2.25rem;
          margin-top: 3rem;
          margin-bottom: 1.5rem;
        }
        
        .prose h3 {
          font-size: 1.5rem;
          line-height: 2rem;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
        }
        
        .prose p {
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          line-height: 1.75;
        }
        
        .prose a {
          color: var(--tw-prose-links);
          text-decoration: underline;
          text-decoration-color: rgb(96 165 250 / 0.3);
          text-underline-offset: 2px;
        }
        
        .prose a:hover {
          text-decoration-color: rgb(96 165 250 / 0.7);
        }
        
        .prose ul,
        .prose ol {
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .prose li {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }
        
        .prose ul li {
          position: relative;
        }
        
        .prose ul li::marker {
          color: var(--tw-prose-bullets);
        }
        
        .prose ol li::marker {
          color: var(--tw-prose-counters);
        }
        
        .prose blockquote {
          border-left: 4px solid var(--tw-prose-quote-borders);
          padding-left: 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          color: var(--tw-prose-quotes);
          background: hsl(var(--muted) / 0.2);
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        
        .prose blockquote p {
          margin: 0;
        }
        
        .prose code {
          color: var(--tw-prose-code);
          background: var(--tw-prose-pre-bg);
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        
        .prose pre {
          background: var(--tw-prose-pre-bg);
          color: var(--tw-prose-pre-code);
          padding: 1.5rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 2rem 0;
        }
        
        .prose pre code {
          background: none;
          padding: 0;
        }
        
        .prose img {
          border-radius: 0.75rem;
          margin: 2rem 0;
        }
        
        .prose hr {
          border-color: var(--tw-prose-hr);
          margin: 3rem 0;
        }
      `}</style>
    </article>
  )
}