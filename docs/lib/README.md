# Library API

Exported functions, classes, types from `lib/`.

## lib/analytics

### AnalyticsClient

- **kind**: interface

```ts
export interface AnalyticsClient {
```

### AnalyticsConfig

- **kind**: interface

```ts
export interface AnalyticsConfig {
```

### captureException

- **kind**: function

```ts
export function captureException(error: Error, context?: Record<string, any>) {
```

```ts
import { captureException } from '@/lib/analytics/sentry-client.ts';
captureException(/* params */);
```

### captureMessage

- **kind**: function

```ts
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
```

```ts
import { captureMessage } from '@/lib/analytics/sentry-client.ts';
captureMessage(/* params */);
```

### clearSentryUser

- **kind**: function

```ts
export function clearSentryUser() {
```

```ts
import { clearSentryUser } from '@/lib/analytics/sentry-client.ts';
clearSentryUser(/* params */);
```

### clearServerSentryUser

- **kind**: function

```ts
export function clearServerSentryUser() {
```

```ts
import { clearServerSentryUser } from '@/lib/analytics/sentry-server.ts';
clearServerSentryUser(/* params */);
```

### createAnalyticsClient

- **kind**: function

```ts
export function createAnalyticsClient() {
```

```ts
import { createAnalyticsClient } from '@/lib/analytics/analytics-client.ts';
createAnalyticsClient(/* params */);
```

### getAnalyticsClient

- **kind**: function

```ts
export function getAnalyticsClient() {
```

```ts
import { getAnalyticsClient } from '@/lib/analytics/analytics-client.ts';
getAnalyticsClient(/* params */);
```

### getAnalyticsConfig

- **kind**: function

```ts
export function getAnalyticsConfig(): AnalyticsConfig {
```

```ts
import { getAnalyticsConfig } from '@/lib/analytics/config.ts';
getAnalyticsConfig(/* params */);
```

### getPosthogClient

- **kind**: function

```ts
export function getPosthogClient() {
```

```ts
import { getPosthogClient } from '@/lib/analytics/posthog-client.ts';
getPosthogClient(/* params */);
```

### getSubdomainContext

- **kind**: function

```ts
export function getSubdomainContext(): Subdomain {
```

```ts
import { getSubdomainContext } from '@/lib/analytics/config.ts';
getSubdomainContext(/* params */);
```

### identifyPosthogUser

- **kind**: function

```ts
export function identifyPosthogUser(userId: string, properties?: Record<string, any>) {
```

```ts
import { identifyPosthogUser } from '@/lib/analytics/posthog-client.ts';
identifyPosthogUser(/* params */);
```

### identifyUser

- **kind**: function

```ts
export function identifyUser(userId: string, traits?: Record<string, any>) {
```

```ts
import { identifyUser } from '@/lib/analytics/index.ts';
identifyUser(/* params */);
```

### initializeAnalytics

- **kind**: function

```ts
export function initializeAnalytics() {
```

```ts
import { initializeAnalytics } from '@/lib/analytics/index.ts';
initializeAnalytics(/* params */);
```

### initializePosthog

- **kind**: function

```ts
export function initializePosthog() {
```

```ts
import { initializePosthog } from '@/lib/analytics/posthog-client.ts';
initializePosthog(/* params */);
```

### initializeSentry

- **kind**: function

```ts
export function initializeSentry() {
```

```ts
import { initializeSentry } from '@/lib/analytics/sentry-client.ts';
initializeSentry(/* params */);
```

### initializeServerSentry

- **kind**: function

```ts
export function initializeServerSentry() {
```

```ts
import { initializeServerSentry } from '@/lib/analytics/sentry-server.ts';
initializeServerSentry(/* params */);
```

### PageProperties

- **kind**: interface

```ts
export interface PageProperties {
```

### resetPosthogUser

- **kind**: function

```ts
export function resetPosthogUser() {
```

```ts
import { resetPosthogUser } from '@/lib/analytics/posthog-client.ts';
resetPosthogUser(/* params */);
```

### resetUser

- **kind**: function

```ts
export function resetUser() {
```

```ts
import { resetUser } from '@/lib/analytics/index.ts';
resetUser(/* params */);
```

### setSentryUser

- **kind**: function

```ts
export function setSentryUser(user: { id: string; email?: string; username?: string }) {
```

```ts
import { setSentryUser } from '@/lib/analytics/sentry-client.ts';
setSentryUser(/* params */);
```

### setServerSentryUser

- **kind**: function

```ts
export function setServerSentryUser(user: { id: string; email?: string; username?: string }) {
```

```ts
import { setServerSentryUser } from '@/lib/analytics/sentry-server.ts';
setServerSentryUser(/* params */);
```

### Subdomain

- **kind**: type

```ts
export type Subdomain = 'www' | 'dashboard' | 'backend' | 'api' | 'server';
```

### trackError

- **kind**: function

```ts
export function trackError(error: Error, context?: Record<string, any>) {
```

```ts
import { trackError } from '@/lib/analytics/index.ts';
trackError(/* params */);
```

### trackEvent

- **kind**: function

```ts
export function trackEvent(event: string, properties?: Record<string, any>) {
```

```ts
import { trackEvent } from '@/lib/analytics/index.ts';
trackEvent(/* params */);
```

### TrackEventProperties

- **kind**: interface

```ts
export interface TrackEventProperties {
```

### trackPageView

- **kind**: function

```ts
export function trackPageView(path?: string) {
```

```ts
import { trackPageView } from '@/lib/analytics/index.ts';
trackPageView(/* params */);
```

### trackPosthogEvent

- **kind**: function

```ts
export function trackPosthogEvent(event: string, properties?: Record<string, any>) {
```

```ts
import { trackPosthogEvent } from '@/lib/analytics/posthog-client.ts';
trackPosthogEvent(/* params */);
```

### trackServerError

- **kind**: function

```ts
export function trackServerError(error: Error, context?: Record<string, any>) {
```

```ts
import { trackServerError } from '@/lib/analytics/sentry-server.ts';
trackServerError(/* params */);
```

### trackServerMessage

- **kind**: function

```ts
export function trackServerMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
```

```ts
import { trackServerMessage } from '@/lib/analytics/sentry-server.ts';
trackServerMessage(/* params */);
```

### UserTraits

- **kind**: interface

```ts
export interface UserTraits {
```

### withErrorHandler

- **kind**: function

```ts
export function withErrorHandler(handler: ApiHandler): ApiHandler {
```

```ts
import { withErrorHandler } from '@/lib/analytics/error-handler.ts';
withErrorHandler(/* params */);
```

## lib/auth

### AdminAuthService

- **kind**: class

```ts
export class AdminAuthService {
```

```ts
import { AdminAuthService } from '@/lib/auth/admin-auth.ts';
const instance = new AdminAuthService(/* params */);
```

### AdminUser

- **kind**: interface

```ts
export interface AdminUser {
```

### AuthErrorContext

- **kind**: interface

```ts
export interface AuthErrorContext {
```

### AuthErrorHandler

- **kind**: class

```ts
export class AuthErrorHandler {
```

```ts
import { AuthErrorHandler } from '@/lib/auth/auth-error-handler.ts';
const instance = new AuthErrorHandler(/* params */);
```

### AuthService

- **kind**: class

```ts
export class AuthService {
```

```ts
import { AuthService } from '@/lib/auth/auth.ts';
const instance = new AuthService(/* params */);
```

### AuthUser

- **kind**: interface

```ts
export interface AuthUser {
```

### EncryptionService

- **kind**: class

```ts
export class EncryptionService {
```

```ts
import { EncryptionService } from '@/lib/auth/encryption.ts';
const instance = new EncryptionService(/* params */);
```

### getServerAuthUser

- **kind**: function

```ts
export async function getServerAuthUser(request?: NextRequest): Promise<AdminUser | null> {
```

```ts
import { getServerAuthUser } from '@/lib/auth/server-auth.ts';
getServerAuthUser(/* params */);
```

### requireAdminAuth

- **kind**: function

```ts
export async function requireAdminAuth(request?: NextRequest): Promise<AdminUser | null> {
```

```ts
import { requireAdminAuth } from '@/lib/auth/admin-auth.ts';
requireAdminAuth(/* params */);
```

### requireServerAdminAuth

- **kind**: function

```ts
export async function requireServerAdminAuth(request?: NextRequest): Promise<AdminUser> {
```

```ts
import { requireServerAdminAuth } from '@/lib/auth/server-auth.ts';
requireServerAdminAuth(/* params */);
```

### requireServerSuperAdminAuth

- **kind**: function

```ts
export async function requireServerSuperAdminAuth(request?: NextRequest): Promise<AdminUser> {
```

```ts
import { requireServerSuperAdminAuth } from '@/lib/auth/server-auth.ts';
requireServerSuperAdminAuth(/* params */);
```

### requireSuperAdminAuth

- **kind**: function

```ts
export async function requireSuperAdminAuth(request?: NextRequest): Promise<AdminUser | null> {
```

```ts
import { requireSuperAdminAuth } from '@/lib/auth/admin-auth.ts';
requireSuperAdminAuth(/* params */);
```

## lib/cms

### generateExcerpt

- **kind**: function

```ts
export function generateExcerpt(content: string, maxLength: number = 160): string {
```

```ts
import { generateExcerpt } from '@/lib/cms/validation.ts';
generateExcerpt(/* params */);
```

### generateMetaDescription

- **kind**: function

```ts
export function generateMetaDescription(excerpt: string, maxLength: number = 160): string {
```

```ts
import { generateMetaDescription } from '@/lib/cms/validation.ts';
generateMetaDescription(/* params */);
```

### generateMetaTitle

- **kind**: function

```ts
export function generateMetaTitle(title: string, siteName?: string): string {
```

```ts
import { generateMetaTitle } from '@/lib/cms/validation.ts';
generateMetaTitle(/* params */);
```

### generatePageExcerpt

- **kind**: function

```ts
export function generatePageExcerpt(content: string, maxLength: number = 120): string {
```

```ts
import { generatePageExcerpt } from '@/lib/cms/pageValidation.ts';
generatePageExcerpt(/* params */);
```

### generatePageMetaDescription

- **kind**: function

```ts
export function generatePageMetaDescription(content: string, maxLength: number = 160): string {
```

```ts
import { generatePageMetaDescription } from '@/lib/cms/pageValidation.ts';
generatePageMetaDescription(/* params */);
```

### generatePageMetaTitle

- **kind**: function

```ts
export function generatePageMetaTitle(title: string, siteName: string = 'IndexNow Studio'): string {
```

```ts
import { generatePageMetaTitle } from '@/lib/cms/pageValidation.ts';
generatePageMetaTitle(/* params */);
```

### generateSlug

- **kind**: function

```ts
export function generateSlug(title: string): string {
```

```ts
import { generateSlug } from '@/lib/cms/pageValidation.ts';
generateSlug(/* params */);
```

### generateSlug

- **kind**: function

```ts
export function generateSlug(title: string): string {
```

```ts
import { generateSlug } from '@/lib/cms/validation.ts';
generateSlug(/* params */);
```

### getTemplateDescription

- **kind**: function

```ts
export function getTemplateDescription(template: string): string {
```

```ts
import { getTemplateDescription } from '@/lib/cms/pageValidation.ts';
getTemplateDescription(/* params */);
```

### getTemplateDisplayName

- **kind**: function

```ts
export function getTemplateDisplayName(template: string): string {
```

```ts
import { getTemplateDisplayName } from '@/lib/cms/pageValidation.ts';
getTemplateDisplayName(/* params */);
```

### isSlugUnique

- **kind**: function

```ts
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
```

```ts
import { isSlugUnique } from '@/lib/cms/pageValidation.ts';
isSlugUnique(/* params */);
```

### isSlugUnique

- **kind**: function

```ts
export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
```

```ts
import { isSlugUnique } from '@/lib/cms/validation.ts';
isSlugUnique(/* params */);
```

### isValidImageSize

- **kind**: function

```ts
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
```

```ts
import { isValidImageSize } from '@/lib/cms/pageValidation.ts';
isValidImageSize(/* params */);
```

### isValidImageSize

- **kind**: function

```ts
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
```

```ts
import { isValidImageSize } from '@/lib/cms/validation.ts';
isValidImageSize(/* params */);
```

### isValidImageType

- **kind**: function

```ts
export function isValidImageType(file: File): boolean {
```

```ts
import { isValidImageType } from '@/lib/cms/pageValidation.ts';
isValidImageType(/* params */);
```

### isValidImageType

- **kind**: function

```ts
export function isValidImageType(file: File): boolean {
```

```ts
import { isValidImageType } from '@/lib/cms/validation.ts';
isValidImageType(/* params */);
```

### isValidTemplate

- **kind**: function

```ts
export function isValidTemplate(template: string): boolean {
```

```ts
import { isValidTemplate } from '@/lib/cms/pageValidation.ts';
isValidTemplate(/* params */);
```

### PageFormData

- **kind**: type

```ts
export type PageFormData = z.infer<typeof PageFormSchema>
```

### PageStatusUpdateData

- **kind**: type

```ts
export type PageStatusUpdateData = z.infer<typeof PageStatusUpdateSchema>
```

### PostFormData

- **kind**: type

```ts
export type PostFormData = z.infer<typeof PostFormSchema>
```

### PostStatusUpdateData

- **kind**: type

```ts
export type PostStatusUpdateData = z.infer<typeof PostStatusUpdateSchema>
```

### sanitizeContent

- **kind**: function

```ts
export function sanitizeContent(content: string): string {
```

```ts
import { sanitizeContent } from '@/lib/cms/pageValidation.ts';
sanitizeContent(/* params */);
```

### sanitizeContent

- **kind**: function

```ts
export function sanitizeContent(content: string): string {
```

```ts
import { sanitizeContent } from '@/lib/cms/validation.ts';
sanitizeContent(/* params */);
```

### sanitizeCustomCSS

- **kind**: function

```ts
export function sanitizeCustomCSS(css: string): string {
```

```ts
import { sanitizeCustomCSS } from '@/lib/cms/pageValidation.ts';
sanitizeCustomCSS(/* params */);
```

### sanitizeCustomJS

- **kind**: function

```ts
export function sanitizeCustomJS(js: string): string {
```

```ts
import { sanitizeCustomJS } from '@/lib/cms/pageValidation.ts';
sanitizeCustomJS(/* params */);
```

## lib/contexts

### AuthProvider

- **kind**: function

```ts
export function AuthProvider({ children }: AuthProviderProps) {
```

```ts
import { AuthProvider } from '@/lib/contexts/AuthContext.tsx';
AuthProvider(/* params */);
```

### DeviceCountryFilterProvider

- **kind**: function

```ts
export function DeviceCountryFilterProvider({ children }: { children: ReactNode }) {
```

```ts
import { DeviceCountryFilterProvider } from '@/lib/contexts/DeviceCountryFilterContext.tsx';
DeviceCountryFilterProvider(/* params */);
```

### DomainProvider

- **kind**: function

```ts
export function DomainProvider({ children }: { children: ReactNode }) {
```

```ts
import { DomainProvider } from '@/lib/contexts/DomainContext.tsx';
DomainProvider(/* params */);
```

### useAuth

- **kind**: function

```ts
export function useAuth() {
```

```ts
import { useAuth } from '@/lib/contexts/AuthContext.tsx';
useAuth(/* params */);
```

### useDeviceCountryFilter

- **kind**: function

```ts
export function useDeviceCountryFilter() {
```

```ts
import { useDeviceCountryFilter } from '@/lib/contexts/DeviceCountryFilterContext.tsx';
useDeviceCountryFilter(/* params */);
```

### useDomain

- **kind**: function

```ts
export function useDomain() {
```

```ts
import { useDomain } from '@/lib/contexts/DomainContext.tsx';
useDomain(/* params */);
```

## lib/core

### AdminService

- **kind**: class

```ts
export class AdminService {
```

```ts
import { AdminService } from '@/lib/core/migration-examples.ts';
const instance = new AdminService(/* params */);
```

### ApiError

- **kind**: class

```ts
export class ApiError extends Error {
```

```ts
import { ApiError } from '@/lib/core/queryClient.ts';
const instance = new ApiError(/* params */);
```

### ApiErrorResponse

- **kind**: interface

```ts
export interface ApiErrorResponse {
```

### ApiResponse

- **kind**: type

```ts
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse
```

### apiRouteWrapper

- **kind**: function

```ts
export function apiRouteWrapper( handler: (request: NextRequest, auth: AuthenticatedRequest, endpoint: string) => Promise<Response> ) {
```

```ts
import { apiRouteWrapper } from '@/lib/core/api-middleware.ts';
apiRouteWrapper(/* params */);
```

### ApiSuccessResponse

- **kind**: interface

```ts
export interface ApiSuccessResponse<T = any> {
```

### AuthenticatedRequest

- **kind**: interface

```ts
export interface AuthenticatedRequest {
```

### authenticateRequest

- **kind**: function

```ts
export async function authenticateRequest( request: NextRequest, endpoint?: string, method?: string ): Promise<{ success: true; data: AuthenticatedRequest } | { success: false; error: any }> {
```

```ts
import { authenticateRequest } from '@/lib/core/api-middleware.ts';
authenticateRequest(/* params */);
```

### createApiResponse

- **kind**: function

```ts
export function createApiResponse(data: any, status: number = 200) {
```

```ts
import { createApiResponse } from '@/lib/core/api-middleware.ts';
createApiResponse(/* params */);
```

### createErrorResponse

- **kind**: function

```ts
export function createErrorResponse(error: any) {
```

```ts
import { createErrorResponse } from '@/lib/core/api-middleware.ts';
createErrorResponse(/* params */);
```

### createStandardError

- **kind**: function

```ts
export async function createStandardError( type: ErrorType, message: string | Error, statusCode: number = 500, severity: ErrorSeverity = ErrorSeverity.MEDIUM, metadata?: Record<string, any> ): Promise<ApiErrorResponse> {
```

```ts
import { createStandardError } from '@/lib/core/api-response-middleware.ts';
createStandardError(/* params */);
```

### formatError

- **kind**: function

```ts
export function formatError(error: StructuredError, requestId?: string): ApiErrorResponse {
```

```ts
import { formatError } from '@/lib/core/api-response-formatter.ts';
formatError(/* params */);
```

### GET

- **kind**: function

```ts
export async function GET(request: NextRequest) {
```

```ts
import { GET } from '@/lib/core/migration-examples.ts';
GET(/* params */);
```

### GET

- **kind**: function

```ts
export async function GET(request: NextRequest) {
```

```ts
import { GET } from '@/lib/core/migration-examples.ts';
GET(/* params */);
```

### PATCH

- **kind**: function

```ts
export async function PATCH( request: NextRequest, { params }: { params: { id: string } } ) {
```

```ts
import { PATCH } from '@/lib/core/migration-examples.ts';
PATCH(/* params */);
```

### POST

- **kind**: function

```ts
export async function POST(request: NextRequest) {
```

```ts
import { POST } from '@/lib/core/migration-examples.ts';
POST(/* params */);
```

### publicApiRouteWrapper

- **kind**: function

```ts
export function publicApiRouteWrapper( handler: (request: NextRequest, endpoint: string) => Promise<Response> ) {
```

```ts
import { publicApiRouteWrapper } from '@/lib/core/api-middleware.ts';
publicApiRouteWrapper(/* params */);
```

## lib/core/api

### ApiClient

- **kind**: class

```ts
export class ApiClient {
```

```ts
import { ApiClient } from '@/lib/core/api/ApiClient.ts';
const instance = new ApiClient(/* params */);
```

### ApiError

- **kind**: interface

```ts
export interface ApiError {
```

### ApiErrorHandler

- **kind**: class

```ts
export class ApiErrorHandler {
```

```ts
import { ApiErrorHandler } from '@/lib/core/api/ApiErrorHandler.ts';
const instance = new ApiErrorHandler(/* params */);
```

### ApplicationError

- **kind**: class

```ts
export class ApplicationError extends Error {
```

```ts
import { ApplicationError } from '@/lib/core/api/ApiErrorHandler.ts';
const instance = new ApplicationError(/* params */);
```

### composeMiddleware

- **kind**: const

```ts
composeMiddleware = (...middlewares: MiddlewareFunction[]) => {
```

```ts
import { composeMiddleware } from '@/lib/core/api/ApiMiddleware.ts';
composeMiddleware(/* params */);
```

### MiddlewareContext

- **kind**: interface

```ts
export interface MiddlewareContext {
```

### MiddlewareFunction

- **kind**: type

```ts
export type MiddlewareFunction = (
```

