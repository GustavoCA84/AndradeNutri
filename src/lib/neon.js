import { createClient } from '@neondatabase/neon-js';

const REAL_AUTH_URL = 'https://ep-old-queen-afeovvvz.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth';
const REAL_DATA_API_URL = 'https://ep-old-queen-afeovvvz.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1';

const getValidUrl = (envVal, fallbackVal) => {
  if (!envVal || typeof envVal !== 'string') return fallbackVal;
  const trimmed = envVal.trim();
  if (
    trimmed === '' ||
    trimmed.includes('seu-endpoint') ||
    trimmed.includes('seu_endpoint') ||
    trimmed.includes('sua_neon') ||
    trimmed.includes('example') ||
    trimmed.includes('placeholder')
  ) {
    return fallbackVal;
  }
  return trimmed;
};

const authUrl = getValidUrl(import.meta.env.VITE_NEON_AUTH_URL, REAL_AUTH_URL);
const dataApiUrl = getValidUrl(import.meta.env.VITE_NEON_DATA_API_URL, REAL_DATA_API_URL);

export const client = createClient({
  auth: {
    url: authUrl,
  },
  dataApi: {
    url: dataApiUrl,
  },
});

