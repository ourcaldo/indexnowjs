'use client'

import { Users, Target, Award, Globe } from 'lucide-react'

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  status: string
  // Removed is_homepage field
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
}

interface AboutPageContentProps {
  page: CMSPage
}

export default function AboutPageContent({ page }: AboutPageContentProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              {page.title}
            </h1>
            
            {page.meta_description && (
              <p className="text-xl text-secondary leading-relaxed">
                {page.meta_description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {page.featured_image_url && (
        <section className="relative -mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative z-10">
              <img 
                src={page.featured_image_url}
                alt={page.title}
                className="w-full h-64 lg:h-96 object-cover rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Content */}
            <div className="lg:col-span-2">
              {page.content ? (
                <div className="prose prose-lg max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ __html: page.content }} 
                    className="text-foreground leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      IndexNow Studio was born from the need to simplify and automate SEO processes for digital marketers and website owners. We understand the challenges of managing large-scale indexing operations and the importance of accurate rank tracking.
                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Our team of SEO experts and developers work tirelessly to provide you with the most advanced tools for Google indexing and rank monitoring, helping you stay ahead in the competitive digital landscape.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-8">
              <div className="bg-secondary rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Company Stats</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent mb-1">1000+</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success mb-1">1M+</div>
                    <div className="text-sm text-muted-foreground">URLs Indexed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-warning mb-1">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Our Values
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              These core values guide everything we do at IndexNow Studio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Target,
                title: 'Precision',
                description: 'We deliver accurate data and reliable results you can trust for your SEO decisions.'
              },
              {
                icon: Users,
                title: 'User-Centric',
                description: 'Every feature is designed with our users in mind, prioritizing ease of use and effectiveness.'
              },
              {
                icon: Award,
                title: 'Excellence',
                description: 'We strive for excellence in every aspect of our platform and customer service.'
              },
              {
                icon: Globe,
                title: 'Innovation',
                description: 'We continuously innovate to stay ahead of SEO trends and algorithm changes.'
              }
            ].map((value, index) => {
              const IconComponent = value.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Meet Our Team
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The passionate people behind IndexNow Studio who make it all possible
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'IndexNow Studio Team',
                role: 'Development Team',
                description: 'A dedicated team of SEO experts and developers working to provide the best indexing and rank tracking tools.',
                avatar: '/team/team.jpg'
              }
            ].map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-32 h-32 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {member.name}
                </h3>
                <p className="text-accent font-medium mb-4">
                  {member.role}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}