### rateLimit

- **kind**: const

```ts
rateLimit = (maxRequests: number, windowMs: number): MiddlewareFunction => {
```

```ts
import { rateLimit } from '@/lib/core/api/ApiMiddleware.ts';
rateLimit(/* params */);
```

## lib/core/config

### AppConfigType

- **kind**: interface

```ts
export interface AppConfigType {
```

### BillingPeriod

- **kind**: type

```ts
export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];
```

### DatabaseConfigType

- **kind**: interface

```ts
export interface DatabaseConfigType {
```

### formatCurrency

- **kind**: const

```ts
formatCurrency = (amount: number, currency: string = PaymentConfig.billing.defaultCurrency): string => {
```

```ts
import { formatCurrency } from '@/lib/core/config/PaymentConfig.ts';
formatCurrency(/* params */);
```

### getPaymentAttempts

- **kind**: const

```ts
getPaymentAttempts = (): number => PaymentConfig.limits.paymentAttempts;
```

```ts
import { getPaymentAttempts } from '@/lib/core/config/PaymentConfig.ts';
getPaymentAttempts(/* params */);
```

### getTableName

- **kind**: const

```ts
getTableName = (prefix: keyof typeof TABLE_PREFIXES, tableName: string): string => {
```

```ts
import { getTableName } from '@/lib/core/config/DatabaseConfig.ts';
getTableName(/* params */);
```

### getTaxRate

- **kind**: const

```ts
getTaxRate = (): number => PaymentConfig.billing.taxRate;
```

```ts
import { getTaxRate } from '@/lib/core/config/PaymentConfig.ts';
getTaxRate(/* params */);
```

### getTrialPeriod

- **kind**: const

```ts
getTrialPeriod = (): number => PaymentConfig.billing.trialPeriodDays;
```

```ts
import { getTrialPeriod } from '@/lib/core/config/PaymentConfig.ts';
getTrialPeriod(/* params */);
```

### isDevelopment

- **kind**: const

```ts
isDevelopment = (): boolean => true;
```

```ts
import { isDevelopment } from '@/lib/core/config/AppConfig.ts';
isDevelopment(/* params */);
```

### isMaintenanceMode

- **kind**: const

```ts
isMaintenanceMode = (): boolean => AppConfig.features.maintenanceMode;
```

```ts
import { isMaintenanceMode } from '@/lib/core/config/AppConfig.ts';
isMaintenanceMode(/* params */);
```

### isMidtransProduction

- **kind**: const

```ts
isMidtransProduction = (): boolean => PaymentConfig.midtrans.isProduction;
```

```ts
import { isMidtransProduction } from '@/lib/core/config/PaymentConfig.ts';
isMidtransProduction(/* params */);
```

### isProduction

- **kind**: const

```ts
isProduction = (): boolean => false;
```

```ts
import { isProduction } from '@/lib/core/config/AppConfig.ts';
isProduction(/* params */);
```

### isStaging

- **kind**: const

```ts
isStaging = (): boolean => false;
```

```ts
import { isStaging } from '@/lib/core/config/AppConfig.ts';
isStaging(/* params */);
```

### PaymentConfigType

- **kind**: interface

```ts
export interface PaymentConfigType {
```

### PaymentMethod

- **kind**: type

```ts
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
```

### PaymentStatus

- **kind**: type

```ts
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
```

### validateConfig

- **kind**: const

```ts
validateConfig = (): void => {
```

```ts
import { validateConfig } from '@/lib/core/config/AppConfig.ts';
validateConfig(/* params */);
```

### validateDatabaseConfig

- **kind**: const

```ts
validateDatabaseConfig = (): void => {
```

```ts
import { validateDatabaseConfig } from '@/lib/core/config/DatabaseConfig.ts';
validateDatabaseConfig(/* params */);
```

### validatePaymentConfig

- **kind**: const

```ts
validatePaymentConfig = (): void => {
```

```ts
import { validatePaymentConfig } from '@/lib/core/config/PaymentConfig.ts';
validatePaymentConfig(/* params */);
```

## lib/core/constants

### buildEndpoint

- **kind**: const

```ts
buildEndpoint = ( endpoint: string, params?: Record<string, string | number | boolean> ): string => {
```

```ts
import { buildEndpoint } from '@/lib/core/constants/ApiEndpoints.ts';
buildEndpoint(/* params */);
```

### EmailTemplate

- **kind**: type

```ts
export type EmailTemplate = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];
```

### isValidEndpoint

- **kind**: const

```ts
isValidEndpoint = (endpoint: string): boolean => {
```

```ts
import { isValidEndpoint } from '@/lib/core/constants/ApiEndpoints.ts';
isValidEndpoint(/* params */);
```

### JobStatus

- **kind**: type

```ts
export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];
```

### JobType

- **kind**: type

```ts
export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];
```

### NotificationType

- **kind**: type

```ts
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
```

### ScheduleType

- **kind**: type

```ts
export type ScheduleType = typeof SCHEDULE_TYPES[keyof typeof SCHEDULE_TYPES];
```

### UserRole

- **kind**: type

```ts
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
```

## lib/database

### createClient

- **kind**: function

```ts
export function createClient() {
```

```ts
import { createClient } from '@/lib/database/supabase-browser.ts';
createClient(/* params */);
```

### DailyStats

- **kind**: type

```ts
export type DailyStats = Database['public']['Tables']['indb_analytics_daily_stats']['Row']
```

### DashboardNotification

- **kind**: type

```ts
export type DashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Row']
```

### Database

- **kind**: interface

```ts
export interface Database {
```

### DatabaseService

- **kind**: class

```ts
export class DatabaseService {
```

```ts
import { DatabaseService } from '@/lib/database/database.ts';
const instance = new DatabaseService(/* params */);
```

### IndexingJob

- **kind**: type

```ts
export type IndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Row']
```

### InsertDashboardNotification

- **kind**: type

```ts
export type InsertDashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Insert']
```

### InsertIndexingJob

- **kind**: type

```ts
export type InsertIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Insert']
```

### InsertKeywordCountry

- **kind**: type

```ts
export type InsertKeywordCountry = Database['public']['Tables']['indb_keyword_countries']['Insert']
```

### InsertKeywordDomain

- **kind**: type

```ts
export type InsertKeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Insert']
```

### InsertKeywordKeyword

- **kind**: type

```ts
export type InsertKeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Insert']
```

### InsertKeywordRanking

- **kind**: type

```ts
export type InsertKeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Insert']
```

### InsertKeywordUsage

- **kind**: type

```ts
export type InsertKeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Insert']
```

### InsertSeRankingIntegration

- **kind**: type

```ts
export type InsertSeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Insert']
```

### InsertSeRankingUsageLog

- **kind**: type

```ts
export type InsertSeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Insert']
```

### InsertServiceAccount

- **kind**: type

```ts
export type InsertServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Insert']
```

### InsertSiteIntegration

- **kind**: type

```ts
export type InsertSiteIntegration = Database['public']['Tables']['indb_site_integration']['Insert']
```

### InsertUrlSubmission

- **kind**: type

```ts
export type InsertUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Insert']
```

### InsertUserProfile

- **kind**: type

```ts
export type InsertUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Insert']
```

### InsertUserSettings

- **kind**: type

```ts
export type InsertUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Insert']
```

### KeywordCountry

- **kind**: type

```ts
export type KeywordCountry = Database['public']['Tables']['indb_keyword_countries']['Row']
```

### KeywordDomain

- **kind**: type

```ts
export type KeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Row']
```

### KeywordKeyword

- **kind**: type

```ts
export type KeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Row']
```

### KeywordRanking

- **kind**: type

```ts
export type KeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Row']
```

### KeywordUsage

- **kind**: type

```ts
export type KeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Row']
```

### SeRankingIntegration

- **kind**: type

```ts
export type SeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Row']
```

### SeRankingUsageLog

- **kind**: type

```ts
export type SeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Row']
```

### ServiceAccount

- **kind**: type

```ts
export type ServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Row']
```

### SiteIntegration

- **kind**: type

```ts
export type SiteIntegration = Database['public']['Tables']['indb_site_integration']['Row']
```

### supabase

- **kind**: const

```ts
supabase = (() => {
```

```ts
import { supabase } from '@/lib/database/supabase.ts';
supabase(/* params */);
```

### UpdateIndexingJob

- **kind**: type

```ts
export type UpdateIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Update']
```

### UpdateKeywordDomain

- **kind**: type

```ts
export type UpdateKeywordDomain = Database['public']['Tables']['indb_keyword_domains']['Update']
```

### UpdateKeywordKeyword

- **kind**: type

```ts
export type UpdateKeywordKeyword = Database['public']['Tables']['indb_keyword_keywords']['Update']
```

### UpdateKeywordRanking

- **kind**: type

```ts
export type UpdateKeywordRanking = Database['public']['Tables']['indb_keyword_rankings']['Update']
```

### UpdateKeywordUsage

- **kind**: type

```ts
export type UpdateKeywordUsage = Database['public']['Tables']['indb_keyword_usage']['Update']
```

### UpdateSeRankingIntegration

- **kind**: type

```ts
export type UpdateSeRankingIntegration = Database['public']['Tables']['indb_site_integration']['Update']
```

### UpdateSeRankingUsageLog

- **kind**: type

```ts
export type UpdateSeRankingUsageLog = Database['public']['Tables']['indb_seranking_usage_logs']['Update']
```

### UpdateServiceAccount

- **kind**: type

```ts
export type UpdateServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Update']
```

### UpdateSiteIntegration

- **kind**: type

```ts
export type UpdateSiteIntegration = Database['public']['Tables']['indb_site_integration']['Update']
```

### UpdateUrlSubmission

- **kind**: type

```ts
export type UpdateUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Update']
```

### UpdateUserProfile

- **kind**: type

```ts
export type UpdateUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Update']
```

### UpdateUserSettings

- **kind**: type

```ts
export type UpdateUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Update']
```

### UrlSubmission

- **kind**: type

```ts
export type UrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Row']
```

### UserProfile

- **kind**: type

```ts
export type UserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Row']
```

### UserSettings

- **kind**: type

```ts
export type UserSettings = Database['public']['Tables']['indb_auth_user_settings']['Row']
```

## lib/email

### ContactEmailService

- **kind**: class

```ts
export class ContactEmailService {
```

```ts
import { ContactEmailService } from '@/lib/email/contact-email-service.ts';
const instance = new ContactEmailService(/* params */);
```

### EmailService

- **kind**: class

```ts
export class EmailService {
```

```ts
import { EmailService } from '@/lib/email/emailService.ts';
const instance = new EmailService(/* params */);
```

### LoginNotificationService

- **kind**: class

```ts
export class LoginNotificationService {
```

```ts
import { LoginNotificationService } from '@/lib/email/login-notification-service.ts';
const instance = new LoginNotificationService(/* params */);
```

## lib/google-services

### GoogleAuthService

- **kind**: class

```ts
export class GoogleAuthService {
```

```ts
import { GoogleAuthService } from '@/lib/google-services/google-auth-service.ts';
const instance = new GoogleAuthService(/* params */);
```

### GoogleIndexingProcessor

- **kind**: class

```ts
export class GoogleIndexingProcessor {
```

```ts
import { GoogleIndexingProcessor } from '@/lib/google-services/google-indexing-processor.ts';
const instance = new GoogleIndexingProcessor(/* params */);
```

### ServiceAccount

- **kind**: interface

```ts
export interface ServiceAccount {
```

## lib/job-management

### BackgroundWorker

- **kind**: class

```ts
export class BackgroundWorker {
```

```ts
import { BackgroundWorker } from '@/lib/job-management/background-worker.ts';
const instance = new BackgroundWorker(/* params */);
```

### BatchProcessor

- **kind**: class

```ts
export class BatchProcessor {
```

```ts
import { BatchProcessor } from '@/lib/job-management/batch-processor.ts';
const instance = new BatchProcessor(/* params */);
```

### getBackgroundServicesStatus

- **kind**: function

```ts
export function getBackgroundServicesStatus() {
```

```ts
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup.ts';
getBackgroundServicesStatus(/* params */);
```

### JobContext

- **kind**: interface

```ts
export interface JobContext {
```

### JobErrorHandler

- **kind**: class

```ts
export class JobErrorHandler {
```

```ts
import { JobErrorHandler } from '@/lib/job-management/JobErrorHandler.ts';
const instance = new JobErrorHandler(/* params */);
```

### JobLoggingService

- **kind**: class

```ts
export class JobLoggingService {
```

```ts
import { JobLoggingService } from '@/lib/job-management/job-logging-service.ts';
const instance = new JobLoggingService(/* params */);
```

### JobMonitor

- **kind**: class

```ts
export class JobMonitor {
```

```ts
import { JobMonitor } from '@/lib/job-management/job-monitor.ts';
const instance = new JobMonitor(/* params */);
```

### JobProcessor

- **kind**: class

```ts
export class JobProcessor {
```

```ts
import { JobProcessor } from '@/lib/job-management/job-processor.ts';
const instance = new JobProcessor(/* params */);
```

### KeywordEnrichmentWorker

- **kind**: class

```ts
export class KeywordEnrichmentWorker {
```

```ts
import { KeywordEnrichmentWorker } from '@/lib/job-management/keyword-enrichment-worker.ts';
const instance = new KeywordEnrichmentWorker(/* params */);
```

### LogLevel

- **kind**: type

```ts
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
```

### TrialMonitorJob

- **kind**: class

```ts
export class TrialMonitorJob {
```

```ts
import { TrialMonitorJob } from '@/lib/job-management/trial-monitor-job.ts';
const instance = new TrialMonitorJob(/* params */);
```

### TrialMonitorService

- **kind**: class

```ts
export class TrialMonitorService {
```

```ts
import { TrialMonitorService } from '@/lib/job-management/trial-monitor.ts';
const instance = new TrialMonitorService(/* params */);
```

### WorkerStartup

- **kind**: class

```ts
export class WorkerStartup {
```

```ts
import { WorkerStartup } from '@/lib/job-management/worker-startup.ts';
const instance = new WorkerStartup(/* params */);
```

## lib/middleware

### createRateLimitResponse

- **kind**: function

```ts
export function createRateLimitResponse(request: NextRequest): NextResponse {
```

```ts
import { createRateLimitResponse } from '@/lib/middleware/admin-rate-limiter.ts';
createRateLimitResponse(/* params */);
```

### isRateLimited

- **kind**: function

```ts
export function isRateLimited(request: NextRequest): boolean {
```

```ts
import { isRateLimited } from '@/lib/middleware/admin-rate-limiter.ts';
isRateLimited(/* params */);
```

### recordFailedAttempt

- **kind**: function

```ts
export function recordFailedAttempt(request: NextRequest): boolean {
```

```ts
import { recordFailedAttempt } from '@/lib/middleware/admin-rate-limiter.ts';
recordFailedAttempt(/* params */);
```

### resetRateLimit

- **kind**: function

```ts
export function resetRateLimit(request: NextRequest): void {
```

```ts
import { resetRateLimit } from '@/lib/middleware/admin-rate-limiter.ts';
resetRateLimit(/* params */);
```

## lib/middleware/auth

### SystemAuthContext

- **kind**: interface

```ts
export interface SystemAuthContext {
```

### verifySystemAuthorization

- **kind**: function

```ts
export async function verifySystemAuthorization(request: NextRequest): Promise<SystemAuthContext> {
```

```ts
import { verifySystemAuthorization } from '@/lib/middleware/auth/SystemAuthMiddleware.ts';
verifySystemAuthorization(/* params */);
```

## lib/monitoring

### ActivityLogData

- **kind**: interface

```ts
export interface ActivityLogData {
```

### ActivityLogEntry

- **kind**: interface

```ts
export interface ActivityLogEntry {
```

### ActivityLogger

- **kind**: class

```ts
export class ActivityLogger {
```

```ts
import { ActivityLogger } from '@/lib/monitoring/activity-logger.ts';
const instance = new ActivityLogger(/* params */);
```

### ErrorHandlingService

- **kind**: class

```ts
export class ErrorHandlingService {
```

```ts
import { ErrorHandlingService } from '@/lib/monitoring/error-handling.ts';
const instance = new ErrorHandlingService(/* params */);
```

### ErrorTracker

- **kind**: class

```ts
export class ErrorTracker {
```

```ts
import { ErrorTracker } from '@/lib/monitoring/error-tracker.ts';
const instance = new ErrorTracker(/* params */);
```

### isTransientError

- **kind**: function

```ts
export function isTransientError(error: any): boolean {
```

```ts
import { isTransientError } from '@/lib/monitoring/error-handling.ts';
isTransientError(/* params */);
```

### QuotaResetMonitor

- **kind**: class

```ts
export class QuotaResetMonitor {
```

```ts
import { QuotaResetMonitor } from '@/lib/monitoring/quota-reset-monitor.ts';
const instance = new QuotaResetMonitor(/* params */);
```

### QuotaService

- **kind**: class

```ts
export class QuotaService {
```

```ts
import { QuotaService } from '@/lib/monitoring/quota-service.ts';
const instance = new QuotaService(/* params */);
```

### StructuredError

- **kind**: interface

```ts
export interface StructuredError {
```

## lib/payment-services

### AutoCancelJob

- **kind**: class

```ts
export class AutoCancelJob {
```

```ts
import { AutoCancelJob } from '@/lib/payment-services/auto-cancel-job.ts';
const instance = new AutoCancelJob(/* params */);
```

### CardTokenData

- **kind**: interface

```ts
export interface CardTokenData {
```

### createChargeWithToken

- **kind**: function

```ts
export async function createChargeWithToken(tokenId: string, orderDetails: any) {
```

```ts
import { createChargeWithToken } from '@/lib/payment-services/midtrans-recurring.ts';
createChargeWithToken(/* params */);
```

### createMidtransService

- **kind**: function

```ts
export function createMidtransService(credentials: any): MidtransService {
```

```ts
import { createMidtransService } from '@/lib/payment-services/midtrans-service.ts';
createMidtransService(/* params */);
```

### createSubscription

- **kind**: function

```ts
export async function createSubscription(payload: any) {
```

```ts
import { createSubscription } from '@/lib/payment-services/midtrans-recurring.ts';
createSubscription(/* params */);
```

### CustomerInfo

- **kind**: interface

```ts
export interface CustomerInfo {
```

### disableSubscription

- **kind**: function

```ts
export async function disableSubscription(id: string) {
```

```ts
import { disableSubscription } from '@/lib/payment-services/midtrans-recurring.ts';
disableSubscription(/* params */);
```

### enableSubscription

- **kind**: function

```ts
export async function enableSubscription(id: string) {
```

```ts
import { enableSubscription } from '@/lib/payment-services/midtrans-recurring.ts';
enableSubscription(/* params */);
```

### getSubscription

- **kind**: function

```ts
export async function getSubscription(id: string) {
```

```ts
import { getSubscription } from '@/lib/payment-services/midtrans-recurring.ts';
getSubscription(/* params */);
```

### getTransactionStatus

- **kind**: function

```ts
export async function getTransactionStatus(orderId: string) {
```

```ts
import { getTransactionStatus } from '@/lib/payment-services/midtrans-recurring.ts';
getTransactionStatus(/* params */);
```

### midtransAuthHeader

- **kind**: function

```ts
export function midtransAuthHeader(): string {
```

```ts
import { midtransAuthHeader } from '@/lib/payment-services/midtrans-recurring.ts';
midtransAuthHeader(/* params */);
```

### MidtransClientService

- **kind**: class

```ts
export class MidtransClientService {
```

```ts
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service.ts';
const instance = new MidtransClientService(/* params */);
```

### midtransFetch

- **kind**: function

```ts
export async function midtransFetch(endpoint: string, options: RequestInit = {}) {
```

```ts
import { midtransFetch } from '@/lib/payment-services/midtrans-recurring.ts';
midtransFetch(/* params */);
```

### MidtransService

- **kind**: class

```ts
export class MidtransService {
```

```ts
import { MidtransService } from '@/lib/payment-services/midtrans-service.ts';
const instance = new MidtransService(/* params */);
```

### PaymentRequest

- **kind**: interface

```ts
export interface PaymentRequest {
```

### PaymentResponse

- **kind**: interface

```ts
export interface PaymentResponse {
```

### PaymentRouter

- **kind**: class

```ts
export class PaymentRouter {
```

```ts
import { PaymentRouter } from '@/lib/payment-services/payment-router.ts';
const instance = new PaymentRouter(/* params */);
```

### RecurringBillingJob

- **kind**: class

