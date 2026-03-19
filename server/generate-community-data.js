/**
 * generate-community-data.js
 *
 * Generates community.json from the V4.1 expert data file and priorities.json.
 *
 * Usage:
 *   node server/generate-community-data.js
 *
 * Input:
 *   - V4.1 expert data: fresh_postfix_experts_v41_20260318.json
 *   - V4.1 priorities: public/data/priorities.json
 *
 * Output:
 *   - public/data/community.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPERT_DATA_PATH = resolve('C:/ClaudeWork/output/the-desire-company/coverage-analysis/_workspace/fresh_postfix_experts_v41_20260318.json');
const PRIORITIES_PATH = resolve(__dirname, '../public/data/priorities.json');
const OUTPUT_PATH = resolve(__dirname, '../public/data/community.json');

// NW Arkansas zip code prefixes (Benton + Washington counties)
const BENTONVILLE_ZIP_PREFIXES = ['720', '727', '728'];

function parseStateName(stateField) {
  if (!stateField) return null;
  // Handle "CA|California" format
  if (stateField.includes('|')) {
    return stateField.split('|')[1].trim();
  }
  return stateField.trim();
}

function getQuarter(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function isBentonvilleZip(zipcode) {
  if (!zipcode) return false;
  const z = zipcode.toString().substring(0, 3);
  return BENTONVILLE_ZIP_PREFIXES.includes(z);
}

function main() {
  console.log('Loading expert data...');
  const expertData = JSON.parse(readFileSync(EXPERT_DATA_PATH, 'utf8'));
  const users = expertData.active_users;
  const totalExperts = users.length;

  console.log(`Loaded ${totalExperts} active experts.`);

  // Load priorities for coverage score and urgency cross-reference
  console.log('Loading priorities data...');
  const priorities = JSON.parse(readFileSync(PRIORITIES_PATH, 'utf8'));

  // 1. Onboarded this month (March 2026)
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const onboardedThisMonth = users.filter(u => u.dateCreated && u.dateCreated.startsWith(currentMonthPrefix)).length;

  // 2. Bentonville experts
  const bentonvilleExperts = users.filter(u => isBentonvilleZip(u.zipcode)).length;

  // 3. Profession distribution
  const profCounts = {};
  users.forEach(u => {
    if (!u.professions || !u.professions.length) return;
    u.professions.forEach(p => {
      const name = p.profession?.name;
      if (name) profCounts[name] = (profCounts[name] || 0) + 1;
    });
  });
  const professionDistribution = Object.entries(profCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({
      name,
      count,
      pct: parseFloat((count / totalExperts * 100).toFixed(1)),
    }));

  // Build urgency map from V4.1 sub-RPG priorities for profession coloring
  const urgencyMap = {};
  if (priorities.subRpgPriorities) {
    priorities.subRpgPriorities.forEach(s => {
      urgencyMap[s.subRpg] = s.urgency;
    });
  }

  // 4. State distribution
  const stateCounts = {};
  users.forEach(u => {
    const state = parseStateName(u.state);
    if (state) stateCounts[state] = (stateCounts[state] || 0) + 1;
  });
  const stateDistribution = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([state, count]) => ({
      state,
      count,
      pct: parseFloat((count / totalExperts * 100).toFixed(1)),
    }));

  // Check if Arkansas is in top 10, if not add it for Bentonville visibility
  const arkansasInTop10 = stateDistribution.some(s => s.state === 'Arkansas');
  const arkansasCount = stateCounts['Arkansas'] || 0;
  const arkansasEntry = {
    state: 'Arkansas',
    count: arkansasCount,
    pct: parseFloat((arkansasCount / totalExperts * 100).toFixed(1)),
    isBentonvilleState: true,
  };

  // 5. Ethnicity
  const ethnicityCounts = {};
  let ethnicityFilled = 0;
  users.forEach(u => {
    if (u.ethnicity && u.ethnicity !== 'No Response') {
      ethnicityCounts[u.ethnicity] = (ethnicityCounts[u.ethnicity] || 0) + 1;
      ethnicityFilled++;
    } else if (u.ethnicity === 'No Response') {
      // Count "No Response" as filled but separate
      ethnicityFilled++;
    }
  });
  const ethnicityTotal = Object.values(ethnicityCounts).reduce((a, b) => a + b, 0);

  // 6. Gender
  const genderCounts = {};
  let genderFilled = 0;
  users.forEach(u => {
    if (u.gender) {
      genderCounts[u.gender] = (genderCounts[u.gender] || 0) + 1;
      genderFilled++;
    }
  });

  // 7. Tenure by quarter (last 8 quarters)
  const quarterCounts = {};
  users.forEach(u => {
    const q = getQuarter(u.dateCreated);
    if (q) quarterCounts[q] = (quarterCounts[q] || 0) + 1;
  });

  // Sort quarters chronologically and take last 8
  const allQuarters = Object.entries(quarterCounts)
    .map(([quarter, count]) => {
      const [qStr, yearStr] = quarter.split(' ');
      const qNum = parseInt(qStr.replace('Q', ''));
      const year = parseInt(yearStr);
      return { quarter, count, sortKey: year * 4 + qNum };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  const tenureByQuarter = allQuarters.slice(-8).map(({ quarter, count }) => ({ quarter, count }));

  // 8. Coverage score: % of CRITICAL+HIGH sub-RPGs where coreCount >= target*0.5
  let coverageNumerator = 0;
  const critHighSubRpgs = (priorities.subRpgPriorities || []).filter(
    r => r.urgency === 'CRITICAL' || r.urgency === 'HIGH'
  );
  critHighSubRpgs.forEach(r => {
    if (r.coreCount >= r.target * 0.5) coverageNumerator++;
  });
  const coverageScore = critHighSubRpgs.length > 0
    ? parseFloat((coverageNumerator / critHighSubRpgs.length * 100).toFixed(1))
    : 0;

  // 9. Data completeness
  const totalUsers = users.length;
  const ethnicityAllFilled = users.filter(u => u.ethnicity).length;
  const dataCompleteness = {
    ethnicity: parseFloat((ethnicityAllFilled / totalUsers).toFixed(2)),
    gender: parseFloat((genderFilled / totalUsers).toFixed(2)),
  };

  // 10. Experts with no professions
  const noProfessionCount = users.filter(u => !u.professions || !u.professions.length).length;

  // Build output
  const community = {
    totalExperts,
    onboardedThisMonth,
    bentonvilleExperts,
    coverageScore,
    coverageCritHighTotal: critHighSubRpgs.length,
    coverageCritHighMeeting: coverageNumerator,
    professionDistribution,
    noProfessionCount,
    stateDistribution,
    arkansasEntry: arkansasInTop10 ? null : arkansasEntry,
    ethnicity: ethnicityCounts,
    gender: genderCounts,
    tenureByQuarter,
    dataCompleteness,
    urgencyMap,
    lastUpdated: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(community, null, 2));
  console.log(`\nCommunity data written to: ${OUTPUT_PATH}`);
  console.log(`  Total experts: ${totalExperts}`);
  console.log(`  Onboarded this month: ${onboardedThisMonth}`);
  console.log(`  Bentonville experts: ${bentonvilleExperts}`);
  console.log(`  Coverage score: ${coverageScore}%`);
  console.log(`  Gender completeness: ${(dataCompleteness.gender * 100).toFixed(1)}%`);
  console.log(`  Ethnicity completeness: ${(dataCompleteness.ethnicity * 100).toFixed(1)}%`);
  console.log(`  Top profession: ${professionDistribution[0]?.name} (${professionDistribution[0]?.count})`);
  console.log(`  Top state: ${stateDistribution[0]?.state} (${stateDistribution[0]?.count})`);
}

main();
