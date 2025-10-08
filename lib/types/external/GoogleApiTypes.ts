/**
 * Google API type definitions for IndexNow Studio
 */

export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface GoogleIndexingRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
}

export interface GoogleIndexingResponse {
  urlNotificationMetadata: {
    url: string;
    latestUpdate: {
      url: string;
      type: string;
      notifyTime: string;
    };
  };
}