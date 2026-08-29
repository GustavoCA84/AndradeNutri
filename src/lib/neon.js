import { createClient } from '@neondatabase/neon-js';

const authUrl =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-old-queen-afeovvvz.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth';

const dataApiUrl =
  import.meta.env.VITE_NEON_DATA_API_URL ||
  'https://ep-old-queen-afeovvvz.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1';

export const client = createClient({
  auth: {
    url: authUrl,
  },
  dataApi: {
    url: dataApiUrl,
  },
});