```ts
export class RecurringBillingJob {
```

```ts
import { RecurringBillingJob } from '@/lib/payment-services/recurring-billing-job.ts';
const instance = new RecurringBillingJob(/* params */);
```

### SnapCallbacks

- **kind**: interface

```ts
export interface SnapCallbacks {
```

### updateSubscription

- **kind**: function

```ts
export async function updateSubscription(id: string, patch: any) {
```

```ts
import { updateSubscription } from '@/lib/payment-services/midtrans-recurring.ts';
updateSubscription(/* params */);
```

## lib/rank-tracking

### APIKeyManager

- **kind**: class

```ts
export class APIKeyManager {
```

```ts
import { APIKeyManager } from '@/lib/rank-tracking/api-key-manager.ts';
const instance = new APIKeyManager(/* params */);
```

### DailyRankCheckJob

- **kind**: class

```ts
export class DailyRankCheckJob {
```

```ts
import { DailyRankCheckJob } from '@/lib/rank-tracking/daily-rank-check-job.ts';
const instance = new DailyRankCheckJob(/* params */);
```

### FirecrawlRateLimiter

- **kind**: class

```ts
export class FirecrawlRateLimiter {
```

```ts
import { FirecrawlRateLimiter } from '@/lib/rank-tracking/firecrawl-rate-limiter.ts';
const instance = new FirecrawlRateLimiter(/* params */);
```

### RankTracker

- **kind**: class

```ts
export class RankTracker {
```

```ts
import { RankTracker } from '@/lib/rank-tracking/rank-tracker.ts';
const instance = new RankTracker(/* params */);
```

### RankTrackerService

- **kind**: class

```ts
export class RankTrackerService {
```

```ts
import { RankTrackerService } from '@/lib/rank-tracking/rank-tracker-service.ts';
const instance = new RankTrackerService(/* params */);
```

### startImmediateRankCheckInBackground

- **kind**: function

```ts
export function startImmediateRankCheckInBackground( keywordIds: string[], userId: string ): void {
```

```ts
import { startImmediateRankCheckInBackground } from '@/lib/rank-tracking/immediate-rank-check.ts';
startImmediateRankCheckInBackground(/* params */);
```

### triggerImmediateRankCheck

- **kind**: function

```ts
export async function triggerImmediateRankCheck( keywordIds: string[], userId: string ): Promise<void> {
```

```ts
import { triggerImmediateRankCheck } from '@/lib/rank-tracking/immediate-rank-check.ts';
triggerImmediateRankCheck(/* params */);
```

## lib/rank-tracking/seranking/client

### ApiRequestBuilder

- **kind**: class

```ts
export class ApiRequestBuilder {
```

```ts
import { ApiRequestBuilder } from '@/lib/rank-tracking/seranking/client/ApiRequestBuilder.ts';
const instance = new ApiRequestBuilder(/* params */);
```

### RateLimiter

- **kind**: class

```ts
export class RateLimiter {
```

```ts
import { RateLimiter } from '@/lib/rank-tracking/seranking/client/RateLimiter.ts';
const instance = new RateLimiter(/* params */);
```

### SeRankingApiClient

- **kind**: class

```ts
export class SeRankingApiClient {
```

```ts
import { SeRankingApiClient } from '@/lib/rank-tracking/seranking/client/SeRankingApiClient.ts';
const instance = new SeRankingApiClient(/* params */);
```

### SeRankingApiError

- **kind**: class

```ts
export class SeRankingApiError extends Error implements ISeRankingError {
```

```ts
import { SeRankingApiError } from '@/lib/rank-tracking/seranking/client/SeRankingApiClient.ts';
const instance = new SeRankingApiError(/* params */);
```

## lib/rank-tracking/seranking/services

### AggregatedMetrics

- **kind**: interface

```ts
export interface AggregatedMetrics {
```

### ApiCallMetric

- **kind**: interface

```ts
export interface ApiCallMetric {
```

### ApiMetricsCollector

- **kind**: class

```ts
export class ApiMetricsCollector implements IApiMetricsCollector {
```

```ts
import { ApiMetricsCollector } from '@/lib/rank-tracking/seranking/services/ApiMetricsCollector.ts';
const instance = new ApiMetricsCollector(/* params */);
```

### ApiMetricsConfig

- **kind**: interface

```ts
export interface ApiMetricsConfig {
```

### BulkEnrichmentResult

- **kind**: interface

```ts
export interface BulkEnrichmentResult {
```

### CircuitBreakerState

- **kind**: interface

```ts
export interface CircuitBreakerState {
```

### createEnrichmentOrchestrator

- **kind**: function

```ts
export function createEnrichmentOrchestrator(config: Partial<import('./EnrichmentOrchestrator').OrchestratorConfig> = {}) {
```

```ts
import { createEnrichmentOrchestrator } from '@/lib/rank-tracking/seranking/services/index.ts';
createEnrichmentOrchestrator(/* params */);
```

### createEnrichmentQueue

- **kind**: function

```ts
export function createEnrichmentQueue(config: Partial<import('./EnrichmentQueue').QueueConfig> = {}) {
```

```ts
import { createEnrichmentQueue } from '@/lib/rank-tracking/seranking/services/index.ts';
createEnrichmentQueue(/* params */);
```

### createJobProcessor

- **kind**: function

```ts
export function createJobProcessor( queue: EnrichmentQueue, enrichmentService: KeywordEnrichmentService, errorHandler: ErrorHandlingService, config: Partial<import('./JobProcessor').ProcessorConfig> = {} ) {
```

```ts
import { createJobProcessor } from '@/lib/rank-tracking/seranking/services/index.ts';
createJobProcessor(/* params */);
```

### createSeRankingService

- **kind**: function

```ts
export function createSeRankingService(config?: Partial<SeRankingServiceConfig>): SeRankingService {
```

```ts
import { createSeRankingService } from '@/lib/rank-tracking/seranking/services/SeRankingService.ts';
createSeRankingService(/* params */);
```

### createSeRankingServiceWithDefaults

- **kind**: function

```ts
export function createSeRankingServiceWithDefaults(apiKey: string) {
```

```ts
import { createSeRankingServiceWithDefaults } from '@/lib/rank-tracking/seranking/services/index.ts';
createSeRankingServiceWithDefaults(/* params */);
```

### DetailedHealthCheck

- **kind**: interface

```ts
export interface DetailedHealthCheck extends HealthCheckResult {
```

### EnhancedQuotaStatus

- **kind**: interface

```ts
export interface EnhancedQuotaStatus extends QuotaStatus {
```

### EnrichmentOrchestrator

- **kind**: class

```ts
export class EnrichmentOrchestrator extends EventEmitter {
```

```ts
import { EnrichmentOrchestrator } from '@/lib/rank-tracking/seranking/services/EnrichmentOrchestrator.ts';
const instance = new EnrichmentOrchestrator(/* params */);
```

### EnrichmentQueue

- **kind**: class

```ts
export class EnrichmentQueue extends EventEmitter {
```

```ts
import { EnrichmentQueue } from '@/lib/rank-tracking/seranking/services/EnrichmentQueue.ts';
const instance = new EnrichmentQueue(/* params */);
```

### ErrorContext

- **kind**: interface

```ts
export interface ErrorContext {
```

### ErrorHandlingConfig

- **kind**: interface

```ts
export interface ErrorHandlingConfig {
```

### ErrorHandlingService

- **kind**: class

```ts
export class ErrorHandlingService {
```

```ts
import { ErrorHandlingService } from '@/lib/rank-tracking/seranking/services/ErrorHandlingService.ts';
const instance = new ErrorHandlingService(/* params */);
```

### ErrorStats

- **kind**: interface

```ts
export interface ErrorStats {
```

### HealthCheckConfig

- **kind**: interface

```ts
export interface HealthCheckConfig {
```

### HealthChecker

- **kind**: class

```ts
export class HealthChecker implements IHealthChecker {
```

```ts
import { HealthChecker } from '@/lib/rank-tracking/seranking/services/HealthChecker.ts';
const instance = new HealthChecker(/* params */);
```

### IntegrationService

- **kind**: class

```ts
export class IntegrationService implements IIntegrationService {
```

```ts
import { IntegrationService } from '@/lib/rank-tracking/seranking/services/IntegrationService.ts';
const instance = new IntegrationService(/* params */);
```

### IntegrationServiceConfig

- **kind**: interface

```ts
export interface IntegrationServiceConfig {
```

### IntegrationServiceTester

- **kind**: class

```ts
export class IntegrationServiceTester {
```

```ts
import { IntegrationServiceTester } from '@/lib/rank-tracking/seranking/services/IntegrationServiceExample.ts';
const instance = new IntegrationServiceTester(/* params */);
```

### JobProcessor

- **kind**: class

```ts
export class JobProcessor extends EventEmitter {
```

```ts
import { JobProcessor } from '@/lib/rank-tracking/seranking/services/JobProcessor.ts';
const instance = new JobProcessor(/* params */);
```

### KeywordBankService

- **kind**: class

```ts
export class KeywordBankService implements IKeywordBankService {
```

```ts
import { KeywordBankService } from '@/lib/rank-tracking/seranking/services/KeywordBankService.ts';
const instance = new KeywordBankService(/* params */);
```

### KeywordEnrichmentConfig

- **kind**: interface

```ts
export interface KeywordEnrichmentConfig {
```

### KeywordEnrichmentService

- **kind**: class

```ts
export class KeywordEnrichmentService implements IKeywordEnrichmentService {
```

```ts
import { KeywordEnrichmentService } from '@/lib/rank-tracking/seranking/services/KeywordEnrichmentService.ts';
const instance = new KeywordEnrichmentService(/* params */);
```

### KeywordIntelligenceResult

- **kind**: interface

```ts
export interface KeywordIntelligenceResult {
```

### MetricsAlert

- **kind**: interface

```ts
export interface MetricsAlert {
```

### MonitoringServiceManager

- **kind**: class

```ts
export class MonitoringServiceManager {
```

```ts
import { MonitoringServiceManager } from '@/lib/rank-tracking/seranking/services/MonitoringServiceManager.ts';
const instance = new MonitoringServiceManager(/* params */);
```

### MonitoringServiceManagerConfig

- **kind**: interface

```ts
export interface MonitoringServiceManagerConfig {
```

### OrchestratorConfig

- **kind**: interface

```ts
export interface OrchestratorConfig {
```

### PerformanceAnalysis

- **kind**: interface

```ts
export interface PerformanceAnalysis {
```

### ProcessorConfig

- **kind**: interface

```ts
export interface ProcessorConfig {
```

### QueueConfig

- **kind**: interface

```ts
export interface QueueConfig {
```

### QuotaMonitor

- **kind**: class

```ts
export class QuotaMonitor implements IQuotaMonitor {
```

```ts
import { QuotaMonitor } from '@/lib/rank-tracking/seranking/services/QuotaMonitor.ts';
const instance = new QuotaMonitor(/* params */);
```

### QuotaMonitorConfig

- **kind**: interface

```ts
export interface QuotaMonitorConfig {
```

### QuotaPrediction

- **kind**: interface

```ts
export interface QuotaPrediction {
```

### QuotaUsageEntry

- **kind**: interface

```ts
export interface QuotaUsageEntry {
```

### RecoveryActionResult

- **kind**: interface

```ts
export interface RecoveryActionResult {
```

### RecoveryResult

- **kind**: interface

```ts
export interface RecoveryResult<T = any> {
```

### RecoveryStrategy

- **kind**: type

```ts
export type RecoveryStrategy =
```

### runManualTests

- **kind**: function

```ts
export async function runManualTests(): Promise<void> {
```

```ts
import { runManualTests } from '@/lib/rank-tracking/seranking/services/IntegrationServiceExample.ts';
runManualTests(/* params */);
```

### SeRankingService

- **kind**: class

```ts
export class SeRankingService extends EventEmitter implements ISeRankingService {
```

```ts
import { SeRankingService } from '@/lib/rank-tracking/seranking/services/SeRankingService.ts';
const instance = new SeRankingService(/* params */);
```

### SeRankingServiceConfig

- **kind**: interface

```ts
export interface SeRankingServiceConfig {
```

### SystemHealthSummary

- **kind**: interface

```ts
export interface SystemHealthSummary {
```

### SystemMonitoringStatus

- **kind**: interface

```ts
export interface SystemMonitoringStatus {
```

### SystemStatus

- **kind**: interface

```ts
export interface SystemStatus {
```

### UsagePattern

- **kind**: interface

```ts
export interface UsagePattern {
```

### UsageReport

- **kind**: interface

```ts
export interface UsageReport {
```

### ValidationError

- **kind**: interface

```ts
export interface ValidationError {
```

### ValidationResult

- **kind**: interface

```ts
export interface ValidationResult<T = any> {
```

### ValidationService

- **kind**: class

```ts
export class ValidationService {
```

```ts
import { ValidationService } from '@/lib/rank-tracking/seranking/services/ValidationService.ts';
const instance = new ValidationService(/* params */);
```

### ValidationWarning

- **kind**: interface

```ts
export interface ValidationWarning {
```

## lib/rank-tracking/seranking/types

### AnyJobData

- **kind**: type

```ts
export type AnyJobData = SingleKeywordJobData | BulkEnrichmentJobData | CacheRefreshJobData;
```

### ApiMetrics

- **kind**: interface

```ts
export interface ApiMetrics {
```

### ApiRequestConfig

- **kind**: interface

```ts
export interface ApiRequestConfig {
```

### ApiResponseValidationResult

- **kind**: interface

```ts
export interface ApiResponseValidationResult {
```

### BatchEnqueueRequest

- **kind**: interface

```ts
export interface BatchEnqueueRequest {
```

### BulkEnrichmentJobData

- **kind**: interface

```ts
export interface BulkEnrichmentJobData {
```

### BulkKeywordBankOperationResult

- **kind**: interface

```ts
export interface BulkKeywordBankOperationResult {
```

### BulkKeywordRequest

- **kind**: interface

```ts
export interface BulkKeywordRequest {
```

### BulkProcessingJob

- **kind**: interface

```ts
export interface BulkProcessingJob {
```

### CacheRefreshJobData

- **kind**: interface

```ts
export interface CacheRefreshJobData {
```

### CacheStats

- **kind**: interface

```ts
export interface CacheStats {
```

### CacheStatus

- **kind**: interface

```ts
export interface CacheStatus {
```

### CreateJobResponse

- **kind**: interface

```ts
export interface CreateJobResponse {
```

### EnhancedKeywordEntity

- **kind**: interface

```ts
export interface EnhancedKeywordEntity {
```

### EnqueueJobRequest

- **kind**: interface

```ts
export interface EnqueueJobRequest {
```

### EnrichmentJob

- **kind**: interface

```ts
export interface EnrichmentJob {
```

### EnrichmentJobConfig

- **kind**: interface

```ts
export interface EnrichmentJobConfig {
```

### EnrichmentJobData

- **kind**: type

```ts
export type EnrichmentJobData =
```

### EnrichmentJobInsert

- **kind**: type

```ts
export type EnrichmentJobInsert = Omit<EnrichmentJobRecord, 'id' | 'created_at' | 'updated_at'> & {
```

### EnrichmentJobRecord

- **kind**: interface

```ts
export interface EnrichmentJobRecord {
```

### EnrichmentJobUpdate

- **kind**: type

```ts
export type EnrichmentJobUpdate = Partial<Omit<EnrichmentJobRecord, 'id' | 'created_at'>> & {
```

### HealthCheckResult

- **kind**: interface

```ts
export interface HealthCheckResult {
```

### IApiMetricsCollector

- **kind**: interface

```ts
export interface IApiMetricsCollector {
```

### IApiResponseValidator

- **kind**: interface

```ts
export interface IApiResponseValidator {
```

### IEnrichmentQueue

- **kind**: interface

```ts
export interface IEnrichmentQueue {
```

### IHealthChecker

- **kind**: interface

```ts
export interface IHealthChecker {
```

### IIntegrationService

- **kind**: interface

```ts
export interface IIntegrationService {
```

### IJobProcessor

- **kind**: interface

```ts
export interface IJobProcessor {
```

### IKeywordBankService

- **kind**: interface

```ts
export interface IKeywordBankService {
```

### IKeywordEnrichmentService

- **kind**: interface

```ts
export interface IKeywordEnrichmentService {
```

### IKeywordValidator

- **kind**: interface

```ts
export interface IKeywordValidator {
```

### IntegrationSettings

- **kind**: interface

```ts
export interface IntegrationSettings {
```

### IQuotaMonitor

- **kind**: interface

```ts
export interface IQuotaMonitor {
```

### IQuotaValidator

- **kind**: interface

```ts
export interface IQuotaValidator {
```

### IRateLimiter

- **kind**: interface

```ts
export interface IRateLimiter {
```

### ISeRankingApiClient

- **kind**: interface

```ts
export interface ISeRankingApiClient {
```

### ISeRankingErrorHandler

- **kind**: interface

```ts
export interface ISeRankingErrorHandler {
```

### ISeRankingService

- **kind**: interface

```ts
export interface ISeRankingService {
```

### JobError

- **kind**: interface

```ts
export interface JobError {
```

### JobEvent

- **kind**: interface

```ts
export interface JobEvent {
```

### JobPriorityFilter

- **kind**: type

```ts
export type JobPriorityFilter = JobPriority | JobPriority[];
```

### JobProgress

- **kind**: interface

```ts
export interface JobProgress {
```

### JobResult

- **kind**: interface

```ts
export interface JobResult {
```

### JobStatusFilter

- **kind**: type

```ts
export type JobStatusFilter = EnrichmentJobStatus | EnrichmentJobStatus[];
```

### JobStatusResponse

- **kind**: interface

```ts
export interface JobStatusResponse {
```

### JobTypeFilter

- **kind**: type

```ts
export type JobTypeFilter = EnrichmentJobType | EnrichmentJobType[];
```

### KeywordBankAnalytics

- **kind**: interface

```ts
export interface KeywordBankAnalytics {
```

### KeywordBankBatchResult

- **kind**: interface

```ts
export interface KeywordBankBatchResult {
```

### KeywordBankEntity

- **kind**: interface

```ts
export interface KeywordBankEntity {
```

### KeywordBankInsert

- **kind**: interface

```ts
export interface KeywordBankInsert {
```

### KeywordBankOperationResult

- **kind**: interface

```ts
export interface KeywordBankOperationResult {
```

### KeywordBankQuery

- **kind**: interface

```ts
export interface KeywordBankQuery {
```

### KeywordBankQueryResult

- **kind**: interface

```ts
export interface KeywordBankQueryResult {
```

### KeywordBankResult

- **kind**: type

```ts
export type KeywordBankResult = KeywordBankQueryResult;
```

### KeywordBankSearch

- **kind**: type

```ts
export type KeywordBankSearch = KeywordBankQuery;
```

### KeywordBankUpdate

- **kind**: interface

```ts
export interface KeywordBankUpdate {
```

### KeywordBankValidation

- **kind**: interface

```ts
export interface KeywordBankValidation {
```

### KeywordCacheEntry

- **kind**: interface

```ts
export interface KeywordCacheEntry {
```

### KeywordEnrichmentResult

- **kind**: interface

```ts
export interface KeywordEnrichmentResult {
```

### KeywordLookupParams

- **kind**: interface

```ts
export interface KeywordLookupParams {
```

### KeywordSyncStatus

- **kind**: interface

```ts
export interface KeywordSyncStatus {
```

### KeywordValidationResult

- **kind**: interface

```ts
export interface KeywordValidationResult {
```

### KeywordWithIntelligence

- **kind**: type

```ts
export type KeywordWithIntelligence = EnhancedKeywordEntity;
```

### MigrationJob

- **kind**: interface

```ts
export interface MigrationJob {
```

### QueuedJob

- **kind**: interface

```ts
export interface QueuedJob {
```

### QueueFilter

- **kind**: interface

```ts
export interface QueueFilter {
```

### QueueOperationResponse

- **kind**: interface

```ts
export interface QueueOperationResponse {
```

### QueueStats

- **kind**: interface

```ts
export interface QueueStats {
```

### QuotaAlert

- **kind**: interface

```ts
export interface QuotaAlert {
```

### QuotaStatus

- **kind**: interface

```ts
export interface QuotaStatus {
```

### RateLimitConfig

- **kind**: interface

```ts
export interface RateLimitConfig {
```

### RateLimitState

- **kind**: interface

```ts
export interface RateLimitState {
```

### SeRankingApiResponse

- **kind**: type

```ts
export type SeRankingApiResponse = SeRankingKeywordData[];
```

