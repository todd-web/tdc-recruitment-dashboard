/**
 * generate-performance-data.js
 *
 * Generates accurate performance.json from real TDC Portal expert data.
 * Uses the fresh expert snapshot to compute onboarding counts by period.
 *
 * Usage: node server/generate-performance-data.js [path-to-expert-json]
 * Default: Uses the latest fresh_postfix_experts snapshot
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default expert data path
const DEFAULT_EXPERT_PATH = 'C:/ClaudeWork/output/the-desire-company/coverage-analysis/_workspace/fresh_postfix_experts_v41_20260318.json';
const expertPath = process.argv[2] || DEFAULT_EXPERT_PATH;
const outputPath = resolve(__dirname, '../public/data/performance.json');

// Load existing performance.json to preserve Streak/Workable data
let existingData = {};
if (existsSync(outputPath)) {
  existingData = JSON.parse(readFileSync(outputPath, 'utf8'));
}

// Load expert data
console.log(`Loading expert data from: ${expertPath}`);
const raw = JSON.parse(readFileSync(expertPath, 'utf8'));
const allUsers = raw.all_users || [];
const activeUsers = allUsers.filter(u => u.status === 'Active');
const prospectUsers = allUsers.filter(u => u.status === 'Prospect');
const inReviewUsers = allUsers.filter(u => u.status === 'In Review');

console.log(`Total users: ${allUsers.length}`);
console.log(`Active: ${activeUsers.length}`);
console.log(`Prospect: ${prospectUsers.length}`);
console.log(`In Review: ${inReviewUsers.length}`);

// Helper: count Active experts where dateCreated falls in a date range
function countOnboarded(startDate, endDate) {
  return activeUsers.filter(u => {
    if (!u.dateCreated) return false;
    const d = u.dateCreated; // format: "YYYY-MM-DD"
    return d >= startDate && d <= endDate;
  }).length;
}

// Helper: count Active experts by month prefix (YYYY-MM)
function countByMonth(monthPrefix) {
  return activeUsers.filter(u => u.dateCreated && u.dateCreated.startsWith(monthPrefix)).length;
}

// Current date context: 2026-03-18
const now = new Date('2026-03-18');
const currentYear = 2026;
const currentMonth = 3;

// === PERIOD CALCULATIONS ===

// YTD: 2026-01-01 to 2026-03-18
const ytdOnboarded = countOnboarded('2026-01-01', '2026-12-31');

// This month: March 2026
const thisMonthOnboarded = countByMonth('2026-03');

// Last month: February 2026
const lastMonthOnboarded = countByMonth('2026-02');

// This quarter: Q1 2026 (Jan-Mar)
const thisQuarterOnboarded = ytdOnboarded; // Same as YTD since we're in Q1

// 2025 full year
const onboarded2025 = countOnboarded('2025-01-01', '2025-12-31');

// 2024 full year
const onboarded2024 = countOnboarded('2024-01-01', '2024-12-31');

// 2025 quarters
const q1_2025 = countOnboarded('2025-01-01', '2025-03-31');
const q2_2025 = countOnboarded('2025-04-01', '2025-06-30');
const q3_2025 = countOnboarded('2025-07-01', '2025-09-30');
const q4_2025 = countOnboarded('2025-10-01', '2025-12-31');

// This week (Mon Mar 10 - Sun Mar 16, but include through today Mar 18)
const thisWeekOnboarded = countOnboarded('2026-03-10', '2026-03-18');

// Today
const todayOnboarded = countByMonth('2026-03-18');

// Monthly breakdown 2026
const jan2026 = countByMonth('2026-01');
const feb2026 = countByMonth('2026-02');
const mar2026 = countByMonth('2026-03');

// === MONTHLY TREND (last 12 months) ===
const monthlyTrend = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(currentYear, currentMonth - 1 - i, 1);
  const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  monthlyTrend.push({
    month: monthStr,
    onboarded: countByMonth(monthStr)
  });
}

// === FUNNEL DATA ===
// Leads = Streak combined total (from existing data)
const streakLeads = existingData?.streak?.combined?.total || 543;
// Workable total
const workableTotal = existingData?.workable?.total || 222;

// === BUILD OUTPUT ===
const performance = {
  // Preserve existing Streak data
  streak: existingData.streak || {
    applied: { total: 35 },
    sourced: { total: 508 },
    combined: { total: 543, today: 0, thisWeek: 536, thisMonth: 543, thisQuarter: 543 }
  },

  // Preserve existing Workable data (just total, not full candidate list)
  workable: {
    total: workableTotal,
    stageBreakdown: existingData.workable?.stages ?
      Object.fromEntries(
        Object.entries(existingData.workable.stages).map(([stage, arr]) => [stage, Array.isArray(arr) ? arr.length : arr])
      ) : {}
  },

  totalActiveExperts: activeUsers.length,

  // FIXED: Real onboarded counts from Portal dateCreated
  onboarded: {
    today: todayOnboarded,
    thisWeek: thisWeekOnboarded,
    thisMonth: thisMonthOnboarded,
    thisQuarter: thisQuarterOnboarded
  },

  // Period-specific data for the period selector
  periods: {
    ytd: {
      label: '2026 Year to Date',
      onboarded: ytdOnboarded,
      prospects: prospectUsers.length,
      inReview: inReviewUsers.length,
      totalActive: activeUsers.length
    },
    thisMonth: {
      label: 'March 2026',
      onboarded: thisMonthOnboarded
    },
    lastMonth: {
      label: 'February 2026',
      onboarded: lastMonthOnboarded
    },
    thisQuarter: {
      label: 'Q1 2026 (Jan-Mar)',
      onboarded: thisQuarterOnboarded
    },
    'q4-2025': {
      label: 'Q4 2025 (Oct-Dec)',
      onboarded: q4_2025
    },
    '2025': {
      label: '2025 Full Year',
      onboarded: onboarded2025
    },
    '2024': {
      label: '2024 Full Year',
      onboarded: onboarded2024
    },
    // Monthly breakdown for 2026
    '2026-01': { label: 'January 2026', onboarded: jan2026 },
    '2026-02': { label: 'February 2026', onboarded: feb2026 },
    '2026-03': { label: 'March 2026', onboarded: mar2026 },
    // 2025 quarters
    'q1-2025': { label: 'Q1 2025 (Jan-Mar)', onboarded: q1_2025 },
    'q2-2025': { label: 'Q2 2025 (Apr-Jun)', onboarded: q2_2025 },
    'q3-2025': { label: 'Q3 2025 (Jul-Sep)', onboarded: q3_2025 },
  },

  // Funnel with real numbers
  funnel: {
    leads: streakLeads,
    workableApplicants: workableTotal,
    prospects: prospectUsers.length,
    inReview: inReviewUsers.length,
    onboarded_ytd: ytdOnboarded,
    onboarded_total: activeUsers.length
  },

  // 2026 targets
  targets2026: {
    onboardings: 1500,
    communitySize: 3500,
    conversionRate: 10
  },

  // Monthly trend (last 12 months)
  monthlyTrend: monthlyTrend,

  // Preserve existing data
  markets: existingData.markets || {},
  bipoc: existingData.bipoc || { total: 0, percentage: 0 },

  prospects: prospectUsers.length,

  lastRefresh: now.toISOString(),
  dataSource: 'Portal expert snapshot (fresh_postfix_experts_v41_20260318.json)',
  generatedAt: new Date().toISOString()
};

// Write output
writeFileSync(outputPath, JSON.stringify(performance, null, 2));
console.log(`\nPerformance data written to: ${outputPath}`);
console.log('\n=== KEY METRICS ===');
console.log(`YTD Onboarded (2026): ${ytdOnboarded}`);
console.log(`This Month (Mar): ${thisMonthOnboarded}`);
console.log(`Last Month (Feb): ${lastMonthOnboarded}`);
console.log(`This Quarter (Q1): ${thisQuarterOnboarded}`);
console.log(`2025 Total: ${onboarded2025}`);
console.log(`2024 Total: ${onboarded2024}`);
console.log(`Current Prospects: ${prospectUsers.length}`);
console.log(`In Review: ${inReviewUsers.length}`);
console.log(`Total Active: ${activeUsers.length}`);
console.log('\nMonthly Trend (last 12 months):');
monthlyTrend.forEach(m => console.log(`  ${m.month}: ${m.onboarded}`));
