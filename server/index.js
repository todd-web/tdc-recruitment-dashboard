import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchActiveExperts } from './portal-api.js';
import { fetchCandidatesByStage } from './workable-api.js';
import { fetchRecruitmentMetrics } from './streak-api.js';
import { runAnalysis } from './priority-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3456;

// Cache for expensive API calls
let expertCache = { data: null, timestamp: 0 };
let streakCache = { data: null, timestamp: 0 };
let workableCache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================
// PRIORITIES ENDPOINT
// ============================================================

app.get('/api/priorities', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const salesOverrides = (req.query.overrides || '').split(',').filter(Boolean);

    let experts;
    if (!forceRefresh && expertCache.data && Date.now() - expertCache.timestamp < CACHE_TTL) {
      experts = expertCache.data;
    } else {
      console.log('Fetching fresh expert data from Portal API...');
      experts = await fetchActiveExperts();
      expertCache = { data: experts, timestamp: Date.now() };
      console.log(`Loaded ${experts.length} active experts`);
    }

    const analysis = runAnalysis(experts, salesOverrides);
    res.json(analysis);
  } catch (err) {
    console.error('Priority analysis error:', err.message);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ============================================================
// RECRUITMENT PERFORMANCE ENDPOINT
// ============================================================

app.get('/api/performance', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    // Fetch Streak data
    let streakData;
    if (!forceRefresh && streakCache.data && Date.now() - streakCache.timestamp < CACHE_TTL) {
      streakData = streakCache.data;
    } else {
      console.log('Fetching Streak recruitment metrics...');
      streakData = await fetchRecruitmentMetrics();
      streakCache = { data: streakData, timestamp: Date.now() };
    }

    // Fetch Workable data
    let workableData;
    if (!forceRefresh && workableCache.data && Date.now() - workableCache.timestamp < CACHE_TTL) {
      workableData = workableCache.data;
    } else {
      console.log('Fetching Workable candidate data...');
      try {
        workableData = await fetchCandidatesByStage();
        workableCache = { data: workableData, timestamp: Date.now() };
      } catch (err) {
        console.error('Workable fetch error:', err.message);
        workableData = { candidates: [], stages: {}, total: 0 };
      }
    }

    // Expert market/demographic data (from portal cache)
    let experts = expertCache.data;
    if (!experts) {
      experts = await fetchActiveExperts();
      expertCache = { data: experts, timestamp: Date.now() };
    }

    // Calculate market counts
    const markets = { Chicago: 0, 'Los Angeles': 0, 'New York': 0, Bentonville: 0 };
    let bipocTotal = 0;

    for (const expert of experts) {
      const city = (expert.city || '').toLowerCase();
      const zip = (expert.zipCode || expert.zip || '').toString();

      if (city.includes('chicago') || /^(606|607|608)/.test(zip)) markets.Chicago++;
      if (['los angeles', 'la', 'hollywood', 'beverly hills', 'santa monica', 'burbank', 'pasadena', 'glendale', 'long beach', 'culver city', 'west hollywood'].some(c => city.includes(c)) || /^(900|901|902|903|904|905|906|907|908|910|911|912|913|914|916|917|918)/.test(zip)) markets['Los Angeles']++;
      if (['new york', 'nyc', 'brooklyn', 'manhattan', 'queens', 'bronx'].some(c => city.includes(c)) || /^(100|101|102|103|104|110|111|112|113|114|116)/.test(zip)) markets['New York']++;
      if (['bentonville', 'rogers', 'fayetteville', 'springdale', 'bella vista', 'lowell'].some(c => city.includes(c)) || /^(727)/.test(zip)) markets.Bentonville++;

      const ethnicity = (expert.ethnicity || expert.race || '').toLowerCase();
      if (ethnicity && !ethnicity.includes('white') && !ethnicity.includes('caucasian') && ethnicity !== 'prefer not to say') {
        bipocTotal++;
      }
    }

    // Count portal status transitions (prospect -> active) from creation dates
    const now = Date.now();
    const DAY = 86400000;
    const activeExpertsByPeriod = {
      today: experts.filter(e => new Date(e.createdAt || e.created_at || 0).getTime() > now - DAY).length,
      thisWeek: experts.filter(e => new Date(e.createdAt || e.created_at || 0).getTime() > now - 7 * DAY).length,
      thisMonth: experts.filter(e => new Date(e.createdAt || e.created_at || 0).getTime() > now - 30 * DAY).length,
      thisQuarter: experts.filter(e => new Date(e.createdAt || e.created_at || 0).getTime() > now - 90 * DAY).length,
    };

    res.json({
      streak: streakData,
      workable: workableData,
      totalActiveExperts: experts.length,
      onboarded: activeExpertsByPeriod,
      markets,
      bipoc: {
        total: bipocTotal,
        percentage: experts.length > 0 ? Math.round((bipocTotal / experts.length) * 100) : 0,
      },
      lastRefresh: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Performance metrics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SCORECARD ENDPOINT
// ============================================================

app.get('/api/scorecard', async (req, res) => {
  try {
    // Pull real data where possible
    let experts = expertCache.data;
    if (!experts) {
      experts = await fetchActiveExperts();
      expertCache = { data: experts, timestamp: Date.now() };
    }

    let streakData = streakCache.data;
    if (!streakData) {
      streakData = await fetchRecruitmentMetrics();
      streakCache = { data: streakData, timestamp: Date.now() };
    }

    const totalProspects = streakData.combined.total;
    const onboardedThisMonth = experts.filter(e => {
      const created = new Date(e.createdAt || e.created_at || 0).getTime();
      return created > Date.now() - 30 * 86400000;
    }).length;

    // Bentonville count
    const bentonville = experts.filter(e => {
      const city = (e.city || '').toLowerCase();
      const zip = (e.zipCode || e.zip || '').toString();
      return ['bentonville', 'rogers', 'fayetteville', 'springdale'].some(c => city.includes(c)) || /^(727)/.test(zip);
    }).length;

    const chicago = experts.filter(e => {
      const city = (e.city || '').toLowerCase();
      const zip = (e.zipCode || e.zip || '').toString();
      return city.includes('chicago') || /^(606|607|608)/.test(zip);
    }).length;

    const scorecard = [
      { metric: 'New Leads Captured', target: 288, actual: totalProspects, owner: 'Recruitment Operations Lead' },
      { metric: 'First Response Within 24hrs', target: '80%+', actual: null, owner: 'Recruitment Operations Lead' },
      { metric: '3+ Touches Completed', target: '70%+ of leads', actual: null, owner: 'Recruitment Operations Lead' },
      { metric: 'Workable Applicants', target: 'Track', actual: streakData.applied.total, owner: 'Recruitment Operations Lead' },
      { metric: 'Portal Prospects', target: 'Track', actual: streakData.sourced.total, owner: 'Recruitment Operations Lead' },
      { metric: 'Onboarded (Approved)', target: '29-32', actual: onboardedThisMonth, owner: 'Expert Team' },
      { metric: 'Bentonville Approvals', target: 'Quarterly Quota', actual: bentonville, owner: 'Expert Team' },
      { metric: 'Chicago Approvals', target: 'Set Monthly', actual: chicago, owner: 'Expert Team' },
    ];

    res.json({ scorecard, lastRefresh: new Date().toISOString() });
  } catch (err) {
    console.error('Scorecard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    caches: {
      experts: expertCache.data ? `${expertCache.data.length} experts` : 'empty',
      streak: streakCache.data ? 'loaded' : 'empty',
      workable: workableCache.data ? 'loaded' : 'empty',
    },
  });
});

// Serve built React frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  TDC Recruitment Dashboard running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});