### SeRankingClientConfig

- **kind**: interface

```ts
export interface SeRankingClientConfig {
```

### SeRankingError

- **kind**: interface

```ts
export interface SeRankingError extends Error {
```

### SeRankingKeywordData

- **kind**: interface

```ts
export interface SeRankingKeywordData {
```

### SeRankingKeywordExportRequest

- **kind**: interface

```ts
export interface SeRankingKeywordExportRequest {
```

### SeRankingServiceConfig

- **kind**: type

```ts
export type SeRankingServiceConfig = {
```

### ServiceResponse

- **kind**: interface

```ts
export interface ServiceResponse<T> {
```

### SingleKeywordJobData

- **kind**: interface

```ts
export interface SingleKeywordJobData {
```

### WorkerConfig

- **kind**: interface

```ts
export interface WorkerConfig {
```

### WorkerStatus

- **kind**: interface

```ts
export interface WorkerStatus {
```

## lib/resilience

### CircuitBreaker

- **kind**: class

```ts
export class CircuitBreaker {
```

```ts
import { CircuitBreaker } from '@/lib/resilience/CircuitBreaker.ts';
const instance = new CircuitBreaker(/* params */);
```

### CircuitBreakerConfig

- **kind**: interface

```ts
export interface CircuitBreakerConfig {
```

### CircuitBreakerManager

- **kind**: class

```ts
export class CircuitBreakerManager {
```

```ts
import { CircuitBreakerManager } from '@/lib/resilience/CircuitBreaker.ts';
const instance = new CircuitBreakerManager(/* params */);
```

### CircuitBreakerMetrics

- **kind**: interface

```ts
export interface CircuitBreakerMetrics {
```

### ExponentialBackoff

- **kind**: class

```ts
export class ExponentialBackoff {
```

```ts
import { ExponentialBackoff } from '@/lib/resilience/ExponentialBackoff.ts';
const instance = new ExponentialBackoff(/* params */);
```

### FallbackConfig

- **kind**: interface

```ts
export interface FallbackConfig<T> {
```

### FallbackHandler

- **kind**: class

```ts
export class FallbackHandler<T = any> {
```

```ts
import { FallbackHandler } from '@/lib/resilience/FallbackHandler.ts';
const instance = new FallbackHandler(/* params */);
```

### FallbackStrategy

- **kind**: type

```ts
export type FallbackStrategy<T> =
```

### ResilientOperationConfig

- **kind**: interface

```ts
export interface ResilientOperationConfig<T> {
```

### ResilientOperationExecutor

- **kind**: class

```ts
export class ResilientOperationExecutor {
```

```ts
import { ResilientOperationExecutor } from '@/lib/resilience/ResilientOperationExecutor.ts';
const instance = new ResilientOperationExecutor(/* params */);
```

### RetryConfig

- **kind**: interface

```ts
export interface RetryConfig {
```

### RetryMetrics

- **kind**: interface

```ts
export interface RetryMetrics {
```

## lib/services/admin

### AdminCmsService

- **kind**: class

```ts
export class AdminCmsService {
```

```ts
import { AdminCmsService } from '@/lib/services/admin/AdminCmsService.ts';
const instance = new AdminCmsService(/* params */);
```

### CMSPage

- **kind**: interface

```ts
export interface CMSPage {
```

### CMSPost

- **kind**: interface

```ts
export interface CMSPost {
```

### CMSPostWithAuthor

- **kind**: interface

```ts
export interface CMSPostWithAuthor extends CMSPost {
```

## lib/services/business

### CreateJobRequest

- **kind**: interface

```ts
export interface CreateJobRequest {
```

### CreateUserRequest

- **kind**: interface

```ts
export interface CreateUserRequest {
```

### IndexingJob

- **kind**: interface

```ts
export interface IndexingJob {
```

### IndexingJobService

- **kind**: class

```ts
export class IndexingJobService {
```

```ts
import { IndexingJobService } from '@/lib/services/business/IndexingJobService.ts';
const instance = new IndexingJobService(/* params */);
```

### JobProgress

- **kind**: interface

```ts
export interface JobProgress {
```

### JobSubmission

- **kind**: interface

```ts
export interface JobSubmission {
```

### KeywordUsage

- **kind**: interface

```ts
export interface KeywordUsage {
```

### RankCheckRequest

- **kind**: interface

```ts
export interface RankCheckRequest {
```

### RankCheckResult

- **kind**: interface

```ts
export interface RankCheckResult {
```

### RankHistory

- **kind**: interface

```ts
export interface RankHistory {
```

### RankKeyword

- **kind**: interface

```ts
export interface RankKeyword {
```

### RankTrackingDomain

- **kind**: interface

```ts
export interface RankTrackingDomain {
```

### RankTrackingService

- **kind**: class

```ts
export class RankTrackingService {
```

```ts
import { RankTrackingService } from '@/lib/services/business/RankTrackingService.ts';
const instance = new RankTrackingService(/* params */);
```

### TrialEligibility

- **kind**: interface

```ts
export interface TrialEligibility {
```

### UpdateUserRequest

- **kind**: interface

```ts
export interface UpdateUserRequest {
```

### UserManagementService

- **kind**: class

```ts
export class UserManagementService {
```

```ts
import { UserManagementService } from '@/lib/services/business/UserManagementService.ts';
const instance = new UserManagementService(/* params */);
```

### UserProfile

- **kind**: interface

```ts
export interface UserProfile {
```

### UserQuota

- **kind**: interface

```ts
export interface UserQuota {
```

### UserSettings

- **kind**: interface

```ts
export interface UserSettings {
```

## lib/services/external

### createEmailServiceFromEnv

- **kind**: const

```ts
createEmailServiceFromEnv = (): EmailService => {
```

```ts
import { createEmailServiceFromEnv } from '@/lib/services/external/EmailService.ts';
createEmailServiceFromEnv(/* params */);
```

### DatabaseConnection

- **kind**: interface

```ts
export interface DatabaseConnection {
```

### DeleteResult

- **kind**: interface

```ts
export interface DeleteResult {
```

### EmailAttachment

- **kind**: interface

```ts
export interface EmailAttachment {
```

### EmailConfig

- **kind**: interface

```ts
export interface EmailConfig {
```

### EmailOptions

- **kind**: interface

```ts
export interface EmailOptions {
```

### EmailRecipient

- **kind**: interface

```ts
export interface EmailRecipient {
```

### EmailResult

- **kind**: interface

```ts
export interface EmailResult {
```

### EmailService

- **kind**: class

```ts
export class EmailService {
```

```ts
import { EmailService } from '@/lib/services/external/EmailService.ts';
const instance = new EmailService(/* params */);
```

### getSupabaseService

- **kind**: const

```ts
getSupabaseService = (): SupabaseService => {
```

```ts
import { getSupabaseService } from '@/lib/services/external/SupabaseService.ts';
getSupabaseService(/* params */);
```

### GoogleApiQuota

- **kind**: interface

```ts
export interface GoogleApiQuota {
```

### GoogleApiService

- **kind**: class

```ts
export class GoogleApiService {
```

```ts
import { GoogleApiService } from '@/lib/services/external/GoogleApiService.ts';
const instance = new GoogleApiService(/* params */);
```

### GoogleServiceAccount

- **kind**: interface

```ts
export interface GoogleServiceAccount {
```

### IndexingRequest

- **kind**: interface

```ts
export interface IndexingRequest {
```

### IndexingResponse

- **kind**: interface

```ts
export interface IndexingResponse {
```

### InsertResult

- **kind**: interface

```ts
export interface InsertResult<T = any> {
```

### QueryOptions

- **kind**: interface

```ts
export interface QueryOptions {
```

### QueryResult

- **kind**: interface

```ts
export interface QueryResult<T = any> {
```

### SupabaseService

- **kind**: class

```ts
export class SupabaseService {
```

```ts
import { SupabaseService } from '@/lib/services/external/SupabaseService.ts';
const instance = new SupabaseService(/* params */);
```

### UpdateResult

- **kind**: interface

```ts
export interface UpdateResult<T = any> {
```

## lib/services/indexing

### GoogleApiClient

- **kind**: class

```ts
export class GoogleApiClient {
```

```ts
import { GoogleApiClient } from '@/lib/services/indexing/GoogleApiClient.ts';
const instance = new GoogleApiClient(/* params */);
```

### IndexingJob

- **kind**: interface

```ts
export interface IndexingJob {
```

### IndexingService

- **kind**: class

```ts
export class IndexingService {
```

```ts
import { IndexingService } from '@/lib/services/indexing/IndexingService.ts';
const instance = new IndexingService(/* params */);
```

### JobQueue

- **kind**: class

```ts
export class JobQueue {
```

```ts
import { JobQueue } from '@/lib/services/indexing/JobQueue.ts';
const instance = new JobQueue(/* params */);
```

### QuotaManager

- **kind**: class

```ts
export class QuotaManager {
```

```ts
import { QuotaManager } from '@/lib/services/indexing/QuotaManager.ts';
const instance = new QuotaManager(/* params */);
```

### RetryHandler

- **kind**: class

```ts
export class RetryHandler {
```

```ts
import { RetryHandler } from '@/lib/services/indexing/RetryHandler.ts';
const instance = new RetryHandler(/* params */);
```

### ServiceAccount

- **kind**: interface

```ts
export interface ServiceAccount {
```

### UrlSubmission

- **kind**: interface

```ts
export interface UrlSubmission {
```

## lib/services/infrastructure

### CacheEntry

- **kind**: interface

```ts
export interface CacheEntry<T = any> {
```

### CacheService

- **kind**: class

```ts
export class CacheService {
```

```ts
import { CacheService } from '@/lib/services/infrastructure/CacheService.ts';
const instance = new CacheService(/* params */);
```

### CacheStats

- **kind**: interface

```ts
export interface CacheStats {
```

### getCacheService

- **kind**: const

```ts
getCacheService = (): CacheService => {
```

```ts
import { getCacheService } from '@/lib/services/infrastructure/CacheService.ts';
getCacheService(/* params */);
```

## lib/services/payments

### PaymentServiceFactory

- **kind**: class

```ts
export class PaymentServiceFactory {
```

```ts
import { PaymentServiceFactory } from '@/lib/services/payments/PaymentServiceFactory.ts';
const instance = new PaymentServiceFactory(/* params */);
```

## lib/services/payments/billing

### BillingCycle

- **kind**: interface

```ts
export interface BillingCycle {
```

### BillingCycleService

- **kind**: class

```ts
export class BillingCycleService {
```

```ts
import { BillingCycleService } from '@/lib/services/payments/billing/BillingCycleService.ts';
const instance = new BillingCycleService(/* params */);
```

### CurrencyConverter

- **kind**: class

```ts
export class CurrencyConverter {
```

```ts
import { CurrencyConverter } from '@/lib/services/payments/billing/CurrencyConverter.ts';
const instance = new CurrencyConverter(/* params */);
```

### ExchangeRate

- **kind**: interface

```ts
export interface ExchangeRate {
```

## lib/services/payments/core

### CustomerDetails

- **kind**: interface

```ts
export interface CustomerDetails {
```

### PaymentProcessor

- **kind**: class

```ts
export class PaymentProcessor {
```

```ts
import { PaymentProcessor } from '@/lib/services/payments/core/PaymentProcessor.ts';
const instance = new PaymentProcessor(/* params */);
```

### PaymentRequest

- **kind**: interface

```ts
export interface PaymentRequest {
```

### PaymentResponse

- **kind**: interface

```ts
export interface PaymentResponse {
```

### PaymentValidator

- **kind**: class

```ts
export class PaymentValidator {
```

```ts
import { PaymentValidator } from '@/lib/services/payments/core/PaymentValidator.ts';
const instance = new PaymentValidator(/* params */);
```

### ProcessPaymentRequest

- **kind**: interface

```ts
export interface ProcessPaymentRequest {
```

### ProcessPaymentResponse

- **kind**: interface

```ts
export interface ProcessPaymentResponse {
```

### SubscriptionRequest

- **kind**: interface

```ts
export interface SubscriptionRequest {
```

### SubscriptionResponse

- **kind**: interface

```ts
export interface SubscriptionResponse {
```

### ValidationResult

- **kind**: interface

```ts
export interface ValidationResult {
```

## lib/services/payments/midtrans

### MidtransApiClient

- **kind**: class

```ts
export class MidtransApiClient {
```

```ts
import { MidtransApiClient } from '@/lib/services/payments/midtrans/MidtransApiClient.ts';
const instance = new MidtransApiClient(/* params */);
```

### MidtransConfig

- **kind**: interface

```ts
export interface MidtransConfig {
```

### MidtransRecurringService

- **kind**: class

```ts
export class MidtransRecurringService extends PaymentGateway {
```

```ts
import { MidtransRecurringService } from '@/lib/services/payments/midtrans/MidtransRecurringService.ts';
const instance = new MidtransRecurringService(/* params */);
```

### MidtransSnapService

- **kind**: class

```ts
export class MidtransSnapService extends PaymentGateway {
```

```ts
import { MidtransSnapService } from '@/lib/services/payments/midtrans/MidtransSnapService.ts';
const instance = new MidtransSnapService(/* params */);
```

### MidtransTokenManager

- **kind**: class

```ts
export class MidtransTokenManager {
```

```ts
import { MidtransTokenManager } from '@/lib/services/payments/midtrans/MidtransTokenManager.ts';
const instance = new MidtransTokenManager(/* params */);
```

### TokenData

- **kind**: interface

```ts
export interface TokenData {
```

## lib/services/resilient

### ResilientSerpApiService

- **kind**: class

```ts
export class ResilientSerpApiService {
```

```ts
import { ResilientSerpApiService } from '@/lib/services/resilient/ResilientSerpApiService.ts';
const instance = new ResilientSerpApiService(/* params */);
```

### ResilientSupabaseService

- **kind**: class

```ts
export class ResilientSupabaseService {
```

```ts
import { ResilientSupabaseService } from '@/lib/services/resilient/ResilientSupabaseService.ts';
const instance = new ResilientSupabaseService(/* params */);
```

### SerpApiRequest

- **kind**: interface

```ts
export interface SerpApiRequest {
```

### SerpApiResult

- **kind**: interface

```ts
export interface SerpApiResult {
```

## lib/services/security

### AdminSecurityLogger

- **kind**: class

```ts
export class AdminSecurityLogger {
```

```ts
import { AdminSecurityLogger } from '@/lib/services/security/AdminSecurityLogger.ts';
const instance = new AdminSecurityLogger(/* params */);
```

### SecureServiceRoleHelpers

- **kind**: class

```ts
export class SecureServiceRoleHelpers {
```

```ts
import { SecureServiceRoleHelpers } from '@/lib/services/security/SecureServiceRoleWrapper.ts';
const instance = new SecureServiceRoleHelpers(/* params */);
```

### SecureServiceRoleWrapper

- **kind**: class

```ts
export class SecureServiceRoleWrapper {
```

```ts
import { SecureServiceRoleWrapper } from '@/lib/services/security/SecureServiceRoleWrapper.ts';
const instance = new SecureServiceRoleWrapper(/* params */);
```

### SecurityEvent

- **kind**: interface

```ts
export interface SecurityEvent {
```

### ServiceRoleOperationContext

- **kind**: interface

```ts
export interface ServiceRoleOperationContext {
```

### ServiceRoleQueryOptions

- **kind**: interface

```ts
export interface ServiceRoleQueryOptions {
```

### ServiceRoleSecurityViolationError

- **kind**: class

```ts
export class ServiceRoleSecurityViolationError extends Error {
```

```ts
import { ServiceRoleSecurityViolationError } from '@/lib/services/security/SecureServiceRoleWrapper.ts';
const instance = new ServiceRoleSecurityViolationError(/* params */);
```

### UserOperationContext

- **kind**: interface

```ts
export interface UserOperationContext {
```

## lib/services/security/encryption

### EncryptedResponse

- **kind**: interface

```ts
export interface EncryptedResponse {
```

### EncryptionKeyInfo

- **kind**: interface

```ts
export interface EncryptionKeyInfo {
```

### EncryptionKeyManager

- **kind**: class

```ts
export class EncryptionKeyManager {
```

```ts
import { EncryptionKeyManager } from '@/lib/services/security/encryption/key-manager.ts';
const instance = new EncryptionKeyManager(/* params */);
```

### EncryptionOptions

- **kind**: interface

```ts
export interface EncryptionOptions {
```

### EncryptionResult

- **kind**: interface

```ts
export interface EncryptionResult {
```

### KeyRotationConfig

- **kind**: interface

```ts
export interface KeyRotationConfig {
```

### ResponseEncryptor

- **kind**: class

```ts
export class ResponseEncryptor {
```

```ts
import { ResponseEncryptor } from '@/lib/services/security/encryption/response-encryptor.ts';
const instance = new ResponseEncryptor(/* params */);
```

## lib/services/security/middleware

### ApiVersionController

- **kind**: class

```ts
export class ApiVersionController {
```

```ts
import { ApiVersionController } from '@/lib/services/security/middleware/version-middleware.ts';
const instance = new ApiVersionController(/* params */);
```

### EncryptionMiddlewareResult

- **kind**: interface

```ts
export interface EncryptionMiddlewareResult {
```

### RateLimit

- **kind**: interface

```ts
export interface RateLimit {
```

### ResponseEncryptionMiddleware

- **kind**: class

```ts
export class ResponseEncryptionMiddleware {
```

```ts
import { ResponseEncryptionMiddleware } from '@/lib/services/security/middleware/encryption-middleware.ts';
const instance = new ResponseEncryptionMiddleware(/* params */);
```

### ResponseEncryptionMiddlewareOptions

- **kind**: interface

```ts
export interface ResponseEncryptionMiddlewareOptions {
```

### SecurityMiddlewareResult

- **kind**: interface

```ts
export interface SecurityMiddlewareResult {
```

### SignatureMiddleware

- **kind**: class

```ts
export class SignatureMiddleware {
```

```ts
import { SignatureMiddleware } from '@/lib/services/security/middleware/signature-middleware.ts';
const instance = new SignatureMiddleware(/* params */);
```

### SignatureMiddlewareOptions

- **kind**: interface

```ts
export interface SignatureMiddlewareOptions {
```

### SignatureMiddlewareResult

- **kind**: interface

```ts
export interface SignatureMiddlewareResult {
```

### UnifiedSecurityConfig

- **kind**: interface

```ts
export interface UnifiedSecurityConfig {
```

### UnifiedSecurityMiddleware

- **kind**: class

```ts
export class UnifiedSecurityMiddleware {
```

```ts
import { UnifiedSecurityMiddleware } from '@/lib/services/security/middleware/unified-security-middleware.ts';
const instance = new UnifiedSecurityMiddleware(/* params */);
```

### VersionConfig

- **kind**: interface

```ts
export interface VersionConfig {
```

### VersionDeprecation

- **kind**: interface

```ts
export interface VersionDeprecation {
```

### VersionFeature

- **kind**: interface

```ts
export interface VersionFeature {
```

### VersionValidationResult

- **kind**: interface

```ts
export interface VersionValidationResult {
```

## lib/services/security/validators

### RequestSignatureValidator

- **kind**: class

```ts
export class RequestSignatureValidator {
```

```ts
import { RequestSignatureValidator } from '@/lib/services/security/validators/signature-validator.ts';
const instance = new RequestSignatureValidator(/* params */);
```

### SignatureConfig

- **kind**: interface

```ts
export interface SignatureConfig {
```

### SignatureValidationResult

- **kind**: interface

```ts
export interface SignatureValidationResult {
```

## lib/services/sitemap

### SitemapConfigService

- **kind**: class

```ts
export class SitemapConfigService {
```

```ts
import { SitemapConfigService } from '@/lib/services/sitemap/SitemapConfigService.ts';
const instance = new SitemapConfigService(/* params */);
```

### SitemapDataService

- **kind**: class

```ts
export class SitemapDataService {
```

```ts
import { SitemapDataService } from '@/lib/services/sitemap/SitemapDataService.ts';
const instance = new SitemapDataService(/* params */);
```

### SitemapErrorDetails

- **kind**: interface

```ts
export interface SitemapErrorDetails {
```

### SitemapGenerationMetrics

- **kind**: interface

```ts
export interface SitemapGenerationMetrics {
```

### SitemapMonitor

- **kind**: class

```ts
export class SitemapMonitor {
```

```ts
import { SitemapMonitor } from '@/lib/services/sitemap/SitemapMonitor.ts';
const instance = new SitemapMonitor(/* params */);
```

### SitemapOrchestrator

- **kind**: class

