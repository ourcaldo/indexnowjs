# UI Components

Public React components discovered in `components/` and `app/**/components/`.

## app

### RootLayout

- **export**: default
- **props**: children

```tsx
import RootLayout from '@/app/layout';
<RootLayout children={/* value */} />
```

## app/(public)

### PublicError

- **export**: default
- **props**: error, reset

```tsx
import PublicError from '@/app/(public)/error';
<PublicError error={/* value */} reset={/* value */} />
```

## app/(public)/[slug]/components

### AboutPageContent

- **export**: default
- **props**: page

```tsx
import AboutPageContent from '@/app/(public)/[slug]/components/AboutPageContent';
<AboutPageContent page={/* value */} />
```

### ContactPageContent

- **export**: default
- **props**: page

```tsx
import ContactPageContent from '@/app/(public)/[slug]/components/ContactPageContent';
<ContactPageContent page={/* value */} />
```

### DefaultPageContent

- **export**: default
- **props**: page

```tsx
import DefaultPageContent from '@/app/(public)/[slug]/components/DefaultPageContent';
<DefaultPageContent page={/* value */} />
```

### LandingPageContent

- **export**: default
- **props**: page

```tsx
import LandingPageContent from '@/app/(public)/[slug]/components/LandingPageContent';
<LandingPageContent page={/* value */} />
```

### ServicesPageContent

- **export**: default
- **props**: page

```tsx
import ServicesPageContent from '@/app/(public)/[slug]/components/ServicesPageContent';
<ServicesPageContent page={/* value */} />
```

## app/(public)/blog

### BlogPage

- **export**: default

```tsx
import BlogPage from '@/app/(public)/blog/page';
<BlogPage  />
```

## app/(public)/blog/[category]/[slug]/components

### SinglePostContent

- **export**: default
- **props**: post, relatedPosts

```tsx
import SinglePostContent from '@/app/(public)/blog/[category]/[slug]/components/SinglePostContent';
<SinglePostContent post={/* value */} relatedPosts={/* value */} />
```

## app/(public)/blog/category/[category]/components

### CategoryArchiveContent

- **export**: default
- **props**: category

```tsx
import CategoryArchiveContent from '@/app/(public)/blog/category/[category]/components/CategoryArchiveContent';
<CategoryArchiveContent category={/* value */} />
```

## app/(public)/blog/components

### BlogArchiveContent

- **export**: default

```tsx
import BlogArchiveContent from '@/app/(public)/blog/components/BlogArchiveContent';
<BlogArchiveContent  />
```

## app/(public)/blog/tag/[tag]/components

### TagArchiveContent

- **export**: default
- **props**: tag

```tsx
import TagArchiveContent from '@/app/(public)/blog/tag/[tag]/components/TagArchiveContent';
<TagArchiveContent tag={/* value */} />
```

## app/(public)/contact

### ContactPage

- **export**: default

```tsx
import ContactPage from '@/app/(public)/contact/page';
<ContactPage  />
```

## app/(public)/contact/components

### ContactPageContent

- **export**: default

```tsx
import ContactPageContent from '@/app/(public)/contact/components/ContactPageContent';
<ContactPageContent  />
```

## app/(public)/faq

### FAQPage

- **export**: default

```tsx
import FAQPage from '@/app/(public)/faq/page';
<FAQPage  />
```

## app/(public)/faq/components

### FAQPageContent

- **export**: default

```tsx
import FAQPageContent from '@/app/(public)/faq/components/FAQPageContent';
<FAQPageContent  />
```

## app/(public)/pricing

### PricingPage

- **export**: default

```tsx
import PricingPage from '@/app/(public)/pricing/page';
<PricingPage  />
```

## app/(public)/pricing/components

### PricingPageContent

- **export**: default

```tsx
import PricingPageContent from '@/app/(public)/pricing/components/PricingPageContent';
<PricingPageContent  />
```

## app/backend/admin

### AdminDashboard

- **export**: default

```tsx
import AdminDashboard from '@/app/backend/admin/page';
<AdminDashboard  />
```

### AdminError

- **export**: default
- **props**: error, reset

```tsx
import AdminError from '@/app/backend/admin/error';
<AdminError error={/* value */} reset={/* value */} />
```

### AdminLayout

- **export**: default
- **props**: children

```tsx
import AdminLayout from '@/app/backend/admin/layout';
<AdminLayout children={/* value */} />
```

## app/backend/admin/activity

### ActivityLogsPage

- **export**: default

```tsx
import ActivityLogsPage from '@/app/backend/admin/activity/page';
<ActivityLogsPage  />
```

## app/backend/admin/activity/[id]

### ActivityDetailPage

- **export**: default

```tsx
import ActivityDetailPage from '@/app/backend/admin/activity/[id]/page';
<ActivityDetailPage  />
```

## app/backend/admin/analytics

### ErrorMonitoringDashboard

- **export**: default

```tsx
import ErrorMonitoringDashboard from '@/app/backend/admin/analytics/page';
<ErrorMonitoringDashboard  />
```

## app/backend/admin/cms/pages

### CMSPages

- **export**: default

```tsx
import CMSPages from '@/app/backend/admin/cms/pages/page';
<CMSPages  />
```

## app/backend/admin/cms/pages/[id]/edit

### EditPage

- **export**: default

```tsx
import EditPage from '@/app/backend/admin/cms/pages/[id]/edit/page';
<EditPage  />
```

## app/backend/admin/cms/pages/create

### CreatePage

- **export**: default

```tsx
import CreatePage from '@/app/backend/admin/cms/pages/create/page';
<CreatePage  />
```

## app/backend/admin/cms/posts

### CMSPosts

- **export**: default

```tsx
import CMSPosts from '@/app/backend/admin/cms/posts/page';
<CMSPosts  />
```

## app/backend/admin/cms/posts/[id]/edit

