export interface SitemapUrl {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export class SitemapXmlGenerator {
  generateUrlSetXml(urls: SitemapUrl[]): string {
    const urlTags = urls.map(url => {
      let urlTag = `    <url>\n      <loc>${this.escapeXml(url.url)}</loc>\n`
      
      if (url.lastmod) {
        urlTag += `      <lastmod>${url.lastmod}</lastmod>\n`
      }
      
      if (url.changefreq) {
        urlTag += `      <changefreq>${url.changefreq}</changefreq>\n`
      }
      
      if (url.priority !== undefined) {
        urlTag += `      <priority>${url.priority.toFixed(1)}</priority>\n`
      }
      
      urlTag += '    </url>'
      return urlTag
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags}
</urlset>`
  }

  generateSitemapIndexXml(sitemaps: { loc: string; lastmod?: string }[]): string {
    const sitemapTags = sitemaps.map(sitemap => {
      let sitemapTag = `    <sitemap>\n      <loc>${this.escapeXml(sitemap.loc)}</loc>\n`
      
      if (sitemap.lastmod) {
        sitemapTag += `      <lastmod>${sitemap.lastmod}</lastmod>\n`
      }
      
      sitemapTag += '    </sitemap>'
      return sitemapTag
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapTags}
</sitemapindex>`
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}