```ts
export class SitemapOrchestrator {
```

```ts
import { SitemapOrchestrator } from '@/lib/services/sitemap/SitemapOrchestrator.ts';
const instance = new SitemapOrchestrator(/* params */);
```

### SitemapTestUtils

- **kind**: class

```ts
export class SitemapTestUtils {
```

```ts
import { SitemapTestUtils } from '@/lib/services/sitemap/SitemapTestUtils.ts';
const instance = new SitemapTestUtils(/* params */);
```

### SitemapUrl

- **kind**: interface

```ts
export interface SitemapUrl {
```

### SitemapUrlBuilder

- **kind**: class

```ts
export class SitemapUrlBuilder {
```

```ts
import { SitemapUrlBuilder } from '@/lib/services/sitemap/SitemapUrlBuilder.ts';
const instance = new SitemapUrlBuilder(/* params */);
```

### SitemapXmlGenerator

- **kind**: class

```ts
export class SitemapXmlGenerator {
```

```ts
import { SitemapXmlGenerator } from '@/lib/services/sitemap/SitemapXmlGenerator.ts';
const instance = new SitemapXmlGenerator(/* params */);
```

### SiteSettings

- **kind**: interface

```ts
export interface SiteSettings {
```

### ValidationResult

- **kind**: interface

```ts
export interface ValidationResult {
```

## lib/services/validation

### JobValidator

- **kind**: class

```ts
export class JobValidator {
```

```ts
import { JobValidator } from '@/lib/services/validation/JobValidator.ts';
const instance = new JobValidator(/* params */);
```

### UrlValidator

- **kind**: class

```ts
export class UrlValidator {
```

```ts
import { UrlValidator } from '@/lib/services/validation/UrlValidator.ts';
const instance = new UrlValidator(/* params */);
```

## lib/services/validation/middleware

### ValidationMiddleware

- **kind**: class

```ts
export class ValidationMiddleware {
```

```ts
import { ValidationMiddleware } from '@/lib/services/validation/middleware/validation-middleware.ts';
const instance = new ValidationMiddleware(/* params */);
```

### ValidationOptions

- **kind**: interface

```ts
export interface ValidationOptions {
```

### ValidationResult

- **kind**: interface

```ts
export interface ValidationResult {
```

### withValidation

- **kind**: const

```ts
withValidation = (options: ValidationOptions) => {
```

```ts
import { withValidation } from '@/lib/services/validation/middleware/validation-middleware.ts';
withValidation(/* params */);
```

## lib/services/validation/sanitizers

### HtmlSanitizer

- **kind**: class

```ts
export class HtmlSanitizer {
```

```ts
import { HtmlSanitizer } from '@/lib/services/validation/sanitizers/html-sanitizer.ts';
const instance = new HtmlSanitizer(/* params */);
```

### HtmlSanitizerOptions

- **kind**: interface

```ts
export interface HtmlSanitizerOptions {
```

### InputSanitizer

- **kind**: class

```ts
export class InputSanitizer {
```

```ts
import { InputSanitizer } from '@/lib/services/validation/sanitizers/input-sanitizer.ts';
const instance = new InputSanitizer(/* params */);
```

### SanitizationOptions

- **kind**: interface

```ts
export interface SanitizationOptions {
```

### UrlSanitizer

- **kind**: class

```ts
export class UrlSanitizer {
```

```ts
import { UrlSanitizer } from '@/lib/services/validation/sanitizers/url-sanitizer.ts';
const instance = new UrlSanitizer(/* params */);
```

### UrlValidationResult

- **kind**: interface

```ts
export interface UrlValidationResult {
```

## lib/services/validation/validators

### BusinessRuleValidationResult

- **kind**: interface

```ts
export interface BusinessRuleValidationResult {
```

### FileValidationOptions

- **kind**: interface

```ts
export interface FileValidationOptions {
```

### FileValidationResult

- **kind**: interface

```ts
export interface FileValidationResult {
```

### FileValidator

- **kind**: class

```ts
export class FileValidator {
```

```ts
import { FileValidator } from '@/lib/services/validation/validators/file-validator.ts';
const instance = new FileValidator(/* params */);
```

### RateLimitConfig

- **kind**: interface

```ts
export interface RateLimitConfig {
```

### RateLimiter

- **kind**: class

```ts
export class RateLimiter {
```

```ts
import { RateLimiter } from '@/lib/services/validation/validators/rate-limiter.ts';
const instance = new RateLimiter(/* params */);
```

### RateLimitResult

- **kind**: interface

```ts
export interface RateLimitResult {
```

## lib/types/api/requests

### AcceptInvitationRequest

- **kind**: interface

```ts
export interface AcceptInvitationRequest {
```

### AddPaymentMethodRequest

- **kind**: interface

```ts
export interface AddPaymentMethodRequest {
```

### BatchSubmitUrlsRequest

- **kind**: interface

```ts
export interface BatchSubmitUrlsRequest {
```

### BulkJobRequest

- **kind**: interface

```ts
export interface BulkJobRequest {
```

### BulkTagRequest

- **kind**: interface

```ts
export interface BulkTagRequest {
```

### BulkUrlRequest

- **kind**: interface

```ts
export interface BulkUrlRequest {
```

### BulkUrlRequestBody

- **kind**: type

```ts
export type BulkUrlRequestBody = z.infer<typeof bulkUrlSchema>;
```

### CancelSubscriptionRequest

- **kind**: interface

```ts
export interface CancelSubscriptionRequest {
```

### ChangePasswordRequest

- **kind**: interface

```ts
export interface ChangePasswordRequest {
```

### ChangePasswordRequestBody

- **kind**: type

```ts
export type ChangePasswordRequestBody = z.infer<typeof changePasswordSchema>;
```

### CloneJobRequest

- **kind**: interface

```ts
export interface CloneJobRequest {
```

### Confirm2FARequest

- **kind**: interface

```ts
export interface Confirm2FARequest {
```

### ConfirmPasswordResetRequest

- **kind**: interface

```ts
export interface ConfirmPasswordResetRequest {
```

### CreateApiKeyRequest

- **kind**: interface

```ts
export interface CreateApiKeyRequest {
```

### CreateApiKeyRequestBody

- **kind**: type

```ts
export type CreateApiKeyRequestBody = z.infer<typeof createApiKeySchema>;
```

### CreateInvoiceRequest

- **kind**: interface

```ts
export interface CreateInvoiceRequest {
```

### CreateJobAlertRequest

- **kind**: interface

```ts
export interface CreateJobAlertRequest {
```

### CreateJobRequest

- **kind**: interface

```ts
export interface CreateJobRequest {
```

### CreateJobRequestBody

- **kind**: type

```ts
export type CreateJobRequestBody = z.infer<typeof createJobSchema>;
```

### CreatePaymentRequest

- **kind**: interface

```ts
export interface CreatePaymentRequest {
```

### CreatePaymentRequestBody

- **kind**: type

```ts
export type CreatePaymentRequestBody = z.infer<typeof createPaymentSchema>;
```

### CreatePromoCodeRequest

- **kind**: interface

```ts
export interface CreatePromoCodeRequest {
```

### CreateRefundRequest

- **kind**: interface

```ts
export interface CreateRefundRequest {
```

### CreateRefundRequestBody

- **kind**: type

```ts
export type CreateRefundRequestBody = z.infer<typeof createRefundSchema>;
```

### CreateServiceAccountRequest

- **kind**: interface

```ts
export interface CreateServiceAccountRequest {
```

### CreateServiceAccountRequestBody

- **kind**: type

```ts
export type CreateServiceAccountRequestBody = z.infer<typeof createServiceAccountSchema>;
```

### CreateSubscriptionRequest

- **kind**: interface

```ts
export interface CreateSubscriptionRequest {
```

### CreateSubscriptionRequestBody

- **kind**: type

```ts
export type CreateSubscriptionRequestBody = z.infer<typeof createSubscriptionSchema>;
```

### CreateUserRequest

- **kind**: interface

```ts
export interface CreateUserRequest {
```

### CreateWebhookRequest

- **kind**: interface

```ts
export interface CreateWebhookRequest {
```

### CustomerInfoRequestBody

- **kind**: type

```ts
export type CustomerInfoRequestBody = z.infer<typeof customerInfoSchema>;
```

### DeleteAccountRequest

- **kind**: interface

```ts
export interface DeleteAccountRequest {
```

### DeleteJobRequest

- **kind**: interface

```ts
export interface DeleteJobRequest {
```

### DeleteServiceAccountRequest

- **kind**: interface

```ts
export interface DeleteServiceAccountRequest {
```

### Disable2FARequest

- **kind**: interface

```ts
export interface Disable2FARequest {
```

### Enable2FARequest

- **kind**: interface

```ts
export interface Enable2FARequest {
```

### ExportUserDataRequest

- **kind**: interface

```ts
export interface ExportUserDataRequest {
```

### GetJobAnalyticsRequest

- **kind**: interface

```ts
export interface GetJobAnalyticsRequest {
```

### GetQuotaUsageRequest

- **kind**: interface

```ts
export interface GetQuotaUsageRequest {
```

### GoogleServiceAccountCredentials

- **kind**: interface

```ts
export interface GoogleServiceAccountCredentials {
```

### InviteUserRequest

- **kind**: interface

```ts
export interface InviteUserRequest {
```

### JobSourceData

- **kind**: interface

```ts
export interface JobSourceData {
```

### LoginRequest

- **kind**: interface

```ts
export interface LoginRequest {
```

### LoginRequestBody

- **kind**: type

```ts
export type LoginRequestBody = z.infer<typeof loginSchema>;
```

### LogoutRequest

- **kind**: interface

```ts
export interface LogoutRequest {
```

### ProcessJobRequest

- **kind**: interface

```ts
export interface ProcessJobRequest {
```

### ProcessPaymentRequest

- **kind**: interface

```ts
export interface ProcessPaymentRequest {
```

### ProcessRefundRequest

- **kind**: interface

```ts
export interface ProcessRefundRequest {
```

### ReactivateAccountRequest

- **kind**: interface

```ts
export interface ReactivateAccountRequest {
```

### RefreshTokenRequest

- **kind**: interface

```ts
export interface RefreshTokenRequest {
```

### RegisterRequest

- **kind**: interface

```ts
export interface RegisterRequest {
```

### RegisterRequestBody

- **kind**: type

```ts
export type RegisterRequestBody = z.infer<typeof registerSchema>;
```

### RemovePaymentMethodRequest

- **kind**: interface

```ts
export interface RemovePaymentMethodRequest {
```

### ResetPasswordRequest

- **kind**: interface

```ts
export interface ResetPasswordRequest {
```

### RevokeApiKeyRequest

- **kind**: interface

```ts
export interface RevokeApiKeyRequest {
```

### SendInvoiceRequest

- **kind**: interface

```ts
export interface SendInvoiceRequest {
```

### SendVerificationEmailRequest

- **kind**: interface

```ts
export interface SendVerificationEmailRequest {
```

### SitemapParseRequest

- **kind**: interface

```ts
export interface SitemapParseRequest {
```

### SitemapParseRequestBody

- **kind**: type

```ts
export type SitemapParseRequestBody = z.infer<typeof sitemapParseSchema>;
```

### SitemapValidateRequest

- **kind**: interface

```ts
export interface SitemapValidateRequest {
```

### SubmitUrlRequest

- **kind**: interface

```ts
export interface SubmitUrlRequest {
```

### SuspendAccountRequest

- **kind**: interface

```ts
export interface SuspendAccountRequest {
```

### TestServiceAccountRequest

- **kind**: interface

```ts
export interface TestServiceAccountRequest {
```

### UpdateApiKeyRequest

- **kind**: interface

```ts
export interface UpdateApiKeyRequest {
```

### UpdateBillingAddressRequest

- **kind**: interface

```ts
export interface UpdateBillingAddressRequest {
```

### UpdateInvoiceRequest

- **kind**: interface

```ts
export interface UpdateInvoiceRequest {
```

### UpdateJobAlertRequest

- **kind**: interface

```ts
export interface UpdateJobAlertRequest {
```

### UpdateJobRequest

- **kind**: interface

```ts
export interface UpdateJobRequest {
```

### UpdatePaymentMethodRequest

- **kind**: interface

```ts
export interface UpdatePaymentMethodRequest {
```

### UpdatePromoCodeRequest

- **kind**: interface

```ts
export interface UpdatePromoCodeRequest {
```

### UpdateServiceAccountRequest

- **kind**: interface

```ts
export interface UpdateServiceAccountRequest {
```

### UpdateSubscriptionRequest

- **kind**: interface

```ts
export interface UpdateSubscriptionRequest {
```

### UpdateUserRequest

- **kind**: interface

```ts
export interface UpdateUserRequest {
```

### UpdateUserRoleRequest

- **kind**: interface

```ts
export interface UpdateUserRoleRequest {
```

### UpdateUserSettingsRequest

- **kind**: interface

```ts
export interface UpdateUserSettingsRequest {
```

### UpdateUserSettingsRequestBody

- **kind**: type

```ts
export type UpdateUserSettingsRequestBody = z.infer<typeof updateUserSettingsSchema>;
```

### UpdateWebhookRequest

- **kind**: interface

```ts
export interface UpdateWebhookRequest {
```

### UrlSubmissionData

- **kind**: interface

```ts
export interface UrlSubmissionData {
```

### ValidatePromoCodeRequest

- **kind**: interface

```ts
export interface ValidatePromoCodeRequest {
```

### ValidatePromoCodeRequestBody

- **kind**: type

```ts
export type ValidatePromoCodeRequestBody = z.infer<typeof validatePromoCodeSchema>;
```

### Verify2FARequest

- **kind**: interface

```ts
export interface Verify2FARequest {
```

### VerifyEmailRequest

- **kind**: interface

```ts
export interface VerifyEmailRequest {
```

## lib/types/api/responses

### AcceptInvitationResponse

- **kind**: interface

```ts
export interface AcceptInvitationResponse extends ApiResponse<{
```

### AddPaymentMethodResponse

- **kind**: interface

```ts
export interface AddPaymentMethodResponse extends ApiResponse<{
```

### ApplyPromoCodeResponse

- **kind**: interface

```ts
export interface ApplyPromoCodeResponse extends ApiResponse<{
```

### BankTransferDetails

- **kind**: interface

```ts
export interface BankTransferDetails {
```

### BankTransferResponse

- **kind**: interface

```ts
export interface BankTransferResponse extends ApiResponse<{
```

### BatchSubmitUrlsResponse

- **kind**: interface

```ts
export interface BatchSubmitUrlsResponse extends ApiResponse<{
```

### BulkJobResponse

- **kind**: interface

```ts
export interface BulkJobResponse extends ApiResponse<{
```

### BulkTagResponse

- **kind**: interface

```ts
export interface BulkTagResponse extends ApiResponse<{
```

### BulkUrlResponse

- **kind**: interface

```ts
export interface BulkUrlResponse extends ApiResponse<{
```

### CancelSubscriptionResponse

- **kind**: interface

```ts
export interface CancelSubscriptionResponse extends ApiResponse<{
```

### ChangePasswordResponse

- **kind**: interface

```ts
export interface ChangePasswordResponse extends ApiResponse<{
```

### CloneJobResponse

- **kind**: interface

```ts
export interface CloneJobResponse extends ApiResponse<{
```

### Confirm2FAResponse

- **kind**: interface

```ts
export interface Confirm2FAResponse extends ApiResponse<{
```

### CreateApiKeyResponse

- **kind**: interface

```ts
export interface CreateApiKeyResponse extends ApiResponse<{
```

### CreateInvoiceResponse

- **kind**: interface

```ts
export interface CreateInvoiceResponse extends ApiResponse<{
```

### CreateJobAlertResponse

- **kind**: interface

```ts
export interface CreateJobAlertResponse extends ApiResponse<{
```

### CreateJobResponse

- **kind**: interface

```ts
export interface CreateJobResponse extends ApiResponse<{
```

### CreatePaymentResponse

- **kind**: interface

```ts
export interface CreatePaymentResponse extends ApiResponse<{
```

### CreateRefundResponse

- **kind**: interface

```ts
export interface CreateRefundResponse extends ApiResponse<{
```

### CreateServiceAccountResponse

- **kind**: interface

```ts
export interface CreateServiceAccountResponse extends ApiResponse<{
```

### CreateSubscriptionResponse

- **kind**: interface

```ts
export interface CreateSubscriptionResponse extends ApiResponse<{
```

### CreateWebhookResponse

- **kind**: interface

```ts
export interface CreateWebhookResponse extends ApiResponse<{
```

### DeleteAccountResponse

- **kind**: interface

```ts
export interface DeleteAccountResponse extends ApiResponse<{
```

### DeleteJobResponse

- **kind**: interface

```ts
export interface DeleteJobResponse extends ApiResponse<{
```

### DeleteServiceAccountResponse

- **kind**: interface

```ts
export interface DeleteServiceAccountResponse extends ApiResponse<{
```

### Disable2FAResponse

- **kind**: interface

```ts
export interface Disable2FAResponse extends ApiResponse<{
```

### Enable2FAResponse

- **kind**: interface

```ts
export interface Enable2FAResponse extends ApiResponse<{
```

### ExportUserDataResponse

- **kind**: interface

```ts
export interface ExportUserDataResponse extends ApiResponse<{
```

### GetApiKeysResponse

- **kind**: interface

```ts
export interface GetApiKeysResponse extends PaginatedResponse<ApiKey> {}
```

### GetBillingHistoryResponse

- **kind**: interface

```ts
export interface GetBillingHistoryResponse extends PaginatedResponse<Transaction> {}
```

### GetBillingStatisticsResponse

- **kind**: interface

```ts
export interface GetBillingStatisticsResponse extends ApiResponse<{
```

### GetDataExportsResponse

- **kind**: interface

```ts
export interface GetDataExportsResponse extends PaginatedResponse<{
```

### GetIndexingQuotaHistoryResponse

- **kind**: interface

```ts
export interface GetIndexingQuotaHistoryResponse extends PaginatedResponse<{
```

### GetInvitationsResponse

- **kind**: interface

```ts
export interface GetInvitationsResponse extends PaginatedResponse<{
```

### GetInvoiceDetailsResponse

- **kind**: interface

```ts
export interface GetInvoiceDetailsResponse extends ApiResponse<{
```

### GetInvoicesResponse

- **kind**: interface

```ts
export interface GetInvoicesResponse extends PaginatedResponse<Invoice> {}
```

### GetJobAlertsResponse

- **kind**: interface

```ts
export interface GetJobAlertsResponse extends PaginatedResponse<{
```

### GetJobAnalyticsResponse

- **kind**: interface

```ts
export interface GetJobAnalyticsResponse extends ApiResponse<{
```

### GetJobProgressResponse

- **kind**: interface

```ts
export interface GetJobProgressResponse extends ApiResponse<JobProgress> {}
```

### GetJobResponse

- **kind**: interface

```ts
export interface GetJobResponse extends ApiResponse<IndexingJob> {}
```

### GetJobsResponse

- **kind**: interface

```ts
export interface GetJobsResponse extends PaginatedResponse<IndexingJob> {}
```

### GetJobStatisticsResponse

- **kind**: interface

```ts
export interface GetJobStatisticsResponse extends ApiResponse<JobStatistics> {}
```

### GetPackageDetailsResponse

- **kind**: interface

```ts
export interface GetPackageDetailsResponse extends ApiResponse<{
```

### GetPackagesResponse

- **kind**: interface

```ts
export interface GetPackagesResponse extends ApiResponse<{
```

### GetPaymentAnalyticsResponse

- **kind**: interface

```ts
export interface GetPaymentAnalyticsResponse extends ApiResponse<{
```

### GetPaymentMethodsResponse

- **kind**: interface

```ts
export interface GetPaymentMethodsResponse extends ApiResponse<{
```

### GetPromoCodesResponse

- **kind**: interface

```ts
export interface GetPromoCodesResponse extends PaginatedResponse<PromoCode> {}
```

### GetQuotaUsageResponse

- **kind**: interface

```ts
export interface GetQuotaUsageResponse extends ApiResponse<{
```

### GetRefundsResponse

- **kind**: interface

```ts
export interface GetRefundsResponse extends PaginatedResponse<Refund> {}
```

### GetServiceAccountResponse

- **kind**: interface

```ts
export interface GetServiceAccountResponse extends ApiResponse<ServiceAccount> {}
```

### GetServiceAccountsResponse

- **kind**: interface

```ts
export interface GetServiceAccountsResponse extends PaginatedResponse<ServiceAccount> {}
```

