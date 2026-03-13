import axios from 'axios';

const BASE_V1 = 'https://api.streak.com/api/v1';
const BASE_V2 = 'https://api.streak.com/api/v2';

function authHeader() {
  const key = process.env.STREAK_API_KEY;
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

export async function fetchPipelineBoxes(pipelineKey) {
  const boxes = [];
  let page = 0;
  const limit = 200;

  while (true) {
    const res = await axios.get(`${BASE_V1}/pipelines/${pipelineKey}/boxes`, {
      headers: authHeader(),
      params: { limit, page },
    });

    const items = Array.isArray(res.data) ? res.data : res.data.results || [];
    if (items.length === 0) break;
    boxes.push(...items);

    if (items.length < limit) break;
    page++;
  }

  return boxes;
}

export async function fetchPipelineStages(pipelineKey) {
  const res = await axios.get(`${BASE_V1}/pipelines/${pipelineKey}/stages`, {
    headers: authHeader(),
  });
  return res.data;
}

export async function fetchRecruitmentMetrics() {
  const appliedKey = process.env.STREAK_APPLIED_PIPELINE;
  const sourcedKey = process.env.STREAK_SOURCED_PIPELINE;

  const [appliedBoxes, sourcedBoxes, appliedStages, sourcedStages] = await Promise.all([
    fetchPipelineBoxes(appliedKey),
    fetchPipelineBoxes(sourcedKey),
    fetchPipelineStages(appliedKey).catch(() => ({})),
    fetchPipelineStages(sourcedKey).catch(() => ({})),
  ]);

  // Parse stage names from the stages data
  const stageMap = {};
  for (const [key, stage] of Object.entries({ ...appliedStages, ...sourcedStages })) {
    if (stage && stage.name) stageMap[key] = stage.name;
  }

  // Group boxes by stage
  const appliedByStage = groupByStage(appliedBoxes, stageMap);
  const sourcedByStage = groupByStage(sourcedBoxes, stageMap);

  // Count by time periods
  const now = Date.now();
  const DAY = 86400000;

  return {
    applied: {
      total: appliedBoxes.length,
      byStage: appliedByStage,
      today: filterByTime(appliedBoxes, now - DAY),
      thisWeek: filterByTime(appliedBoxes, now - 7 * DAY),
      thisMonth: filterByTime(appliedBoxes, now - 30 * DAY),
      thisQuarter: filterByTime(appliedBoxes, now - 90 * DAY),
      boxes: appliedBoxes,
    },
    sourced: {
      total: sourcedBoxes.length,
      byStage: sourcedByStage,
      today: filterByTime(sourcedBoxes, now - DAY),
      thisWeek: filterByTime(sourcedBoxes, now - 7 * DAY),
      thisMonth: filterByTime(sourcedBoxes, now - 30 * DAY),
      thisQuarter: filterByTime(sourcedBoxes, now - 90 * DAY),
      boxes: sourcedBoxes,
    },
    combined: {
      total: appliedBoxes.length + sourcedBoxes.length,
      today: filterByTime([...appliedBoxes, ...sourcedBoxes], now - DAY),
      thisWeek: filterByTime([...appliedBoxes, ...sourcedBoxes], now - 7 * DAY),
      thisMonth: filterByTime([...appliedBoxes, ...sourcedBoxes], now - 30 * DAY),
      thisQuarter: filterByTime([...appliedBoxes, ...sourcedBoxes], now - 90 * DAY),
    },
  };
}

function groupByStage(boxes, stageMap) {
  const groups = {};
  for (const box of boxes) {
    const stageKey = box.stageKey || 'unknown';
    const stageName = stageMap[stageKey] || box.stageName || stageKey;
    if (!groups[stageName]) groups[stageName] = 0;
    groups[stageName]++;
  }
  return groups;
}

function filterByTime(boxes, since) {
  return boxes.filter(b => {
    const created = b.creationTimestamp || b.lastUpdatedTimestamp || 0;
    return created >= since;
  }).length;
}

export function getConversionFunnel(boxes) {
  const stages = [
    'applied', 'applied-qualified', 'sourced', 'sourced-qualified',
    'interest-confirmed', 'tdc-profile-created', 'welcome-email',
  ];

  const funnel = {};
  for (const box of boxes) {
    const stage = (box.stageName || '').toLowerCase().replace(/\s+/g, '-');
    for (const s of stages) {
      if (stage.includes(s)) {
        funnel[s] = (funnel[s] || 0) + 1;
        break;
      }
    }
  }
  return funnel;
}