### EditPostPage

- **export**: default
- **props**: params

```tsx
import EditPostPage from '@/app/backend/admin/cms/posts/[id]/edit/page';
<EditPostPage params={/* value */} />
```

## app/backend/admin/cms/posts/create

### CreatePostPage

- **export**: default

```tsx
import CreatePostPage from '@/app/backend/admin/cms/posts/create/page';
<CreatePostPage  />
```

## app/backend/admin/errors/[id]

### AdminErrorDetailPage

- **export**: default

```tsx
import AdminErrorDetailPage from '@/app/backend/admin/errors/[id]/page';
<AdminErrorDetailPage  />
```

## app/backend/admin/login

### AdminLoginPage

- **export**: default

```tsx
import AdminLoginPage from '@/app/backend/admin/login/page';
<AdminLoginPage  />
```

## app/backend/admin/orders

### AdminOrdersPage

- **export**: default

```tsx
import AdminOrdersPage from '@/app/backend/admin/orders/page';
<AdminOrdersPage  />
```

## app/backend/admin/orders/[id]

### AdminOrderDetailPage

- **export**: default

```tsx
import AdminOrderDetailPage from '@/app/backend/admin/orders/[id]/page';
<AdminOrderDetailPage  />
```

## app/backend/admin/settings/packages

### PackageManagement

- **export**: default

```tsx
import PackageManagement from '@/app/backend/admin/settings/packages/page';
<PackageManagement  />
```

## app/backend/admin/settings/payments

### PaymentGateways

- **export**: default

```tsx
import PaymentGateways from '@/app/backend/admin/settings/payments/page';
<PaymentGateways  />
```

## app/backend/admin/settings/site

### SiteSettings

- **export**: default

```tsx
import SiteSettings from '@/app/backend/admin/settings/site/page';
<SiteSettings  />
```

## app/backend/admin/users

### UserManagement

- **export**: default

```tsx
import UserManagement from '@/app/backend/admin/users/page';
<UserManagement  />
```

## app/backend/admin/users/[id]

### UserDetail

- **export**: default

```tsx
import UserDetail from '@/app/backend/admin/users/[id]/page';
<UserDetail  />
```

## app/backend/admin/users/[id]/activity

### UserActivityPage

- **export**: default
- **props**: params

```tsx
import UserActivityPage from '@/app/backend/admin/users/[id]/activity/page';
<UserActivityPage params={/* value */} />
```

## app/components

### CompanyLogos

- **export**: default

```tsx
import CompanyLogos from '@/app/components/CompanyLogos';
<CompanyLogos  />
```

### DashboardPreview

- **export**: default

```tsx
import DashboardPreview from '@/app/components/DashboardPreview';
<DashboardPreview  />
```

### LandingPage

- **export**: default

```tsx
import LandingPage from '@/app/components/LandingPage';
<LandingPage  />
```

## app/dashboard

### Dashboard

- **export**: default

```tsx
import Dashboard from '@/app/dashboard/page';
<Dashboard  />
```

### DashboardError

- **export**: default
- **props**: error, reset

```tsx
import DashboardError from '@/app/dashboard/error';
<DashboardError error={/* value */} reset={/* value */} />
```

### DashboardLayout

- **export**: default
- **props**: children

```tsx
import DashboardLayout from '@/app/dashboard/layout';
<DashboardLayout children={/* value */} />
```

## app/dashboard/admin/errors

### ErrorMonitoringPage

- **export**: default

```tsx
import ErrorMonitoringPage from '@/app/dashboard/admin/errors/page';
<ErrorMonitoringPage  />
```

## app/dashboard/indexnow

### IndexNowPage

- **export**: default

```tsx
import IndexNowPage from '@/app/dashboard/indexnow/page';
<IndexNowPage  />
```

## app/dashboard/indexnow/add

### AddKeywordsPage

- **export**: default

```tsx
import AddKeywordsPage from '@/app/dashboard/indexnow/add/page';
<AddKeywordsPage  />
```

## app/dashboard/indexnow/jobs

### JobsPage

- **export**: default

```tsx
import JobsPage from '@/app/dashboard/indexnow/jobs/page';
<JobsPage  />
```

## app/dashboard/indexnow/new

### NewIndexPage

- **export**: default

```tsx
import NewIndexPage from '@/app/dashboard/indexnow/new/page';
<NewIndexPage  />
```

## app/dashboard/indexnow/overview

### IndexNowOverview

- **export**: default

```tsx
import IndexNowOverview from '@/app/dashboard/indexnow/overview/page';
<IndexNowOverview  />
```

## app/dashboard/indexnow/overview/components

### BulkActions

- **export**: named
- **props**: showDeleteConfirm, setShowDeleteConfirm, showTagModal, setShowTagModal, selectedKeywords, isDeleting, handleBulkDelete, isAddingTag, newTag, setNewTag, handleAddTag

```tsx
import { BulkActions } from '@/app/dashboard/indexnow/overview/components/BulkActions';
<BulkActions showDeleteConfirm={/* value */} setShowDeleteConfirm={/* value */} showTagModal={/* value */} setShowTagModal={/* value */} selectedKeywords={/* value */} isDeleting={/* value */} handleBulkDelete={/* value */} isAddingTag={/* value */} newTag={/* value */} setNewTag={/* value */} handleAddTag={/* value */} />
```

### DomainSelector

- **export**: named
- **props**: domains, selectedDomainId, selectedDomainInfo, showDomainsManager, setShowDomainsManager, setSelectedDomainId, getDomainKeywordCount

```tsx
import { DomainSelector } from '@/app/dashboard/indexnow/overview/components/DomainSelector';
<DomainSelector domains={/* value */} selectedDomainId={/* value */} selectedDomainInfo={/* value */} showDomainsManager={/* value */} setShowDomainsManager={/* value */} setSelectedDomainId={/* value */} getDomainKeywordCount={/* value */} />
```