### GetSubscriptionResponse

- **kind**: interface

```ts
export interface GetSubscriptionResponse extends ApiResponse<{
```

### GetSystemMetricsResponse

- **kind**: interface

```ts
export interface GetSystemMetricsResponse extends ApiResponse<{
```

### GetTrialStatusResponse

- **kind**: interface

```ts
export interface GetTrialStatusResponse extends ApiResponse<{
```

### GetUserActivityResponse

- **kind**: interface

```ts
export interface GetUserActivityResponse extends PaginatedResponse<UserActivity> {}
```

### GetUserAnalyticsResponse

- **kind**: interface

```ts
export interface GetUserAnalyticsResponse extends ApiResponse<{
```

### GetUserDetailsResponse

- **kind**: interface

```ts
export interface GetUserDetailsResponse extends ApiResponse<{
```

### GetUserProfileResponse

- **kind**: interface

```ts
export interface GetUserProfileResponse extends ApiResponse<UserProfile> {}
```

### GetUserQuotaHistoryResponse

- **kind**: interface

```ts
export interface GetUserQuotaHistoryResponse extends PaginatedResponse<{
```

### GetUserQuotaResponse

- **kind**: interface

```ts
export interface GetUserQuotaResponse extends ApiResponse<{
```

### GetUserSessionsResponse

- **kind**: interface

```ts
export interface GetUserSessionsResponse extends PaginatedResponse<UserSession> {}
```

### GetUserSettingsResponse

- **kind**: interface

```ts
export interface GetUserSettingsResponse extends ApiResponse<UserSettings> {}
```

### GetUsersResponse

- **kind**: interface

```ts
export interface GetUsersResponse extends PaginatedResponse<UserProfile> {}
```

### GetUserSubscriptionResponse

- **kind**: interface

```ts
export interface GetUserSubscriptionResponse extends ApiResponse<{
```

### GetWebhooksResponse

- **kind**: interface

```ts
export interface GetWebhooksResponse extends PaginatedResponse<{
```

### IndexingApiResponse

- **kind**: type

```ts
export type IndexingApiResponse<T = any> = ApiResponse<T>;
```

### IndexingErrorResponse

- **kind**: interface

```ts
export interface IndexingErrorResponse {
```

### IndexingPaginatedResponse

- **kind**: type

```ts
export type IndexingPaginatedResponse<T = any> = PaginatedResponse<T>;
```

### IndexingResponse

- **kind**: type

```ts
export type IndexingResponse<T> = ApiResponse<T> | IndexingErrorResponse;
```

### InviteUserResponse

- **kind**: interface

```ts
export interface InviteUserResponse extends ApiResponse<{
```

### LoginResponse

- **kind**: interface

```ts
export interface LoginResponse {
```

### LogoutResponse

- **kind**: interface

```ts
export interface LogoutResponse {
```

### PaymentApiResponse

- **kind**: type

```ts
export type PaymentApiResponse<T = any> = ApiResponse<T>;
```

### PaymentErrorResponse

- **kind**: interface

```ts
export interface PaymentErrorResponse {
```

### PaymentMethodDetails

- **kind**: interface

```ts
export interface PaymentMethodDetails {
```

### PaymentPaginatedResponse

- **kind**: type

```ts
export type PaymentPaginatedResponse<T = any> = PaginatedResponse<T>;
```

### PaymentResponse

- **kind**: type

```ts
export type PaymentResponse<T> = ApiResponse<T> | PaymentErrorResponse;
```

### PaymentStatusResponse

- **kind**: interface

```ts
export interface PaymentStatusResponse extends ApiResponse<{
```

### PaymentTimeline

- **kind**: interface

```ts
export interface PaymentTimeline {
```

### ProcessJobResponse

- **kind**: interface

```ts
export interface ProcessJobResponse extends ApiResponse<{
```

### ProcessPaymentResponse

- **kind**: interface

```ts
export interface ProcessPaymentResponse extends ApiResponse<{
```

### ProcessRefundResponse

- **kind**: interface

```ts
export interface ProcessRefundResponse extends ApiResponse<{
```

### ReactivateAccountResponse

- **kind**: interface

```ts
export interface ReactivateAccountResponse extends ApiResponse<{
```

### RefreshTokenResponse

- **kind**: interface

```ts
export interface RefreshTokenResponse {
```

### RegisterResponse

- **kind**: interface

```ts
export interface RegisterResponse {
```

### RemovePaymentMethodResponse

- **kind**: interface

```ts
export interface RemovePaymentMethodResponse extends ApiResponse<{
```

### RevokeApiKeyResponse

- **kind**: interface

```ts
export interface RevokeApiKeyResponse extends ApiResponse<{
```

### SendInvoiceResponse

- **kind**: interface

```ts
export interface SendInvoiceResponse extends ApiResponse<{
```

### SendVerificationEmailResponse

- **kind**: interface

```ts
export interface SendVerificationEmailResponse extends ApiResponse<{
```

### SitemapParseResponse

- **kind**: interface

```ts
export interface SitemapParseResponse extends ApiResponse<{
```

### SitemapValidateResponse

- **kind**: interface

```ts
export interface SitemapValidateResponse extends ApiResponse<{
```

### StartTrialResponse

- **kind**: interface

```ts
export interface StartTrialResponse extends ApiResponse<{
```

### SubmitUrlResponse

- **kind**: interface

```ts
export interface SubmitUrlResponse extends ApiResponse<{
```

### SuspendAccountResponse

- **kind**: interface

```ts
export interface SuspendAccountResponse extends ApiResponse<{
```

### SystemHealthResponse

- **kind**: interface

```ts
export interface SystemHealthResponse extends ApiResponse<{
```

### TerminateSessionResponse

- **kind**: interface

```ts
export interface TerminateSessionResponse extends ApiResponse<{
```

### TestServiceAccountResponse

- **kind**: interface

```ts
export interface TestServiceAccountResponse extends ApiResponse<{
```

### TestWebhookResponse

- **kind**: interface

```ts
export interface TestWebhookResponse extends ApiResponse<{
```

### UpdateApiKeyResponse

- **kind**: interface

```ts
export interface UpdateApiKeyResponse extends ApiResponse<ApiKey> {}
```

### UpdateJobAlertResponse

- **kind**: interface

```ts
export interface UpdateJobAlertResponse extends ApiResponse<{
```

### UpdateJobResponse

- **kind**: interface

```ts
export interface UpdateJobResponse extends ApiResponse<IndexingJob> {}
```

### UpdatePaymentMethodResponse

- **kind**: interface

```ts
export interface UpdatePaymentMethodResponse extends ApiResponse<PaymentMethodDetails> {}
```

### UpdateServiceAccountResponse

- **kind**: interface

```ts
export interface UpdateServiceAccountResponse extends ApiResponse<ServiceAccount> {}
```

### UpdateSubscriptionResponse

- **kind**: interface

```ts
export interface UpdateSubscriptionResponse extends ApiResponse<{
```

### UpdateUserProfileResponse

- **kind**: interface

```ts
export interface UpdateUserProfileResponse extends ApiResponse<UserProfile> {}
```

### UpdateUserRoleResponse

- **kind**: interface

```ts
export interface UpdateUserRoleResponse extends ApiResponse<{
```

### UpdateUserSettingsResponse

- **kind**: interface

```ts
export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {}
```

### UserApiResponse

- **kind**: type

```ts
export type UserApiResponse<T = any> = ApiResponse<T>;
```

### UserErrorResponse

- **kind**: interface

```ts
export interface UserErrorResponse {
```

### UserPaginatedResponse

- **kind**: type

```ts
export type UserPaginatedResponse<T = any> = PaginatedResponse<T>;
```

### UserResponse

- **kind**: type

```ts
export type UserResponse<T> = ApiResponse<T> | UserErrorResponse;
```

### ValidatePromoCodeResponse

- **kind**: interface

```ts
export interface ValidatePromoCodeResponse extends ApiResponse<{
```

### Verify2FAResponse

- **kind**: interface

```ts
export interface Verify2FAResponse extends ApiResponse<{
```

### VerifyEmailResponse

- **kind**: interface

```ts
export interface VerifyEmailResponse extends ApiResponse<{
```

## lib/types/business

### ApiKey

- **kind**: interface

```ts
export interface ApiKey {
```

### AuthTokens

- **kind**: interface

```ts
export interface AuthTokens {
```

### AvailableLocation

- **kind**: interface

```ts
export interface AvailableLocation {
```

### BatchJob

- **kind**: interface

```ts
export interface BatchJob {
```

### BatchJobRequest

- **kind**: interface

```ts
export interface BatchJobRequest {
```

### BillingPeriod

- **kind**: type

```ts
export type BillingPeriod = 'monthly' | 'annual';
```

### BulkKeywordRequest

- **kind**: interface

```ts
export interface BulkKeywordRequest {
```

### BulkUrlRequest

- **kind**: interface

```ts
export interface BulkUrlRequest {
```

### BulkUrlValidation

- **kind**: interface

```ts
export interface BulkUrlValidation {
```

### ChangePasswordRequest

- **kind**: interface

```ts
export interface ChangePasswordRequest {
```

### Competitor

- **kind**: interface

```ts
export interface Competitor {
```

### CompetitorAnalysis

- **kind**: interface

```ts
export interface CompetitorAnalysis {
```

### CountryCode

- **kind**: type

```ts
export type CountryCode = string; // ISO 3166-1 alpha-2
```

### CreateApiKeyRequest

- **kind**: interface

```ts
export interface CreateApiKeyRequest {
```

### CreateJobRequest

- **kind**: interface

```ts
export interface CreateJobRequest {
```

### CreateKeywordRequest

- **kind**: interface

```ts
export interface CreateKeywordRequest {
```

### CreatePaymentRequest

- **kind**: interface

```ts
export interface CreatePaymentRequest {
```

### CreateServiceAccountRequest

- **kind**: interface

```ts
export interface CreateServiceAccountRequest {
```

### CreateUserRequest

- **kind**: interface

```ts
export interface CreateUserRequest {
```

### Currency

- **kind**: type

```ts
export type Currency = 'USD' | 'IDR' | 'EUR' | 'GBP' | 'SGD' | 'MYR';
```

### CustomerInfo

- **kind**: interface

```ts
export interface CustomerInfo {
```

### Device

- **kind**: type

```ts
export type Device = 'desktop' | 'mobile' | 'tablet';
```

### Dispute

- **kind**: interface

```ts
export interface Dispute {
```

### DomainAnalytics

- **kind**: interface

```ts
export interface DomainAnalytics {
```

### EmailVerification

- **kind**: interface

```ts
export interface EmailVerification {
```

### GenerateReportRequest

- **kind**: interface

```ts
export interface GenerateReportRequest {
```

### GoogleApiError

- **kind**: interface

```ts
export interface GoogleApiError {
```

### GoogleIndexingRequest

- **kind**: interface

```ts
export interface GoogleIndexingRequest {
```

### GoogleIndexingResponse

- **kind**: interface

```ts
export interface GoogleIndexingResponse {
```

### IndexingJob

- **kind**: interface

```ts
export interface IndexingJob {
```

### Invoice

- **kind**: interface

```ts
export interface Invoice {
```

### InvoiceItem

- **kind**: interface

```ts
export interface InvoiceItem {
```

### JobAlert

- **kind**: interface

```ts
export interface JobAlert {
```

### JobExportOptions

- **kind**: interface

```ts
export interface JobExportOptions {
```

### JobImportOptions

- **kind**: interface

```ts
export interface JobImportOptions {
```

### JobMonitoring

- **kind**: interface

```ts
export interface JobMonitoring {
```

### JobProgress

- **kind**: interface

```ts
export interface JobProgress {
```

### JobSchedule

- **kind**: interface

```ts
export interface JobSchedule {
```

### JobSourceData

- **kind**: interface

```ts
export interface JobSourceData {
```

### JobStatistics

- **kind**: interface

```ts
export interface JobStatistics {
```

### JobStatus

- **kind**: type

```ts
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
```

### JobSubmission

- **kind**: interface

```ts
export interface JobSubmission {
```

### JobType

- **kind**: type

```ts
export type JobType = 'sitemap' | 'url-list' | 'single-url' | 'bulk-upload';
```

### KeywordAnalytics

- **kind**: interface

```ts
export interface KeywordAnalytics {
```

### Location

- **kind**: interface

```ts
export interface Location {
```

### LoginAttempt

- **kind**: interface

```ts
export interface LoginAttempt {
```

### MidtransNotification

- **kind**: interface

```ts
export interface MidtransNotification {
```

### MidtransRecurringRequest

- **kind**: interface

```ts
export interface MidtransRecurringRequest {
```

### MidtransSnapResponse

- **kind**: interface

```ts
export interface MidtransSnapResponse {
```

### NotificationSettings

- **kind**: interface

```ts
export interface NotificationSettings {
```

### Order

- **kind**: interface

```ts
export interface Order {
```

### Package

- **kind**: interface

```ts
export interface Package {
```

### PaymentAnalytics

- **kind**: interface

```ts
export interface PaymentAnalytics {
```

### PaymentGateway

- **kind**: interface

```ts
export interface PaymentGateway {
```

### PaymentMethod

- **kind**: type

```ts
export type PaymentMethod = 'midtrans-snap' | 'midtrans-recurring' | 'bank-transfer' | 'credit-card' | 'paypal';
```

### PaymentResponse

- **kind**: interface

```ts
export interface PaymentResponse {
```

### PaymentStatus

- **kind**: type

```ts
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
```

### PaymentWebhook

- **kind**: interface

```ts
export interface PaymentWebhook {
```

### PhoneVerification

- **kind**: interface

```ts
export interface PhoneVerification {
```

### PrivacySettings

- **kind**: interface

```ts
export interface PrivacySettings {
```

### ProcessJobRequest

- **kind**: interface

```ts
export interface ProcessJobRequest {
```

### PromoCode

- **kind**: interface

```ts
export interface PromoCode {
```

### PromoCodeUsage

- **kind**: interface

```ts
export interface PromoCodeUsage {
```

### QuotaAlert

- **kind**: interface

```ts
export interface QuotaAlert {
```

### QuotaMetric

- **kind**: interface

```ts
export interface QuotaMetric {
```

### QuotaUsage

- **kind**: interface

```ts
export interface QuotaUsage {
```

### RankCheckRequest

- **kind**: interface

```ts
export interface RankCheckRequest {
```

### RankCheckResult

- **kind**: interface

```ts
export interface RankCheckResult {
```

### RankHistory

- **kind**: interface

```ts
export interface RankHistory {
```

### RankKeyword

- **kind**: interface

```ts
export interface RankKeyword {
```

### RankReport

- **kind**: interface

```ts
export interface RankReport {
```

### RankTrackingDomain

- **kind**: interface

```ts
export interface RankTrackingDomain {
```

### RankTrackingLimits

- **kind**: interface

```ts
export interface RankTrackingLimits {
```

### RankTrackingQuota

- **kind**: interface

```ts
export interface RankTrackingQuota {
```

### RankTrackingSettings

- **kind**: interface

```ts
export interface RankTrackingSettings {
```

### Refund

- **kind**: interface

```ts
export interface Refund {
```

### ResetPasswordRequest

- **kind**: interface

```ts
export interface ResetPasswordRequest {
```

### SavedPaymentMethod

- **kind**: interface

```ts
export interface SavedPaymentMethod {
```

### ScheduleOptions

- **kind**: interface

```ts
export interface ScheduleOptions {
```

### ScheduleType

- **kind**: type

```ts
export type ScheduleType = 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
```

### SearchEngine

- **kind**: type

```ts
export type SearchEngine = 'google' | 'bing' | 'yahoo';
```

### SearchFeature

- **kind**: interface

```ts
export interface SearchFeature {
```

### SecuritySettings

- **kind**: interface

```ts
export interface SecuritySettings {
```

### SerchResult

- **kind**: interface

```ts
export interface SerchResult {
```

### ServiceAccount

- **kind**: interface

```ts
export interface ServiceAccount {
```

### ServiceAccountQuota

- **kind**: interface

```ts
export interface ServiceAccountQuota {
```

### ServiceAccountStatus

- **kind**: interface

```ts
export interface ServiceAccountStatus {
```

### Session

- **kind**: interface

```ts
export interface Session {
```

### SitemapParseRequest

- **kind**: interface

```ts
export interface SitemapParseRequest {
```

### SitemapParseResponse

- **kind**: interface

```ts
export interface SitemapParseResponse {
```

### SubmissionStatus

- **kind**: type

```ts
export type SubmissionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
```

### SubmissionType

- **kind**: type

```ts
export type SubmissionType = 'URL_UPDATED' | 'URL_DELETED';
```

### Subscription

- **kind**: interface

```ts
export interface Subscription {
```

### SubscriptionChange

- **kind**: interface

```ts
export interface SubscriptionChange {
```

### SubscriptionStatus

- **kind**: type

```ts
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';
```

### Team

- **kind**: interface

```ts
export interface Team {
```

### TeamInvitation

- **kind**: interface

```ts
export interface TeamInvitation {
```

### TeamMember

- **kind**: interface

```ts
export interface TeamMember {
```

### Transaction

- **kind**: interface

```ts
export interface Transaction {
```

### TrialEligibility

- **kind**: interface

```ts
export interface TrialEligibility {
```

### TwoFactorAuth

- **kind**: interface

```ts
export interface TwoFactorAuth {
```

### UpdateJobRequest

- **kind**: interface

```ts
export interface UpdateJobRequest {
```

### UpdateKeywordRequest

- **kind**: interface

```ts
export interface UpdateKeywordRequest {
```

### UpdateProfileRequest

- **kind**: interface

```ts
export interface UpdateProfileRequest {
```

### UpdateServiceAccountRequest

- **kind**: interface

```ts
export interface UpdateServiceAccountRequest {
```

### UpdateSettingsRequest

- **kind**: interface

```ts
export interface UpdateSettingsRequest {
```

### UpdateUserRequest

- **kind**: interface

```ts
export interface UpdateUserRequest {
```

### UrlValidation

- **kind**: interface

```ts
export interface UrlValidation {
```

### User

- **kind**: interface

```ts
export interface User {
```

### UserActivity

- **kind**: interface

```ts
export interface UserActivity {
```

### UserManagementAction

- **kind**: interface

```ts
export interface UserManagementAction {
```

### UserProfile

- **kind**: interface

```ts
export interface UserProfile {
```

### UserQuota

- **kind**: interface

```ts
export interface UserQuota {
```

### UserQuotaLimits

- **kind**: interface

```ts
export interface UserQuotaLimits {
```

### UserQuotaUsage

- **kind**: interface

```ts
export interface UserQuotaUsage {
```

### UserRole

- **kind**: type

```ts
export type UserRole = 'user' | 'admin' | 'super_admin';
```

### UserSettings

- **kind**: interface

```ts
export interface UserSettings {
```

### UserStats

- **kind**: interface

```ts
export interface UserStats {
```

### UserStatus

- **kind**: type

```ts
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
```

### UserSubscription

- **kind**: interface

```ts
export interface UserSubscription {
```

### WebhookEvent

- **kind**: interface

```ts
export interface WebhookEvent {
```

## lib/types/common

### Address

- **kind**: interface

```ts
export interface Address {
```

### ApiError

- **kind**: interface

```ts
export interface ApiError {
```

### ApiResponse

- **kind**: interface

```ts
export interface ApiResponse<T = any> {
```

### AppError

- **kind**: class

```ts
export class AppError extends Error {
```

```ts
import { AppError } from '@/lib/types/common/ErrorTypes.ts';
const instance = new AppError(/* params */);
```

### AudioInfo

- **kind**: interface

```ts
export interface AudioInfo extends FileInfo {
```

### AuditableEntity

- **kind**: interface

```ts
export interface AuditableEntity extends BaseEntity {
```

### BaseEntity

- **kind**: interface

```ts
export interface BaseEntity {
```

### CacheEntry

- **kind**: interface

```ts
export interface CacheEntry<T = any> {
```

### CacheStats

- **kind**: interface

```ts
export interface CacheStats {
```

### Comment

- **kind**: interface

```ts
export interface Comment {
```

### CommentableEntity

- **kind**: interface

```ts
export interface CommentableEntity {
```

### Config

- **kind**: interface

```ts
export interface Config {
```

### Coordinates

- **kind**: interface

```ts
export interface Coordinates {
```

### DateRange

- **kind**: interface

```ts
export interface DateRange {
```

### DeepPartial

- **kind**: type

```ts
export type DeepPartial<T> = {
```

### FileDownload

- **kind**: interface

```ts
export interface FileDownload {
```

