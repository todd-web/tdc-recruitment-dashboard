import axios from 'axios';

const BASE_URL = process.env.TDC_PORTAL_API || 'https://api.prod.thedesirecompany.com/api/v1';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 3600000) return cachedToken;

  console.log('[Portal] Authenticating via API login...');
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    emailAddress: process.env.TDC_PORTAL_EMAIL,
    password: process.env.TDC_PORTAL_PASSWORD,
  });

  cachedToken = res.data.tokens?.token || res.data.token;
  tokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days
  console.log('[Portal] JWT obtained successfully');
  return cachedToken;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function portalGet(path, params = {}) {
  let token = await getToken();
  try {
    const res = await axios.get(`${BASE_URL}${path}`, { headers: headers(token), params });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('[Portal] Token expired, refreshing...');
      cachedToken = null;
      token = await getToken();
      const res = await axios.get(`${BASE_URL}${path}`, { headers: headers(token), params });
      return res.data;
    }
    throw err;
  }
}

export async function fetchActiveExperts() {
  const experts = [];
  let page = 1;
  let totalCount = 0;

  // API returns max 20 per page in {count, rows} format
  while (true) {
    const data = await portalGet('/proteam/users', { page });
    const items = data.rows || [];
    totalCount = data.count || 0;

    if (items.length === 0) break;
    experts.push(...items);

    if (page % 10 === 0 || experts.length >= totalCount) {
      console.log(`[Portal] Page ${page}: ${experts.length}/${totalCount} fetched`);
    }

    if (experts.length >= totalCount) break;
    page++;

    // Safety limit
    if (page > 200) {
      console.log('[Portal] Hit page limit (200), stopping');
      break;
    }
  }

  console.log(`[Portal] Fetched all ${experts.length} experts across ${page} pages`);

  // Filter to only Active status, exclude admin account
  const filtered = experts.filter(e => {
    const status = (e.status || '').toLowerCase();
    return status === 'active' && e.userid !== 3720;
  });
  console.log(`[Portal] ${filtered.length} active experts (filtered from ${experts.length} total)`);
  return filtered;
}

export async function fetchProfessions() {
  return portalGet('/professions');
}