### FilterPanel

- **export**: named
- **props**: searchTerm, setSearchTerm, selectedTags, setSelectedTags, selectedKeywords, setShowActionsMenu, setShowDeleteConfirm, setShowTagModal, showActionsMenu

```tsx
import { FilterPanel } from '@/app/dashboard/indexnow/overview/components/FilterPanel';
<FilterPanel searchTerm={/* value */} setSearchTerm={/* value */} selectedTags={/* value */} setSelectedTags={/* value */} selectedKeywords={/* value */} setShowActionsMenu={/* value */} setShowDeleteConfirm={/* value */} setShowTagModal={/* value */} showActionsMenu={/* value */} />
```

### KeywordTable

- **export**: named
- **props**: keywords, filteredKeywords, selectedKeywords, handleKeywordSelect, handleSelectAll, searchTerm, keywordsLoading

```tsx
import { KeywordTable } from '@/app/dashboard/indexnow/overview/components/KeywordTable';
<KeywordTable keywords={/* value */} filteredKeywords={/* value */} selectedKeywords={/* value */} handleKeywordSelect={/* value */} handleSelectAll={/* value */} searchTerm={/* value */} keywordsLoading={/* value */} />
```

### Pagination

- **export**: named
- **props**: pagination, currentPage, setCurrentPage

```tsx
import { Pagination } from '@/app/dashboard/indexnow/overview/components/Pagination';
<Pagination pagination={/* value */} currentPage={/* value */} setCurrentPage={/* value */} />
```

### RankOverviewStats

- **export**: named
- **props**: totalKeywords, avgPosition, topTenCount, improvingCount

```tsx
import { RankOverviewStats } from '@/app/dashboard/indexnow/overview/components/RankOverviewStats';
<RankOverviewStats totalKeywords={/* value */} avgPosition={/* value */} topTenCount={/* value */} improvingCount={/* value */} />
```

## app/dashboard/indexnow/rank-history

### RankHistoryPage

- **export**: default

```tsx
import RankHistoryPage from '@/app/dashboard/indexnow/rank-history/page';
<RankHistoryPage  />
```

## app/dashboard/indexnow/rank-history/components

### BulkActionsBar

- **export**: named
- **props**: selectedCount, onDeleteKeywords, onAddTag, activeFilter, onFilterChange

```tsx
import { BulkActionsBar } from '@/app/dashboard/indexnow/rank-history/components/BulkActionsBar';
<BulkActionsBar selectedCount={/* value */} onDeleteKeywords={/* value */} onAddTag={/* value */} activeFilter={/* value */} onFilterChange={/* value */} />
```

### DateRangeCalendar

- **export**: named
- **props**: selectedRange, onRangeChange

```tsx
import { DateRangeCalendar } from '@/app/dashboard/indexnow/rank-history/components/DateRangeCalendar';
<DateRangeCalendar selectedRange={/* value */} onRangeChange={/* value */} />
```

## app/dashboard/manage-jobs

### ManageJobsPage

- **export**: default

```tsx
import ManageJobsPage from '@/app/dashboard/manage-jobs/page';
<ManageJobsPage  />
```

## app/dashboard/manage-jobs/[id]

### JobDetailsPage

- **export**: default

```tsx
import JobDetailsPage from '@/app/dashboard/manage-jobs/[id]/page';
<JobDetailsPage  />
```

## app/dashboard/settings

### SettingsPage

- **export**: default

```tsx
import SettingsPage from '@/app/dashboard/settings/page';
<SettingsPage  />
```

## app/dashboard/settings/general

### GeneralSettingsPage

- **export**: default

```tsx
import GeneralSettingsPage from '@/app/dashboard/settings/general/page';
<GeneralSettingsPage  />
```

## app/dashboard/settings/plans-billing

### BillingPage

- **export**: default

```tsx
import BillingPage from '@/app/dashboard/settings/plans-billing/page';
<BillingPage  />
```

## app/dashboard/settings/plans-billing/checkout

### CheckoutPage

- **export**: default

```tsx
import CheckoutPage from '@/app/dashboard/settings/plans-billing/checkout/page';
<CheckoutPage  />
```

## app/dashboard/settings/plans-billing/checkout/components

### CheckoutFormComponent

- **export**: named
- **props**: form, setForm

```tsx
import { CheckoutFormComponent } from '@/app/dashboard/settings/plans-billing/checkout/components/CheckoutForm';
<CheckoutFormComponent form={/* value */} setForm={/* value */} />
```

### CheckoutHeader

- **export**: named
- **props**: selectedPackage

```tsx
import { CheckoutHeader } from '@/app/dashboard/settings/plans-billing/checkout/components/CheckoutHeader';
<CheckoutHeader selectedPackage={/* value */} />
```

### CheckoutSubmitButton

- **export**: named
- **props**: paymentMethod, submitting, onSubmit

```tsx
import { CheckoutSubmitButton } from '@/app/dashboard/settings/plans-billing/checkout/components/CheckoutSubmitButton';
<CheckoutSubmitButton paymentMethod={/* value */} submitting={/* value */} onSubmit={/* value */} />
```

## app/dashboard/settings/plans-billing/components

### BillingHistory

- **export**: named
- **props**: historyData, currentPage, statusFilter, typeFilter, searchTerm, setCurrentPage, setStatusFilter, setTypeFilter, setSearchTerm, handlePageChange, resetFilters, getStatusIcon, getStatusText, getStatusColor, formatCurrency, formatDate