### FileInfo

- **kind**: interface

```ts
export interface FileInfo {
```

### FileUpload

- **kind**: interface

```ts
export interface FileUpload {
```

### FilterOperator

- **kind**: type

```ts
export type FilterOperator =
```

### FilterParam

- **kind**: interface

```ts
export interface FilterParam {
```

### HealthCheck

- **kind**: interface

```ts
export interface HealthCheck {
```

### HealthStatus

- **kind**: interface

```ts
export interface HealthStatus {
```

### ID

- **kind**: type

```ts
export type ID = string;
```

### ImageInfo

- **kind**: interface

```ts
export interface ImageInfo extends FileInfo {
```

### KeysOfType

- **kind**: type

```ts
export type KeysOfType<T, U> = {
```

### Location

- **kind**: interface

```ts
export interface Location {
```

### Maybe

- **kind**: type

```ts
export type Maybe<T> = T | null | undefined;
```

### Metric

- **kind**: interface

```ts
export interface Metric {
```

### MetricGroup

- **kind**: interface

```ts
export interface MetricGroup {
```

### NonNullable

- **kind**: type

```ts
export type NonNullable<T> = Exclude<T, null | undefined>;
```

### Notification

- **kind**: interface

```ts
export interface Notification {
```

### NotificationType

- **kind**: type

```ts
export type NotificationType =
```

### Nullable

- **kind**: type

```ts
export type Nullable<T> = T | null;
```

### Optional

- **kind**: type

```ts
export type Optional<T> = T | undefined;
```

### OptionalFields

- **kind**: type

