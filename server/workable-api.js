import axios from 'axios';

const SUBDOMAIN = process.env.WORKABLE_SUBDOMAIN || 'the-desire-company';
const BASE_URL = `https://${SUBDOMAIN}.workable.com/spi/v3`;

function headers() {
  return {
    Authorization: `Bearer ${process.env.WORKABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchJobs() {
  const res = await axios.get(`${BASE_URL}/jobs`, {
    headers: headers(),
    params: { state: 'published' },
  });
  return res.data.jobs || [];
}

export async function fetchCandidates(jobShortcode, limit = 100) {
  const candidates = [];
  let sinceId = null;

  while (true) {
    const params = { limit: Math.min(limit - candidates.length, 100) };
    if (sinceId) params.since_id = sinceId;

    const res = await axios.get(`${BASE_URL}/jobs/${jobShortcode}/candidates`, {
      headers: headers(),
      params,
    });

    const items = res.data.candidates || [];
    if (items.length === 0) break;
    candidates.push(...items);
    sinceId = items[items.length - 1].id;

    if (candidates.length >= limit || items.length < 100) break;
  }

  return candidates;
}

export async function fetchAllCandidates() {
  const jobs = await fetchJobs();
  const allCandidates = [];

  for (const job of jobs) {
    try {
      const candidates = await fetchCandidates(job.shortcode, 500);
      allCandidates.push(...candidates.map(c => ({
        ...c,
        jobTitle: job.title,
        jobShortcode: job.shortcode,
      })));
    } catch (err) {
      console.error(`Error fetching candidates for job ${job.shortcode}:`, err.message);
    }
  }

  return allCandidates;
}

export async function fetchCandidatesByStage() {
  const candidates = await fetchAllCandidates();
  const stages = {};

  for (const c of candidates) {
    const stage = c.stage || 'unknown';
    if (!stages[stage]) stages[stage] = [];
    stages[stage].push(c);
  }

  return { candidates, stages, total: candidates.length };
}