```tsx
import { BillingHistory } from '@/app/dashboard/settings/plans-billing/components/BillingHistory';
<BillingHistory historyData={/* value */} currentPage={/* value */} statusFilter={/* value */} typeFilter={/* value */} searchTerm={/* value */} setCurrentPage={/* value */} setStatusFilter={/* value */} setTypeFilter={/* value */} setSearchTerm={/* value */} handlePageChange={/* value */} resetFilters={/* value */} getStatusIcon={/* value */} getStatusText={/* value */} getStatusColor={/* value */} formatCurrency={/* value */} formatDate={/* value */} />
```

### BillingStats

- **export**: named
- **props**: billingData, currentPackageId, formatCurrency, userCurrency

```tsx
import { BillingStats } from '@/app/dashboard/settings/plans-billing/components/BillingStats';
<BillingStats billingData={/* value */} currentPackageId={/* value */} formatCurrency={/* value */} userCurrency={/* value */} />
```

### PackageComparison

- **export**: named
- **props**: packages, showComparePlans, toggleComparePlans, selectedBillingPeriod, userCurrency, getBillingPeriodPrice, formatCurrency, handleSubscribe, subscribing

```tsx
import { PackageComparison } from '@/app/dashboard/settings/plans-billing/components/PackageComparison';
<PackageComparison packages={/* value */} showComparePlans={/* value */} toggleComparePlans={/* value */} selectedBillingPeriod={/* value */} userCurrency={/* value */} getBillingPeriodPrice={/* value */} formatCurrency={/* value */} handleSubscribe={/* value */} subscribing={/* value */} />
```

### PricingCards

- **export**: named
- **props**: packages, selectedBillingPeriod, setSelectedBillingPeriod, userCurrency, subscribing, trialEligible, startingTrial, showDetails, showComparePlans, getBillingPeriodPrice, formatCurrency, handleSubscribe, handleStartTrial, isTrialEligiblePackage, togglePlanDetails

```tsx
import { PricingCards } from '@/app/dashboard/settings/plans-billing/components/PricingCards';
<PricingCards packages={/* value */} selectedBillingPeriod={/* value */} setSelectedBillingPeriod={/* value */} userCurrency={/* value */} subscribing={/* value */} trialEligible={/* value */} startingTrial={/* value */} showDetails={/* value */} showComparePlans={/* value */} getBillingPeriodPrice={/* value */} formatCurrency={/* value */} handleSubscribe={/* value */} handleStartTrial={/* value */} isTrialEligiblePackage={/* value */} togglePlanDetails={/* value */} />
```

## app/dashboard/settings/plans-billing/history

### BillingHistoryPage

- **export**: default

```tsx
import BillingHistoryPage from '@/app/dashboard/settings/plans-billing/history/page';
<BillingHistoryPage  />
```

### HistoryTab

- **export**: default

```tsx
import HistoryTab from '@/app/dashboard/settings/plans-billing/history/HistoryTab';
<HistoryTab  />
```

## app/dashboard/settings/plans-billing/order/[id]

### OrderCompletedPage

- **export**: default

```tsx
import OrderCompletedPage from '@/app/dashboard/settings/plans-billing/order/[id]/page';
<OrderCompletedPage  />
```

## app/dashboard/settings/plans-billing/orders/[order_id]

### OrderSuccessPage

- **export**: default

```tsx
import OrderSuccessPage from '@/app/dashboard/settings/plans-billing/orders/[order_id]/page';
<OrderSuccessPage  />
```

## app/dashboard/settings/plans-billing/plans

### PlansPage

- **export**: default

```tsx
import PlansPage from '@/app/dashboard/settings/plans-billing/plans/page';
<PlansPage  />
```

### PlansTab

- **export**: default

```tsx
import PlansTab from '@/app/dashboard/settings/plans-billing/plans/PlansTab';
<PlansTab  />
```

## app/dashboard/settings/profile

### ProfileSettingsPage

- **export**: default

```tsx
import ProfileSettingsPage from '@/app/dashboard/settings/profile/page';
<ProfileSettingsPage  />
```

## app/dashboard/settings/service-accounts

### ServiceAccountsSettingsPage

- **export**: default

```tsx
import ServiceAccountsSettingsPage from '@/app/dashboard/settings/service-accounts/page';
<ServiceAccountsSettingsPage  />
```

## app/dashboard/test-backend

### TestBackendPage

- **export**: default

```tsx
import TestBackendPage from '@/app/dashboard/test-backend/page';
<TestBackendPage  />
```

## app/dashboard/tools/fastindexing

### FastIndexingLayout

- **export**: default
- **props**: children

```tsx
import FastIndexingLayout from '@/app/dashboard/tools/fastindexing/layout';
<FastIndexingLayout children={/* value */} />
```

### IndexNowPage

- **export**: default

```tsx
import IndexNowPage from '@/app/dashboard/tools/fastindexing/page';
<IndexNowPage  />
```

## app/dashboard/tools/fastindexing/manage-jobs

### ManageJobsPage

- **export**: default

```tsx
import ManageJobsPage from '@/app/dashboard/tools/fastindexing/manage-jobs/page';
<ManageJobsPage  />
```

## app/dashboard/tools/fastindexing/manage-jobs/[id]

### JobDetailsPage

- **export**: default

```tsx
import JobDetailsPage from '@/app/dashboard/tools/fastindexing/manage-jobs/[id]/page';
<JobDetailsPage  />
```

## app/login

### Login

- **export**: default

```tsx
import Login from '@/app/login/page';
<Login  />
```

### LoginLayout

- **export**: default
- **props**: children

```tsx
import LoginLayout from '@/app/login/layout';
<LoginLayout children={/* value */} />
```

## app/register

### Register

- **export**: default

```tsx
import Register from '@/app/register/page';
<Register  />
```

## app/resend-verification

### ResendVerification

- **export**: default

```tsx
import ResendVerification from '@/app/resend-verification/page';
<ResendVerification  />
```

## components

### AdminSidebar

- **export**: named
- **props**: isOpen, onToggle, onCollapse, user, isCollapsed = false

