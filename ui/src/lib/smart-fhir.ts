import Client from 'fhir-kit-client';

// EPIC SMART FHIR Configuration
export const EPIC_CONFIG = {
  authorizationEndpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  tokenEndpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
  clientId: '408fb977-96fc-4227-b22e-f78b35613570',
  redirectUri: 'http://localhost:3000',
  scope: 'openid fhirUser',
  fhirBaseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/',
};

// Generate random string for state and code verifier
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// Generate SHA256 hash and base64url encode
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

// Generate PKCE challenge
export async function generatePKCEChallenge(): Promise<PKCEChallenge> {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await sha256(codeVerifier);
  const state = generateRandomString(32);
  
  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}

// Generate authorization URL
export function generateAuthUrl(pkce: PKCEChallenge): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: EPIC_CONFIG.clientId,
    redirect_uri: EPIC_CONFIG.redirectUri,
    scope: EPIC_CONFIG.scope,
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    aud: EPIC_CONFIG.fhirBaseUrl,
  });

  return `${EPIC_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<any> {
  const tokenData = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: EPIC_CONFIG.clientId,
    code,
    redirect_uri: EPIC_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(EPIC_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: tokenData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Create FHIR client with access token
export function createFHIRClient(accessToken: string): Client {
  console.log('Creating FHIR client with token:', accessToken ? 'Token present' : 'No token');
  
  return new Client({
    baseUrl: EPIC_CONFIG.fhirBaseUrl,
    requestOptions: {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
    },
  });
}

// Alternative FHIR client that manually handles requests
export function createManualFHIRClient(accessToken: string) {
  const baseUrl = EPIC_CONFIG.fhirBaseUrl;
  
  return {
    async read({ resourceType, id }: { resourceType: string; id: string }) {
      const url = `${baseUrl}${resourceType}/${id}`;
      console.log('Making manual FHIR request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`FHIR request failed: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async search({ resourceType, searchParams }: { resourceType: string; searchParams: Record<string, string> }) {
      const params = new URLSearchParams(searchParams);
      const url = `${baseUrl}${resourceType}?${params.toString()}`;
      console.log('Making manual FHIR search request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`FHIR search failed: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    }
  };
}

// FHIR resource types
export interface Patient {
  resourceType: 'Patient';
  id: string;
  name?: Array<{
    given?: string[];
    family?: string;
  }>;
  gender?: string;
  birthDate?: string;
  identifier?: Array<{
    value?: string;
    system?: string;
  }>;
}

export interface MedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ display?: string }>;
  };
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
  }>;
  status?: string;
}

export interface Observation {
  resourceType: 'Observation';
  id: string;
  code?: {
    text?: string;
    coding?: Array<{ display?: string }>;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
  };
  valueString?: string;
  component?: Array<{
    code?: {
      text?: string;
      coding?: Array<{ display?: string }>;
    };
    valueQuantity?: {
      value?: number;
      unit?: string;
    };
  }>;
  effectiveDateTime?: string;
  status?: string;
  category?: Array<{
    coding?: Array<{ code?: string }>;
  }>;
} 