```ts
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### PaginatedResponse

- **kind**: interface

```ts
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
```

### PaginatedResult

- **kind**: interface

```ts
export interface PaginatedResult<T> {
```

### PaginationMeta

- **kind**: interface

```ts
export interface PaginationMeta {
```

### PaginationParams

- **kind**: interface

```ts
export interface PaginationParams {
```

### Period

- **kind**: interface

```ts
export interface Period {
```

### Prettify

- **kind**: type

```ts
export type Prettify<T> = {
```

### Priority

- **kind**: type

```ts
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
```

### RequiredFields

- **kind**: type

```ts
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

### SearchParams

- **kind**: interface

```ts
export interface SearchParams {
```

### SearchResult

- **kind**: interface

```ts
export interface SearchResult<T> extends PaginatedResult<T> {
```

### Setting

- **kind**: interface

```ts
export interface Setting {
```

### SettingsGroup

- **kind**: interface

```ts
export interface SettingsGroup {
```

### SoftDeletableEntity

- **kind**: interface

```ts
export interface SoftDeletableEntity extends BaseEntity {
```

### SortOptions

- **kind**: interface

```ts
export interface SortOptions {
```

### SortParam

- **kind**: interface

```ts
export interface SortParam {
```

### Status

- **kind**: type

```ts
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
```

### Tag

- **kind**: interface

```ts
export interface Tag {
```

### TaggedEntity

- **kind**: interface

```ts
export interface TaggedEntity {
```

### Task

- **kind**: interface

```ts
export interface Task {
```

### TaskResult

- **kind**: interface

```ts
export interface TaskResult {
```

### TimeRange

- **kind**: interface

```ts
export interface TimeRange {
```

### Timestamp

- **kind**: type

```ts
export type Timestamp = string; // ISO 8601 timestamp
```

### UUID

- **kind**: type

```ts
export type UUID = string;
```

### ValidationError

- **kind**: interface

```ts
export interface ValidationError {
```

### VideoInfo

- **kind**: interface

```ts
export interface VideoInfo extends FileInfo {
```

### Visibility

- **kind**: type

```ts
export type Visibility = 'public' | 'private' | 'restricted';
```

### Webhook

- **kind**: interface

```ts
export interface Webhook {
```

### WebhookEvent

- **kind**: interface

```ts
export interface WebhookEvent {
```

## lib/types/components

### AdvancedNeonCardProps

- **kind**: interface

```ts
export interface AdvancedNeonCardProps extends BaseComponentProps {
```

### AlertDialogProps

- **kind**: interface

```ts
export interface AlertDialogProps extends BaseComponentProps {
```

### AlertProps

- **kind**: interface

```ts
export interface AlertProps extends BaseComponentProps {
```

### BaseComponentProps

- **kind**: interface

```ts
export interface BaseComponentProps {
```

### BreadcrumbItem

- **kind**: interface

```ts
export interface BreadcrumbItem {
```

### ButtonProps

- **kind**: interface

```ts
export interface ButtonProps extends BaseComponentProps {
```

### ChartProps

- **kind**: interface

```ts
export interface ChartProps extends BaseComponentProps {
```

### CheckboxProps

- **kind**: interface

```ts
export interface CheckboxProps extends BaseComponentProps {
```

### ClientOnlyWrapperProps

- **kind**: interface

```ts
export interface ClientOnlyWrapperProps extends BaseComponentProps {
```

### ColorPickerProps

- **kind**: interface

```ts
export interface ColorPickerProps extends BaseComponentProps {
```

### ComponentNavigationItem

- **kind**: interface

```ts
export interface ComponentNavigationItem {
```

### DashboardPreviewProps

- **kind**: interface

```ts
export interface DashboardPreviewProps extends BaseComponentProps {
```

### DashboardState

- **kind**: interface

```ts
export interface DashboardState {
```

### DatePickerProps

- **kind**: interface

```ts
export interface DatePickerProps extends BaseComponentProps {
```

### DrawerProps

- **kind**: interface

```ts
export interface DrawerProps extends BaseComponentProps {
```

### FileUploadProps

- **kind**: interface

```ts
export interface FileUploadProps extends BaseComponentProps {
```

### FormActions

- **kind**: interface

```ts
export interface FormActions<T = any> {
```

### FormProps

- **kind**: interface

```ts
export interface FormProps extends BaseComponentProps {
```

### FormState

- **kind**: interface

```ts
export interface FormState<T = any> {
```

### HeaderProps

- **kind**: interface

```ts
export interface HeaderProps extends BaseComponentProps {
```

### IconButtonProps

- **kind**: interface

```ts
export interface IconButtonProps extends BaseComponentProps {
```

### IndexingJobState

- **kind**: interface

```ts
export interface IndexingJobState {
```

### InputProps

- **kind**: interface

```ts
export interface InputProps extends BaseComponentProps {
```

### LayoutProps

- **kind**: interface

```ts
export interface LayoutProps extends BaseComponentProps {
```

### LoadingActions

- **kind**: interface

```ts
export interface LoadingActions {
```

### LoadingProps

- **kind**: interface

```ts
export interface LoadingProps extends BaseComponentProps {
```

### LoadingState

- **kind**: interface

```ts
export interface LoadingState {
```

### ModalActions

- **kind**: interface

```ts
export interface ModalActions {
```

### ModalProps

- **kind**: interface

```ts
export interface ModalProps extends BaseComponentProps {
```

### ModalState

- **kind**: interface

```ts
export interface ModalState {
```

### Notification

- **kind**: interface

```ts
export interface Notification {
```

### NotificationActions

- **kind**: interface

```ts
export interface NotificationActions {
```

### NotificationState

- **kind**: interface

```ts
export interface NotificationState {
```

### NotificationType

- **kind**: type

```ts
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
```

### PaginationProps

- **kind**: interface

```ts
export interface PaginationProps extends BaseComponentProps {
```

### PaymentState

- **kind**: interface

```ts
export interface PaymentState {
```

### ProgressProps

- **kind**: interface

```ts
export interface ProgressProps extends BaseComponentProps {
```

### RadioGroupProps

- **kind**: interface

```ts
export interface RadioGroupProps extends BaseComponentProps {
```

### RadioOption

- **kind**: interface

```ts
export interface RadioOption {
```

### RankTrackingState

- **kind**: interface

```ts
export interface RankTrackingState {
```

### SearchActions

- **kind**: interface

```ts
export interface SearchActions {
```

### SearchState

- **kind**: interface

```ts
export interface SearchState {
```

### SelectOption

- **kind**: interface

```ts
export interface SelectOption {
```

### SelectProps

- **kind**: interface

```ts
export interface SelectProps extends BaseComponentProps {
```

### SidebarActions

- **kind**: interface

```ts
export interface SidebarActions {
```

### SidebarProps

- **kind**: interface

```ts
export interface SidebarProps extends BaseComponentProps {
```

### SidebarState

- **kind**: interface

```ts
export interface SidebarState {
```

### StatsCardProps

- **kind**: interface

```ts
export interface StatsCardProps extends BaseComponentProps {
```

### StepItem

- **kind**: interface

```ts
export interface StepItem {
```

### StepsProps

- **kind**: interface

```ts
export interface StepsProps extends BaseComponentProps {
```

### TableActions

- **kind**: interface

```ts
export interface TableActions<T = any> {
```

### TableColumn

- **kind**: interface

```ts
export interface TableColumn<T = any> {
```

### TableProps

- **kind**: interface

```ts
export interface TableProps<T = any> extends BaseComponentProps {
```

### TableState

- **kind**: interface

```ts
export interface TableState<T = any> {
```

### TabProps

- **kind**: interface

```ts
export interface TabProps extends BaseComponentProps {
```

### TabsProps

- **kind**: interface

```ts
export interface TabsProps extends BaseComponentProps {
```

### TextareaProps

- **kind**: interface

```ts
export interface TextareaProps extends BaseComponentProps {
```

### ThemeActions

- **kind**: interface

```ts
export interface ThemeActions {
```

### ThemeState

- **kind**: interface

```ts
export interface ThemeState {
```

### ToastProps

- **kind**: interface

```ts
export interface ToastProps extends BaseComponentProps {
```

### UploadActions

- **kind**: interface

```ts
export interface UploadActions {
```

### UploadedFile

- **kind**: interface

```ts
export interface UploadedFile {
```

### UploadState

- **kind**: interface

```ts
export interface UploadState {
```

### ValidationActions

- **kind**: interface

```ts
export interface ValidationActions {
```

### ValidationError

- **kind**: interface

```ts
export interface ValidationError {
```

### ValidationState

- **kind**: interface

```ts
export interface ValidationState {
```

### WizardActions

- **kind**: interface

```ts
export interface WizardActions {
```

### WizardState

- **kind**: interface

```ts
export interface WizardState {
```

### WizardStep

- **kind**: interface

```ts
export interface WizardStep {
```

## lib/types/core

### ApiError

- **kind**: interface

```ts
export interface ApiError {
```

### ApiRequest

- **kind**: interface

```ts
export interface ApiRequest extends NextRequest {
```

### ApiResponse

- **kind**: interface

```ts
export interface ApiResponse<T = any> {
```

### AppConfig

- **kind**: interface

```ts
export interface AppConfig {
```

### AuditLog

- **kind**: interface

```ts
export interface AuditLog {
```

### AuditOptions

- **kind**: interface

```ts
export interface AuditOptions {
```

### AuthenticatedRequest

- **kind**: interface

```ts
export interface AuthenticatedRequest extends NextRequest {
```

### BulkOperation

- **kind**: interface

```ts
export interface BulkOperation<T = any> {
```

### BulkOperationResult

- **kind**: interface

```ts
export interface BulkOperationResult<T = any> {
```

### CacheableResponse

- **kind**: interface

```ts
export interface CacheableResponse<T = any> extends ApiResponse<T> {
```

### CacheConfig

- **kind**: interface

```ts
export interface CacheConfig {
```

### ColumnDefinition

- **kind**: interface

```ts
export interface ColumnDefinition {
```

### ConstraintDefinition

- **kind**: interface

```ts
export interface ConstraintDefinition {
```

### DatabaseConfig

- **kind**: interface

```ts
export interface DatabaseConfig {
```

### DatabaseConnection

- **kind**: interface

```ts
export interface DatabaseConnection {
```

### EmailConfig

- **kind**: interface

```ts
export interface EmailConfig {
```

### ExportOptions

- **kind**: interface

```ts
export interface ExportOptions {
```

### ExportResult

- **kind**: interface

```ts
export interface ExportResult {
```

### FeatureFlags

- **kind**: interface

```ts
export interface FeatureFlags {
```

### FilterOption

- **kind**: interface

```ts
export interface FilterOption {
```

### HealthCheckResult

- **kind**: interface

```ts
export interface HealthCheckResult {
```

### ImportOptions

- **kind**: interface

```ts
export interface ImportOptions {
```

### ImportResult

- **kind**: interface

```ts
export interface ImportResult {
```

### IndexDefinition

- **kind**: interface

```ts
export interface IndexDefinition {
```

### MiddlewareContext

- **kind**: interface

```ts
export interface MiddlewareContext {
```

### MonitoringConfig

- **kind**: interface

```ts
export interface MonitoringConfig {
```

### PaginatedResponse

- **kind**: interface

```ts
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
```

### PaymentConfig

- **kind**: interface

```ts
export interface PaymentConfig {
```

### QueryOptions

- **kind**: interface

```ts
export interface QueryOptions {
```

### QueryResult

- **kind**: interface

```ts
export interface QueryResult<T = any> {
```

### RateLimitConfig

- **kind**: interface

```ts
export interface RateLimitConfig {
```

### RateLimitInfo

- **kind**: interface

```ts
export interface RateLimitInfo {
```

### SearchOptions

- **kind**: interface

```ts
export interface SearchOptions {
```

### SecurityConfig

- **kind**: interface

```ts
export interface SecurityConfig {
```

### SystemHealth

- **kind**: interface

```ts
export interface SystemHealth {
```

### TableSchema

- **kind**: interface

```ts
export interface TableSchema {
```

### Transaction

- **kind**: interface

```ts
export interface Transaction {
```

### TriggerDefinition

- **kind**: interface

```ts
export interface TriggerDefinition {
```

### UploadConfig

- **kind**: interface

```ts
export interface UploadConfig {
```

### UploadResult

- **kind**: interface

```ts
export interface UploadResult {
```

### ValidationError

- **kind**: interface

```ts
export interface ValidationError {
```

### ValidationResult

- **kind**: interface

```ts
export interface ValidationResult {
```

### WebhookPayload

- **kind**: interface

```ts
export interface WebhookPayload<T = any> {
```

### WebhookResponse

- **kind**: interface

```ts
export interface WebhookResponse {
```

## lib/types/external

### EmailConfig

- **kind**: interface

```ts
export interface EmailConfig {
```

### EmailOptions

- **kind**: interface

```ts
export interface EmailOptions {
```

### EmailRecipient

- **kind**: interface

```ts
export interface EmailRecipient {
```

### GoogleIndexingRequest

- **kind**: interface

```ts
export interface GoogleIndexingRequest {
```

### GoogleIndexingResponse

- **kind**: interface

```ts
export interface GoogleIndexingResponse {
```

### GoogleServiceAccount

- **kind**: interface

```ts
export interface GoogleServiceAccount {
```

### MidtransConfig

- **kind**: interface

```ts
export interface MidtransConfig {
```

### PaymentGatewayResponse

- **kind**: interface

```ts
export interface PaymentGatewayResponse {
```

## lib/types/global

### AlertThresholds

- **kind**: interface

```ts
export interface AlertThresholds {
```

### AnalyticsEvent

- **kind**: interface

```ts
export interface AnalyticsEvent {
```

### ApiKey

- **kind**: interface

```ts
export interface ApiKey {
```

### ApplicationConfig

- **kind**: interface

```ts
export interface ApplicationConfig {
```

### ApplicationLimits

- **kind**: interface

```ts
export interface ApplicationLimits {
```

### ApplicationMetrics

- **kind**: interface

```ts
export interface ApplicationMetrics {
```

### AuditEvent

- **kind**: interface

```ts
export interface AuditEvent {
```

### AuthState

- **kind**: interface

```ts
export interface AuthState {
```

### BackupJob

- **kind**: interface

```ts
export interface BackupJob {
```

### CPUMetrics

- **kind**: interface

```ts
export interface CPUMetrics {
```

### DatabaseConfig

- **kind**: interface

```ts
export interface DatabaseConfig {
```

### DatabaseMetrics

- **kind**: interface

```ts
export interface DatabaseMetrics {
```

### DiskMetrics

- **kind**: interface

```ts
export interface DiskMetrics {
```

### EmailConfig

- **kind**: interface

```ts
export interface EmailConfig {
```

### EmailVerification

- **kind**: interface

```ts
export interface EmailVerification {
```

### EncryptionConfig

- **kind**: interface

```ts
export interface EncryptionConfig {
```

### Environment

- **kind**: type

```ts
export type Environment = 'development' | 'production' | 'testing';
```

### ErrorContext

- **kind**: interface

```ts
export interface ErrorContext {
```

### ExternalService

- **kind**: interface

```ts
export interface ExternalService {
```

### FeatureFlags

- **kind**: interface

```ts
export interface FeatureFlags {
```

### FileAttachment

- **kind**: interface

```ts
export interface FileAttachment {
```

### GeoLocation

- **kind**: interface

```ts
export interface GeoLocation {
```

### Incident

- **kind**: interface

```ts
export interface Incident {
```

### IncidentUpdate

- **kind**: interface

```ts
export interface IncidentUpdate {
```

### JobQueue

- **kind**: interface

```ts
export interface JobQueue {
```

### LogLevel

- **kind**: type

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

### MaintenanceWindow

- **kind**: interface

```ts
export interface MaintenanceWindow {
```

### MemoryMetrics

- **kind**: interface

```ts
export interface MemoryMetrics {
```

### MonitoringConfig

- **kind**: interface

```ts
export interface MonitoringConfig {
```

### NavigationItem

- **kind**: interface

```ts
export interface NavigationItem {
```

### NetworkMetrics

- **kind**: interface

```ts
export interface NetworkMetrics {
```

### NotificationSettings

- **kind**: interface

```ts
export interface NotificationSettings {
```

### OnboardingState

- **kind**: interface

```ts
export interface OnboardingState {
```

### OnboardingStep

- **kind**: interface

```ts
export interface OnboardingStep {
```

### PerformanceMetrics

- **kind**: interface

```ts
export interface PerformanceMetrics {
```

### PrivacySettings

- **kind**: interface

```ts
export interface PrivacySettings {
```

### RateLimitConfig

- **kind**: interface

```ts
export interface RateLimitConfig {
```

### RedisConfig

- **kind**: interface

```ts
export interface RedisConfig {
```

### SecurityConfig

- **kind**: interface

```ts
export interface SecurityConfig {
```

### SecuritySettings

- **kind**: interface

```ts
export interface SecuritySettings {
```

### ServiceHealth

- **kind**: interface

```ts
export interface ServiceHealth {
```

### SessionInfo

- **kind**: interface

```ts
export interface SessionInfo {
```

### StorageConfig

- **kind**: interface

```ts
export interface StorageConfig {
```

### SubscriptionStatus

- **kind**: type

```ts
export type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'trial' | 'cancelled';
```

### SystemConfig

- **kind**: interface

```ts
export interface SystemConfig {
```

### SystemHealth

- **kind**: interface

```ts
export interface SystemHealth {
```

### SystemJob

- **kind**: interface

```ts
export interface SystemJob {
```

### SystemLog

- **kind**: interface

```ts
export interface SystemLog {
```

### SystemMetrics

- **kind**: interface

```ts
export interface SystemMetrics {
```

### SystemStatus

- **kind**: type

```ts
export type SystemStatus = 'operational' | 'degraded' | 'maintenance' | 'outage';
```

### Team

- **kind**: interface

```ts
export interface Team {
```

### TeamMember

- **kind**: interface

```ts
export interface TeamMember {
```

### TeamSettings

- **kind**: interface

```ts
export interface TeamSettings {
```

### ThemeConfig

- **kind**: interface

```ts
export interface ThemeConfig {
```

### ThemeMode

- **kind**: type

```ts
export type ThemeMode = 'light' | 'dark' | 'auto';
```

### TrialEligibility

- **kind**: interface

```ts
export interface TrialEligibility {
```

### TwoFactorAuth

- **kind**: interface

```ts
export interface TwoFactorAuth {
```

### UISize

- **kind**: type

```ts
export type UISize = 'sm' | 'md' | 'lg';
```

### UIVariant

- **kind**: type

```ts
export type UIVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
```

### User

- **kind**: interface

```ts
export interface User {
```

### UserActivity

- **kind**: interface

```ts
export interface UserActivity {
```

### UserActivityLog

- **kind**: interface

```ts
export interface UserActivityLog {
```

### UserContext

- **kind**: interface

```ts
export interface UserContext {
```

### UserFeedback

- **kind**: interface

```ts
export interface UserFeedback {
```

### UserInvitation

- **kind**: interface

```ts
export interface UserInvitation {
```

### UserPreferences

- **kind**: interface

```ts
export interface UserPreferences {
```

### UserProfile

- **kind**: interface

```ts
export interface UserProfile {
```

### UserQuota

- **kind**: interface

```ts
export interface UserQuota {
```

### UserQuotaLimits

- **kind**: interface

```ts
export interface UserQuotaLimits {
```

### UserQuotaUsage

- **kind**: interface

```ts
export interface UserQuotaUsage {
```

### UserRole

- **kind**: type

```ts
export type UserRole = 'user' | 'admin' | 'super_admin';
```

### UserSession

- **kind**: interface

```ts
export interface UserSession {
```

### UserSettings

- **kind**: interface

```ts
export interface UserSettings {
```

### UserStatus

- **kind**: type

```ts
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';
```

### UserSubscription

- **kind**: interface

```ts
export interface UserSubscription {
```

### WebhookEndpoint

- **kind**: interface

```ts
export interface WebhookEndpoint {
```

## lib/types/services

### AccessToken

- **kind**: interface

```ts
export interface AccessToken {
```

### ApiAlert

- **kind**: interface

```ts
export interface ApiAlert {
```

### ApiMetrics

- **kind**: interface

```ts
export interface ApiMetrics {
```

### ApiReport

- **kind**: interface

```ts
export interface ApiReport {
```

### BackupInfo

- **kind**: interface

```ts
export interface BackupInfo {
```

### BackupManager

- **kind**: interface

```ts
export interface BackupManager {
```

### BackupOptions

- **kind**: interface

```ts
export interface BackupOptions {
```

### BackupResult

- **kind**: interface

```ts
export interface BackupResult {
```

### BackupSchedule

- **kind**: interface

```ts
export interface BackupSchedule {
```

### BackupStatus

- **kind**: interface

```ts
export interface BackupStatus {
```

### BatchIndexingRequest

- **kind**: interface

```ts
export interface BatchIndexingRequest {
```

### BatchIndexingResponse

- **kind**: interface

```ts
export interface BatchIndexingResponse {
```

### BillingPeriod

- **kind**: type

```ts
export type BillingPeriod = 'monthly' | 'quarterly' | 'biannual' | 'annual';
```

### CacheConfig

- **kind**: interface

```ts
export interface CacheConfig {
```

### CacheStrategy

- **kind**: interface

```ts
export interface CacheStrategy {
```

### ColumnDefinition

- **kind**: interface

```ts
export interface ColumnDefinition {
```

### ComplianceReporting

- **kind**: interface

```ts
export interface ComplianceReporting {
```

### ConnectionManager

- **kind**: interface

```ts
export interface ConnectionManager {
```

### CreateInvoiceData

- **kind**: interface

```ts
export interface CreateInvoiceData {
```

### CreateSubscriptionData

- **kind**: interface

```ts
export interface CreateSubscriptionData {
```

### Currency

- **kind**: type

```ts
export type Currency = 'USD' | 'IDR';
```

### CustomerInfo

- **kind**: interface

```ts
export interface CustomerInfo {
```

### DatabaseCache

- **kind**: interface

```ts
export interface DatabaseCache {
```

### DatabaseConnection

- **kind**: interface

```ts
export interface DatabaseConnection {
```

### DatabaseError

- **kind**: interface

```ts
export interface DatabaseError {
```

### DatabaseErrorHandler

- **kind**: interface

```ts
export interface DatabaseErrorHandler {
```

### DatabaseServiceConfig

- **kind**: interface

```ts
export interface DatabaseServiceConfig {
```

### DatabaseServiceFactory

- **kind**: interface

```ts
export interface DatabaseServiceFactory {
```

### FraudDetection

- **kind**: interface

```ts
export interface FraudDetection {
```

### FraudFactor

- **kind**: interface

```ts
export interface FraudFactor {
```

### FraudRule

- **kind**: interface

```ts
export interface FraudRule {
```

### FraudScore

- **kind**: interface

```ts
export interface FraudScore {
```

### GatewayCapabilities

- **kind**: interface

```ts
export interface GatewayCapabilities {
```

### GoogleApiClientConfig

- **kind**: interface

```ts
export interface GoogleApiClientConfig {
```

### GoogleApiClientOptions

- **kind**: interface

```ts
export interface GoogleApiClientOptions {
```

### GoogleApiError

- **kind**: interface

```ts
export interface GoogleApiError {
```

### GoogleErrorHandler

- **kind**: interface

```ts
export interface GoogleErrorHandler {
```

### GoogleIndexingRequest

- **kind**: interface

```ts
export interface GoogleIndexingRequest {
```

### GoogleIndexingResponse

- **kind**: interface

```ts
export interface GoogleIndexingResponse {
```

### GoogleIndexingService

- **kind**: interface

```ts
export interface GoogleIndexingService {
```

### GoogleServiceAccount

- **kind**: interface

```ts
export interface GoogleServiceAccount {
```

### GoogleServiceConfig

- **kind**: interface

```ts
export interface GoogleServiceConfig {
```

### GoogleServiceFactory

- **kind**: interface

```ts
export interface GoogleServiceFactory {
```

### HealthCheck

- **kind**: interface

```ts
export interface HealthCheck {
```

### HealthCheckResult

- **kind**: interface

```ts
export interface HealthCheckResult {
```

### IndexDefinition

- **kind**: interface

```ts
export interface IndexDefinition {
```

### IndexingApiRequest

- **kind**: interface

```ts
export interface IndexingApiRequest {
```

### IndexingApiResponse

- **kind**: interface

```ts
export interface IndexingApiResponse {
```

### IndexingJobTable

- **kind**: interface

```ts
export interface IndexingJobTable {
```

### Invoice

- **kind**: interface

```ts
export interface Invoice {
```

### InvoiceDiscount

- **kind**: interface

```ts
export interface InvoiceDiscount {
```

### InvoiceFilters

- **kind**: interface

```ts
export interface InvoiceFilters {
```

### InvoiceItem

- **kind**: interface

```ts
export interface InvoiceItem {
```

### InvoiceManager

- **kind**: interface

```ts
export interface InvoiceManager {
```

### InvoiceTax

- **kind**: interface

```ts
export interface InvoiceTax {
```

### LoadBalancer

- **kind**: interface

```ts
export interface LoadBalancer {
```

### LoadBalancingStrategy

- **kind**: interface

```ts
export interface LoadBalancingStrategy {
```

### MidtransAddress

- **kind**: interface

```ts
export interface MidtransAddress {
```

### MidtransConfig

- **kind**: interface

```ts
export interface MidtransConfig {
```

### MidtransCustomerDetails

- **kind**: interface

```ts
export interface MidtransCustomerDetails {
```

### MidtransItemDetails

- **kind**: interface

```ts
export interface MidtransItemDetails {
```

### MidtransNotification

- **kind**: interface

```ts
export interface MidtransNotification {
```

### MidtransRecurringRequest

- **kind**: interface

```ts
export interface MidtransRecurringRequest {
```

### MidtransRecurringResponse

- **kind**: interface

```ts
export interface MidtransRecurringResponse {
```

### MidtransSnapRequest

- **kind**: interface

```ts
export interface MidtransSnapRequest {
```

### MidtransSnapResponse

- **kind**: interface

```ts
export interface MidtransSnapResponse {
```

### Migration

- **kind**: interface

```ts
export interface Migration {
```

### MigrationManager

- **kind**: interface

```ts
export interface MigrationManager {
```

### MigrationResult

- **kind**: interface

```ts
export interface MigrationResult {
```

### MigrationStatus

- **kind**: interface

```ts
export interface MigrationStatus {
```

### MonitoringService

- **kind**: interface

```ts
export interface MonitoringService {
```

### OptimizationResult

- **kind**: interface

```ts
export interface OptimizationResult {
```

### Order

- **kind**: interface

```ts
export interface Order {
```

### Package

- **kind**: interface

```ts
export interface Package {
```

### PaginatedResult

- **kind**: interface

```ts
export interface PaginatedResult<T> {
```

### PaginationOptions

- **kind**: interface

```ts
export interface PaginationOptions {
```

### PaymentAnalytics

- **kind**: interface

```ts
export interface PaymentAnalytics {
```

### PaymentData

- **kind**: interface

```ts
export interface PaymentData {
```

### PaymentError

- **kind**: interface

```ts
export interface PaymentError {
```

### PaymentGateway

- **kind**: interface

```ts
export interface PaymentGateway {
```

### PaymentGatewayInterface

- **kind**: interface

```ts
export interface PaymentGatewayInterface {
```

### PaymentHandlerInterface

- **kind**: interface

```ts
export interface PaymentHandlerInterface {
```

### PaymentMethod

- **kind**: type

```ts
export type PaymentMethod = 'midtrans-snap' | 'midtrans-recurring' | 'bank-transfer' | 'credit-card' | 'paypal';
```

### PaymentProcessor

- **kind**: interface

```ts
export interface PaymentProcessor {
```

### PaymentResult

- **kind**: interface

```ts
export interface PaymentResult {
```

### PaymentServiceConfig

- **kind**: interface

```ts
export interface PaymentServiceConfig {
```

### PaymentServiceFactory

- **kind**: interface

```ts
export interface PaymentServiceFactory {
```

### PaymentStatus

- **kind**: type

```ts
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
```

### PerformanceMonitor

- **kind**: interface

```ts
export interface PerformanceMonitor {
```

### PerformanceReport

- **kind**: interface

```ts
export interface PerformanceReport {
```

### PoolStatus

- **kind**: interface

```ts
export interface PoolStatus {
```

### ProcessorFees

- **kind**: interface

```ts
export interface ProcessorFees {
```

### ProcessorLimits

- **kind**: interface

```ts
export interface ProcessorLimits {
```

### PromoCode

- **kind**: interface

```ts
export interface PromoCode {
```

### QueryBuilder

- **kind**: interface

```ts
export interface QueryBuilder<T = any> {
```

### QueryExecutor

- **kind**: interface

```ts
export interface QueryExecutor {
```

### QueryOptions

- **kind**: interface

```ts
export interface QueryOptions {
```

### QueryResult

- **kind**: interface

```ts
export interface QueryResult<T = any> {
```

### QueryStats

- **kind**: interface

```ts
export interface QueryStats {
```

### QuotaManager

- **kind**: interface

```ts
export interface QuotaManager {
```

### QuotaUsage

- **kind**: interface

```ts
export interface QuotaUsage {
```

### Recommendation

- **kind**: interface

```ts
export interface Recommendation {
```

### Refund

- **kind**: interface

```ts
export interface Refund {
```

### RefundReport

- **kind**: interface

```ts
export interface RefundReport {
```

### Repository

- **kind**: interface

```ts
export interface Repository<T = any> {
```

### RestoreOptions

- **kind**: interface

```ts
export interface RestoreOptions {
```

### RestoreResult

- **kind**: interface

```ts
export interface RestoreResult {
```

### RevenueReport

- **kind**: interface

```ts
export interface RevenueReport {
```

### SendInvoiceOptions

- **kind**: interface

```ts
export interface SendInvoiceOptions {
```

### ServiceAccountHealth

- **kind**: interface

```ts
export interface ServiceAccountHealth {
```

### ServiceAccountManager

- **kind**: interface

```ts
export interface ServiceAccountManager {
```

### ServiceAccountTable

- **kind**: interface

```ts
export interface ServiceAccountTable {
```

### SlowQuery

- **kind**: interface

```ts
export interface SlowQuery {
```

### Subscription

- **kind**: interface

```ts
export interface Subscription {
```

### SubscriptionManager

- **kind**: interface

```ts
export interface SubscriptionManager {
```

### TableSchema

- **kind**: interface

```ts
export interface TableSchema {
```

### TableStats

- **kind**: interface

```ts
export interface TableStats {
```

### TaxReport

- **kind**: interface

```ts
export interface TaxReport {
```

### TokenManager

- **kind**: interface

```ts
export interface TokenManager {
```

### Transaction

- **kind**: interface

```ts
export interface Transaction {
```

### TransactionFilters

- **kind**: interface

```ts
export interface TransactionFilters {
```

### TransactionQuery

- **kind**: interface

```ts
export interface TransactionQuery {
```

### TransactionTable

- **kind**: interface

```ts
export interface TransactionTable {
```

### UserProfileTable

- **kind**: interface

```ts
export interface UserProfileTable {
```

### WebhookHandler

- **kind**: interface

```ts
export interface WebhookHandler {
```

### WebhookPayload

- **kind**: interface

```ts
export interface WebhookPayload {
```

### WebhookResult

- **kind**: interface

```ts
export interface WebhookResult {
```

## lib/utils

### cn

- **kind**: function

```ts
export function cn(...inputs: ClassValue[]) {
```

```ts
import { cn } from '@/lib/utils/utils.ts';
cn(/* params */);
```

### convertAndFormatUsdToIdr

- **kind**: function

```ts
export async function convertAndFormatUsdToIdr(usdAmount: number): Promise<string> {
```

```ts
import { convertAndFormatUsdToIdr } from '@/lib/utils/currency-converter.ts';
convertAndFormatUsdToIdr(/* params */);
```

### convertPrice

- **kind**: function

```ts
export function convertPrice(amount: number, fromCurrency: 'IDR' | 'USD', toCurrency: 'IDR' | 'USD'): number {
```

```ts
import { convertPrice } from '@/lib/utils/currency-utils.ts';
convertPrice(/* params */);
```

### convertUsdToIdr

- **kind**: function

```ts
export async function convertUsdToIdr(usdAmount: number): Promise<number> {
```

```ts
import { convertUsdToIdr } from '@/lib/utils/currency-converter.ts';
convertUsdToIdr(/* params */);
```

### Country

- **kind**: interface

```ts
export interface Country {
```

### CurrencyConfig

- **kind**: interface

```ts
export interface CurrencyConfig {
```

### DeviceInfo

- **kind**: interface

```ts
export interface DeviceInfo {
```

### ensureProtocol

- **kind**: function

```ts
export function ensureProtocol(url: string, protocol: 'http' | 'https' = 'https'): string {
```

```ts
import { ensureProtocol } from '@/lib/utils/url-utils.ts';
ensureProtocol(/* params */);
```

### extractDomain

- **kind**: function

```ts
export function extractDomain(url: string): string {
```

```ts
import { extractDomain } from '@/lib/utils/url-utils.ts';
extractDomain(/* params */);
```

### findCountryByCode

- **kind**: function

```ts
export function findCountryByCode(code: string): Country | undefined {
```

```ts
import { findCountryByCode } from '@/lib/utils/countries.ts';
findCountryByCode(/* params */);
```

### findCountryByName

- **kind**: function

```ts
export function findCountryByName(name: string): Country | undefined {
```

```ts
import { findCountryByName } from '@/lib/utils/countries.ts';
findCountryByName(/* params */);
```

### formatCurrency

- **kind**: function

```ts
export function formatCurrency(amount: number, currency: 'IDR' | 'USD' = 'USD'): string {
```

```ts
import { formatCurrency } from '@/lib/utils/currency-utils.ts';
formatCurrency(/* params */);
```

### formatCurrency

- **kind**: function

```ts
export function formatCurrency(amount: number, currency: 'IDR' | 'USD' = 'USD'): string {
```

```ts
import { formatCurrency } from '@/lib/utils/utils.ts';
formatCurrency(/* params */);
```

### formatDate

- **kind**: function

```ts
export function formatDate(dateString: string): string {
```

```ts
import { formatDate } from '@/lib/utils/utils.ts';
formatDate(/* params */);
```

### formatDeviceInfo

- **kind**: function

```ts
export function formatDeviceInfo(deviceInfo?: DeviceInfo | null): string {
```

```ts
import { formatDeviceInfo } from '@/lib/utils/ip-device-utils.ts';
formatDeviceInfo(/* params */);
```

### formatIdrCurrency

- **kind**: function

```ts
export function formatIdrCurrency(idrAmount: number): string {
```

```ts
import { formatIdrCurrency } from '@/lib/utils/currency-converter.ts';
formatIdrCurrency(/* params */);
```

### formatLocationData

- **kind**: function

```ts
export function formatLocationData(locationData?: LocationData | null): string {
```

```ts
import { formatLocationData } from '@/lib/utils/ip-device-utils.ts';
formatLocationData(/* params */);
```

### formatRelativeTime

- **kind**: function

```ts
export function formatRelativeTime(dateString: string): string {
```

```ts
import { formatRelativeTime } from '@/lib/utils/utils.ts';
formatRelativeTime(/* params */);
```

### getApiUrl

- **kind**: const

```ts
getApiUrl = (endpoint: string): string => {
```

```ts
import { getApiUrl } from '@/lib/utils/api-url.ts';
getApiUrl(/* params */);
```

### getClientIP

- **kind**: function

```ts
export function getClientIP(request?: NextRequest): string | null {
```

```ts
import { getClientIP } from '@/lib/utils/ip-device-utils.ts';
getClientIP(/* params */);
```

### getCurrencyPricing

- **kind**: function

```ts
export function getCurrencyPricing(pricing_tiers: any, currency: 'IDR' | 'USD', billing_period: string) {
```

```ts
import { getCurrencyPricing } from '@/lib/utils/currency-utils.ts';
getCurrencyPricing(/* params */);
```

### getCurrencySymbol

- **kind**: function

```ts
export function getCurrencySymbol(currency: 'IDR' | 'USD'): string {
```

```ts
import { getCurrencySymbol } from '@/lib/utils/currency-utils.ts';
getCurrencySymbol(/* params */);
```

### getCurrentExchangeRate

- **kind**: function

```ts
export async function getCurrentExchangeRate(): Promise<number> {
```

```ts
import { getCurrentExchangeRate } from '@/lib/utils/currency-converter.ts';
getCurrentExchangeRate(/* params */);
```

### getPopularCountries

- **kind**: function

```ts
export function getPopularCountries(): Country[] {
```

```ts
import { getPopularCountries } from '@/lib/utils/countries.ts';
getPopularCountries(/* params */);
```

### getRequestInfo

- **kind**: function

```ts
export async function getRequestInfo(request?: NextRequest): Promise<{
```

```ts
import { getRequestInfo } from '@/lib/utils/ip-device-utils.ts';
getRequestInfo(/* params */);
```

### getSecurityRiskLevel

- **kind**: function

```ts
export function getSecurityRiskLevel( ipAddress: string | null, deviceInfo: DeviceInfo | null, locationData: LocationData | null, previousIPs: string[] = [], previousDevices: DeviceInfo[] = [] ): 'low' | 'medium' | 'high' {
```

```ts
import { getSecurityRiskLevel } from '@/lib/utils/ip-device-utils.ts';
getSecurityRiskLevel(/* params */);
```

### getUserCurrency

- **kind**: function

```ts
export function getUserCurrency(country: string | null | undefined): 'IDR' | 'USD' {
```

```ts
import { getUserCurrency } from '@/lib/utils/currency-utils.ts';
getUserCurrency(/* params */);
```

### isIndonesianUser

- **kind**: function

```ts
export function isIndonesianUser(country: string | null | undefined): boolean {
```

```ts
import { isIndonesianUser } from '@/lib/utils/currency-utils.ts';
isIndonesianUser(/* params */);
```

### isValidUrl

- **kind**: function

```ts
export function isValidUrl(url: string): boolean {
```

```ts
import { isValidUrl } from '@/lib/utils/url-utils.ts';
isValidUrl(/* params */);
```

### LocationData

- **kind**: interface

```ts
export interface LocationData {
```

### normalizeUrl

- **kind**: function

```ts
export function normalizeUrl(url: string): string {
```

```ts
import { normalizeUrl } from '@/lib/utils/url-utils.ts';
normalizeUrl(/* params */);
```

### parseUserAgent

- **kind**: function

```ts
export function parseUserAgent(userAgent: string): DeviceInfo {
```

```ts
import { parseUserAgent } from '@/lib/utils/ip-device-utils.ts';
parseUserAgent(/* params */);
```

### removeUrlParameters

- **kind**: function

```ts
export function removeUrlParameters(url: string | null): string | null {
```

```ts
import { removeUrlParameters } from '@/lib/utils/url-utils.ts';
removeUrlParameters(/* params */);
```

### SiteSettings

- **kind**: interface

```ts
export interface SiteSettings {
```

### validateMidtransAmount

- **kind**: function

```ts
export function validateMidtransAmount(idrAmount: number): boolean {
```

```ts
import { validateMidtransAmount } from '@/lib/utils/currency-converter.ts';
validateMidtransAmount(/* params */);
```