```tsx
import { AdminSidebar } from '@/components/AdminSidebar';
<AdminSidebar isOpen={/* value */} onToggle={/* value */} onCollapse={/* value */} user={/* value */} isCollapsed = false={/* value */} />
```

### ClientOnlyWrapper

- **export**: default
- **props**: children, fallback

```tsx
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper';
<ClientOnlyWrapper children={/* value */} fallback={/* value */} />
```

### DashboardHeader

- **export**: default
- **props**: domains, selectedDomainId, selectedDomainInfo, isDomainSelectorOpen, onDomainSelectorToggle, onDomainSelect, getDomainKeywordCount, onToggleSidebar, selectedDevice, selectedCountry, countries, onDeviceChange, onCountryChange

```tsx
import DashboardHeader from '@/components/DashboardHeader';
<DashboardHeader domains={/* value */} selectedDomainId={/* value */} selectedDomainInfo={/* value */} isDomainSelectorOpen={/* value */} onDomainSelectorToggle={/* value */} onDomainSelect={/* value */} getDomainKeywordCount={/* value */} onToggleSidebar={/* value */} selectedDevice={/* value */} selectedCountry={/* value */} countries={/* value */} onDeviceChange={/* value */} onCountryChange={/* value */} />
```

### DashboardPreview

- **export**: default

```tsx
import DashboardPreview from '@/components/DashboardPreview';
<DashboardPreview  />
```

### FaviconProvider

- **export**: default

```tsx
import FaviconProvider from '@/components/FaviconProvider';
<FaviconProvider  />
```

### GlobalQuotaWarning

- **export**: default

```tsx
import GlobalQuotaWarning from '@/components/GlobalQuotaWarning';
<GlobalQuotaWarning  />
```

### MidtransCreditCardForm

- **export**: default
- **props**: onSubmit, loading, disabled, onCardDataChange

```tsx
import MidtransCreditCardForm from '@/components/MidtransCreditCardForm';
<MidtransCreditCardForm onSubmit={/* value */} loading={/* value */} disabled={/* value */} onCardDataChange={/* value */} />
```

### QueryProvider

- **export**: default
- **props**: children

```tsx
import QueryProvider from '@/components/QueryProvider';
<QueryProvider children={/* value */} />
```

### QuotaNotification

- **export**: default

```tsx
import QuotaNotification from '@/components/QuotaNotification';
<QuotaNotification  />
```

### ServerErrorBoundary

- **export**: default
- **props**: error, reset

```tsx
import ServerErrorBoundary from '@/components/ServerErrorBoundary';
<ServerErrorBoundary error={/* value */} reset={/* value */} />
```

### ServiceAccountQuotaNotification

- **export**: default

```tsx
import ServiceAccountQuotaNotification from '@/components/ServiceAccountQuotaNotification';
<ServiceAccountQuotaNotification  />
```

### SkeletonSidebar

- **export**: named
- **props**: isCollapsed = false

```tsx
import { SkeletonSidebar } from '@/components/SkeletonSidebar';
<SkeletonSidebar isCollapsed = false={/* value */} />
```

## components/blog

### BlogCard

- **export**: default
- **props**: post, className

```tsx
import BlogCard from '@/components/blog/BlogCard';
<BlogCard post={/* value */} className={/* value */} />
```

### BlogFilters

- **export**: default
- **props**: onSearch, onTagFilter, onCategoryFilter, currentSearch, currentTag, currentCategory, availableTags, availableCategories, className

```tsx
import BlogFilters from '@/components/blog/BlogFilters';
<BlogFilters onSearch={/* value */} onTagFilter={/* value */} onCategoryFilter={/* value */} currentSearch={/* value */} currentTag={/* value */} currentCategory={/* value */} availableTags={/* value */} availableCategories={/* value */} className={/* value */} />
```

### BlogPagination

- **export**: default
- **props**: pagination, onPageChange, className

```tsx
import BlogPagination from '@/components/blog/BlogPagination';
<BlogPagination pagination={/* value */} onPageChange={/* value */} className={/* value */} />
```

### PostContent

- **export**: default
- **props**: content, className

```tsx
import PostContent from '@/components/blog/PostContent';
<PostContent content={/* value */} className={/* value */} />
```

### PostHeader

- **export**: default
- **props**: title, excerpt, author, published_at, tags, featured_image_url, readTime, className

```tsx
import PostHeader from '@/components/blog/PostHeader';
<PostHeader title={/* value */} excerpt={/* value */} author={/* value */} published_at={/* value */} tags={/* value */} featured_image_url={/* value */} readTime={/* value */} className={/* value */} />
```

### RelatedPosts

- **export**: default
- **props**: posts, className

```tsx
import RelatedPosts from '@/components/blog/RelatedPosts';
<RelatedPosts posts={/* value */} className={/* value */} />
```

### TableOfContents

- **export**: default
- **props**: content, className

```tsx
import TableOfContents from '@/components/blog/TableOfContents';
<TableOfContents content={/* value */} className={/* value */} />
```

## components/checkout

### BillingPeriodSelector

- **export**: default
- **props**: selectedPackage, userCurrency, selectedPeriod, onPeriodChange

```tsx
import BillingPeriodSelector from '@/components/checkout/BillingPeriodSelector';
<BillingPeriodSelector selectedPackage={/* value */} userCurrency={/* value */} selectedPeriod={/* value */} onPeriodChange={/* value */} />
```

### OrderSummary

- **export**: default
- **props**: selectedPackage, billingPeriod, userCurrency, isTrialFlow

```tsx
import OrderSummary from '@/components/checkout/OrderSummary';
<OrderSummary selectedPackage={/* value */} billingPeriod={/* value */} userCurrency={/* value */} isTrialFlow={/* value */} />
```

## components/checkout/payment-methods

### BankTransferPayment

- **export**: default
- **props**: gateway

```tsx
import BankTransferPayment from '@/components/checkout/payment-methods/BankTransferPayment';
<BankTransferPayment gateway={/* value */} />
```

### MidtransRecurringPayment

- **export**: default
- **props**: gateway, onCreditCardSubmit, loading

```tsx
import MidtransRecurringPayment from '@/components/checkout/payment-methods/MidtransRecurringPayment';
<MidtransRecurringPayment gateway={/* value */} onCreditCardSubmit={/* value */} loading={/* value */} />
```

### MidtransSnapPayment

- **export**: default
- **props**: gateway

```tsx
import MidtransSnapPayment from '@/components/checkout/payment-methods/MidtransSnapPayment';
<MidtransSnapPayment gateway={/* value */} />
```

### PaymentMethodSelector

- **export**: default
- **props**: paymentGateways, selectedMethod, onMethodChange, onCreditCardSubmit, loading

```tsx
import PaymentMethodSelector from '@/components/checkout/payment-methods/PaymentMethodSelector';
<PaymentMethodSelector paymentGateways={/* value */} selectedMethod={/* value */} onMethodChange={/* value */} onCreditCardSubmit={/* value */} loading={/* value */} />
```

## components/cms

### CategorySelector

- **export**: default
- **props**: selectedCategories, mainCategory, onChange, className

```tsx
import CategorySelector from '@/components/cms/CategorySelector';
<CategorySelector selectedCategories={/* value */} mainCategory={/* value */} onChange={/* value */} className={/* value */} />
```

### CustomCodeEditor

- **export**: default
- **props**: customCSS, customJS, onCSSChange, onJSChange, className

```tsx
import CustomCodeEditor from '@/components/cms/CustomCodeEditor';
<CustomCodeEditor customCSS={/* value */} customJS={/* value */} onCSSChange={/* value */} onJSChange={/* value */} className={/* value */} />
```

### ImageUploader

- **export**: default
- **props**: value, onChange, onRemove, className

```tsx
import ImageUploader from '@/components/cms/ImageUploader';
<ImageUploader value={/* value */} onChange={/* value */} onRemove={/* value */} className={/* value */} />
```

### PageForm

- **export**: default
- **props**: initialData, mode, onSubmit, onCancel, isLoading

```tsx
import PageForm from '@/components/cms/PageForm';
<PageForm initialData={/* value */} mode={/* value */} onSubmit={/* value */} onCancel={/* value */} isLoading={/* value */} />
```

### PagePublishControls

- **export**: default
- **props**: status, onStatusChange, onSave, onPreview, isLoading, isDirty, className

```tsx
import PagePublishControls from '@/components/cms/PagePublishControls';
<PagePublishControls status={/* value */} onStatusChange={/* value */} onSave={/* value */} onPreview={/* value */} isLoading={/* value */} isDirty={/* value */} className={/* value */} />
```

### PageSEOFields

- **export**: default
- **props**: title, metaTitle, metaDescription, slug, onMetaTitleChange, onMetaDescriptionChange, className

```tsx
import PageSEOFields from '@/components/cms/PageSEOFields';
<PageSEOFields title={/* value */} metaTitle={/* value */} metaDescription={/* value */} slug={/* value */} onMetaTitleChange={/* value */} onMetaDescriptionChange={/* value */} className={/* value */} />
```

### PostForm

- **export**: default
- **props**: initialData, mode, onSubmit, onCancel, isLoading

```tsx
import PostForm from '@/components/cms/PostForm';
<PostForm initialData={/* value */} mode={/* value */} onSubmit={/* value */} onCancel={/* value */} isLoading={/* value */} />
```

### PublishControls

- **export**: default
- **props**: status, postType, onStatusChange, onPostTypeChange, onSave, onPreview, isLoading, isDirty, className

```tsx
import PublishControls from '@/components/cms/PublishControls';
<PublishControls status={/* value */} postType={/* value */} onStatusChange={/* value */} onPostTypeChange={/* value */} onSave={/* value */} onPreview={/* value */} isLoading={/* value */} isDirty={/* value */} className={/* value */} />
```

### SEOFields

- **export**: default
- **props**: title, metaTitle, metaDescription, slug, onMetaTitleChange, onMetaDescriptionChange, className

```tsx
import SEOFields from '@/components/cms/SEOFields';
<SEOFields title={/* value */} metaTitle={/* value */} metaDescription={/* value */} slug={/* value */} onMetaTitleChange={/* value */} onMetaDescriptionChange={/* value */} className={/* value */} />
```

### TagManager

- **export**: default
- **props**: tags, onChange, placeholder, className

```tsx
import TagManager from '@/components/cms/TagManager';
<TagManager tags={/* value */} onChange={/* value */} placeholder={/* value */} className={/* value */} />
```

### TiptapEditor

- **export**: default
- **props**: content, onChange, placeholder, className

```tsx
import TiptapEditor from '@/components/cms/TiptapEditor';
<TiptapEditor content={/* value */} onChange={/* value */} placeholder={/* value */} className={/* value */} />
```

## components/dashboard/enhanced

### DataTable

- **export**: named
- **props**: data, columns, pagination, loading = false, emptyMessage = 'No data available', className = ''

```tsx
import { DataTable } from '@/components/dashboard/enhanced/DataTable';
<DataTable data={/* value */} columns={/* value */} pagination={/* value */} loading = false={/* value */} emptyMessage = 'No data available'={/* value */} className = ''={/* value */} />
```

### PositionChange

- **export**: named
- **props**: change, className = ''

```tsx
import { PositionChange } from '@/components/dashboard/enhanced/PositionChange';
<PositionChange change={/* value */} className = ''={/* value */} />
```

### RankingDistribution

- **export**: named
- **props**: data, title = "Ranking Distribution", description = "Keyword position breakdown and performance insights", className = ''

```tsx
import { RankingDistribution } from '@/components/dashboard/enhanced/RankingDistribution';
<RankingDistribution data={/* value */} title = "Ranking Distribution"={/* value */} description = "Keyword position breakdown and performance insights"={/* value */} className = ''={/* value */} />
```

### StatCard

- **export**: named
- **props**: title, value, change, changeLabel, icon, variant = 'primary', description, className = '', showTrend = true

```tsx
import { StatCard } from '@/components/dashboard/enhanced/StatCard';
<StatCard title={/* value */} value={/* value */} change={/* value */} changeLabel={/* value */} icon={/* value */} variant = 'primary'={/* value */} description={/* value */} className = ''={/* value */} showTrend = true={/* value */} />
```

### StatusBadge

- **export**: named
- **props**: status, variant, icon

```tsx
import { StatusBadge } from '@/components/dashboard/enhanced/StatusBadge';
<StatusBadge status={/* value */} variant={/* value */} icon={/* value */} />
```

### UsageChart

- **export**: named
- **props**: data, currentQuota, totalQuota, title = "Daily Usage Trends", description = "Keyword checks and API usage patterns", className = ''

```tsx
import { UsageChart } from '@/components/dashboard/enhanced/UsageChart';
<UsageChart data={/* value */} currentQuota={/* value */} totalQuota={/* value */} title = "Daily Usage Trends"={/* value */} description = "Keyword checks and API usage patterns"={/* value */} className = ''={/* value */} />
```

## components/dashboard/ui

### Badge

- **export**: named
- **props**: children, variant = 'default', className

```tsx
import { Badge } from '@/components/dashboard/ui/Badge';
<Badge children={/* value */} variant = 'default'={/* value */} className={/* value */} />
```

### Button

- **export**: named
- **props**: children, variant = 'default', size = 'default', className = '', onClick, disabled, ...props

```tsx
import { Button } from '@/components/dashboard/ui/Button';
<Button children={/* value */} variant = 'default'={/* value */} size = 'default'={/* value */} className = ''={/* value */} onClick={/* value */} disabled={/* value */} ...props={/* value */} />
```

### Card

- **export**: named
- **props**: children, className

```tsx
import { Card } from '@/components/dashboard/ui/Card';
<Card children={/* value */} className={/* value */} />
```

### Input

- **export**: named
- **props**: placeholder, className, value, onChange, ...props

```tsx
import { Input } from '@/components/dashboard/ui/Input';
<Input placeholder={/* value */} className={/* value */} value={/* value */} onChange={/* value */} ...props={/* value */} />
```

### Select

- **export**: named
- **props**: children, value, onValueChange, placeholder, className = '', ...props

```tsx
import { Select } from '@/components/dashboard/ui/Select';
<Select children={/* value */} value={/* value */} onValueChange={/* value */} placeholder={/* value */} className = ''={/* value */} ...props={/* value */} />
```

## components/dashboard/widgets

### ActivityTimeline

- **export**: named
- **props**: activities, title = "Recent Activity", description = "Latest updates and changes", maxItems = 5, showViewAll = true, showUpdateBadge = true, onViewAll, className = ''

```tsx
import { ActivityTimeline } from '@/components/dashboard/widgets/ActivityTimeline';
<ActivityTimeline activities={/* value */} title = "Recent Activity"={/* value */} description = "Latest updates and changes"={/* value */} maxItems = 5={/* value */} showViewAll = true={/* value */} showUpdateBadge = true={/* value */} onViewAll={/* value */} className = ''={/* value */} />
```

### PerformanceOverview

- **export**: named
- **props**: metrics, title = "Performance Overview", description = "Key metrics and trends", className = ''

```tsx
import { PerformanceOverview } from '@/components/dashboard/widgets/PerformanceOverview';
<PerformanceOverview metrics={/* value */} title = "Performance Overview"={/* value */} description = "Key metrics and trends"={/* value */} className = ''={/* value */} />
```

### RankingDistribution

- **export**: named
- **props**: data, title = "Ranking Distribution", description = "Overview of your keyword positions", className = ''

```tsx
import { RankingDistribution } from '@/components/dashboard/widgets/RankingDistribution';
<RankingDistribution data={/* value */} title = "Ranking Distribution"={/* value */} description = "Overview of your keyword positions"={/* value */} className = ''={/* value */} />
```

### UsageChart

- **export**: named
- **props**: data, title = "Daily Usage", description = "Track your daily API usage and quota", className = ''

```tsx
import { UsageChart } from '@/components/dashboard/widgets/UsageChart';
<UsageChart data={/* value */} title = "Daily Usage"={/* value */} description = "Track your daily API usage and quota"={/* value */} className = ''={/* value */} />
```

## components/landing

### AdvancedNeonCard

- **export**: default
- **props**: children, className, intensity, mousePosition, isTracking

```tsx
import AdvancedNeonCard from '@/components/landing/AdvancedNeonCard';
<AdvancedNeonCard children={/* value */} className={/* value */} intensity={/* value */} mousePosition={/* value */} isTracking={/* value */} />
```

### ComparisonSection

- **export**: default
- **props**: onGetStarted

```tsx
import ComparisonSection from '@/components/landing/ComparisonSection';
<ComparisonSection onGetStarted={/* value */} />
```

### CoreDifferentiatorsSection

- **export**: default

```tsx
import CoreDifferentiatorsSection from '@/components/landing/CoreDifferentiatorsSection';
<CoreDifferentiatorsSection  />
```

### EnhancedFAQSection

- **export**: default

```tsx
import EnhancedFAQSection from '@/components/landing/EnhancedFAQSection';
<EnhancedFAQSection  />
```

### FinalCTASection

- **export**: default
- **props**: onGetStarted

```tsx
import FinalCTASection from '@/components/landing/FinalCTASection';
<FinalCTASection onGetStarted={/* value */} />
```

### HeroSection

- **export**: default
- **props**: user, onGetStarted, onScrollToDemo

```tsx
import HeroSection from '@/components/landing/HeroSection';
<HeroSection user={/* value */} onGetStarted={/* value */} onScrollToDemo={/* value */} />
```

### HowItWorksSection

- **export**: default

```tsx
import HowItWorksSection from '@/components/landing/HowItWorksSection';
<HowItWorksSection  />
```

### ImprovedHowItWorksSection

- **export**: default

```tsx
import ImprovedHowItWorksSection from '@/components/landing/ImprovedHowItWorksSection';
<ImprovedHowItWorksSection  />
```

### NeonBorderCard

- **export**: default
- **props**: children, className, intensity

```tsx
import NeonBorderCard from '@/components/landing/NeonBorderCard';
<NeonBorderCard children={/* value */} className={/* value */} intensity={/* value */} />
```

### NeonCard

- **export**: default
- **props**: children, className, intensity

```tsx
import NeonCard from '@/components/landing/NeonCard';
<NeonCard children={/* value */} className={/* value */} intensity={/* value */} />
```

### NeonContainer

- **export**: default
- **props**: children, className

```tsx
import NeonContainer from '@/components/landing/NeonContainer';
<NeonContainer children={/* value */} className={/* value */} />
```

### PainPromiseSection

- **export**: default
- **props**: onGetStarted

```tsx
import PainPromiseSection from '@/components/landing/PainPromiseSection';
<PainPromiseSection onGetStarted={/* value */} />
```

### PricingTeaserSection

- **export**: default
- **props**: onGetStarted, onScrollToPricing

```tsx
import PricingTeaserSection from '@/components/landing/PricingTeaserSection';
<PricingTeaserSection onGetStarted={/* value */} onScrollToPricing={/* value */} />
```

### ProductTourSection

- **export**: default

```tsx
import ProductTourSection from '@/components/landing/ProductTourSection';
<ProductTourSection  />
```

### RankTrackerPreview

- **export**: default

```tsx
import RankTrackerPreview from '@/components/landing/RankTrackerPreview';
<RankTrackerPreview  />
```

### UseCasePathsSection

- **export**: default

```tsx
import UseCasePathsSection from '@/components/landing/UseCasePathsSection';
<UseCasePathsSection  />
```

### ValueProofSection

- **export**: default

```tsx
import ValueProofSection from '@/components/landing/ValueProofSection';
<ValueProofSection  />
```

## components/shared

### Background

- **export**: default

```tsx
import Background from '@/components/shared/Background';
<Background  />
```

### DeviceCountryFilter

- **export**: named
- **props**: selectedDevice, selectedCountry, countries, onDeviceChange, onCountryChange, className = '', compact = false

```tsx
import { DeviceCountryFilter } from '@/components/shared/DeviceCountryFilter';
<DeviceCountryFilter selectedDevice={/* value */} selectedCountry={/* value */} countries={/* value */} onDeviceChange={/* value */} onCountryChange={/* value */} className = ''={/* value */} compact = false={/* value */} />
```

### ErrorState

- **export**: named
- **props**: title, message, onRetry, errorId, showHomeButton = false, className

```tsx
import { ErrorState } from '@/components/shared/ErrorState';
<ErrorState title={/* value */} message={/* value */} onRetry={/* value */} errorId={/* value */} showHomeButton = false={/* value */} className={/* value */} />
```

### Footer

- **export**: default
- **props**: siteSettings, onScrollToPricing

```tsx
import Footer from '@/components/shared/Footer';
<Footer siteSettings={/* value */} onScrollToPricing={/* value */} />
```

### Header

- **export**: default
- **props**: user, siteSettings, onAuthAction, navigation, variant, currentPage

```tsx
import Header from '@/components/shared/Header';
<Header user={/* value */} siteSettings={/* value */} onAuthAction={/* value */} navigation={/* value */} variant={/* value */} currentPage={/* value */} />
```

### NoDomainState

- **export**: named
- **props**: title = "No Domains Added", description = "Add your first domain to start tracking keywords and monitoring your search rankings.", buttonText = "Add Your First Domain", redirectRoute = "/dashboard/indexnow/add", className = ""

```tsx
import { NoDomainState } from '@/components/shared/NoDomainState';
<NoDomainState title = "No Domains Added"={/* value */} description = "Add your first domain to start tracking keywords and monitoring your search rankings."={/* value */} buttonText = "Add Your First Domain"={/* value */} redirectRoute = "/dashboard/indexnow/add"={/* value */} className = ""={/* value */} />
```

### SharedDomainSelector

- **export**: named
- **props**: domains, selectedDomainId, selectedDomainInfo, isOpen, onToggle, onDomainSelect, getDomainKeywordCount, showKeywordCount = true, className = '', addDomainRoute = '/dashboard/indexnow/add', placeholder = 'Select Domain'

```tsx
import { SharedDomainSelector } from '@/components/shared/DomainSelector';
<SharedDomainSelector domains={/* value */} selectedDomainId={/* value */} selectedDomainInfo={/* value */} isOpen={/* value */} onToggle={/* value */} onDomainSelect={/* value */} getDomainKeywordCount={/* value */} showKeywordCount = true={/* value */} className = ''={/* value */} addDomainRoute = '/dashboard/indexnow/add'={/* value */} placeholder = 'Select Domain'={/* value */} />
```

## components/trial

### TrialOptions

- **export**: default
- **props**: userCurrency

```tsx
import TrialOptions from '@/components/trial/TrialOptions';
<TrialOptions userCurrency={/* value */} />
```

### TrialStatusCard

- **export**: default

```tsx
import TrialStatusCard from '@/components/trial/TrialStatusCard';
<TrialStatusCard  />
```
