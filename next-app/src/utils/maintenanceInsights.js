export const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function ticketDateKey(ticket) {
  const raw = ticket.createdDate || ticket.createdAt || ticket.date;
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = raw?.toDate ? raw.toDate() : new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date);
}
export const issueCategories = [
  ['toilet-leak', 'Leaking toilets'], ['sink-leak', 'Leaking sinks & pipes'],
  ['roof-leak', 'Roof & ceiling leaks'], ['geyser-leak', 'Geyser leaks'],
  ['water-leak', 'Other water leaks'], ['drainage', 'Blocked drains & toilets'],
  ['electrical', 'Electrical faults'], ['doors', 'Doors, locks & windows'],
  ['damp', 'Damp & mould'], ['other', 'Other issues']
];
export const issueCategorySource = ticket => JSON.stringify({ faults: Array.isArray(ticket.faults) ? ticket.faults : [], description: ticket.description || '' });
export function hasConfirmedIssueCategories(ticket) {
  return ticket.issueCategoriesConfirmed === true && ticket.issueCategorySource === issueCategorySource(ticket)
    && Array.isArray(ticket.issueCategories) && ticket.issueCategories.length > 0
    && ticket.issueCategories.every(key => issueCategories.some(([valid]) => valid === key));
}
export function issueKeys(ticket) {
  return hasConfirmedIssueCategories(ticket) ? [...new Set(ticket.issueCategories)] : suggestIssueKeys(ticket);
}
export function suggestIssueKeys(ticket) {
  const faults = Array.isArray(ticket.faults) ? ticket.faults : [];
  const texts = [...faults, ticket.description || ''].flatMap(value => String(value).toLowerCase().split(/[;\n]|\bbut\b/)).filter(Boolean);
  const found = new Set();
  for (const text of texts) {
    const leak = (/\bleak\w*\b|\bdrip\w*\b|\bburst\b|\bwater\s+(pooling|seeping|escaping)|\bpooling\s+(water|beneath|under)|\b(puddle|seepage)\b/.test(text) || /\b(toilet|cistern)\b.*\b(running|overflowing)\b|\brunning\s+(toilet|cistern)\b/.test(text)) && !/\b(no|without)\s+(signs?\s+of\s+)?(water\s+)?(leak|drip|seep|puddle)/.test(text);
    let matched = false;
    if (leak) {
      if (/\btoilet|\bcistern|\bwc\b/.test(text)) { found.add('toilet-leak'); matched = true; }
      if (/\bsink|\bbasin|\bpipe|\btap|\bfaucet/.test(text)) { found.add('sink-leak'); matched = true; }
      if (/\broof|\bceiling/.test(text)) { found.add('roof-leak'); matched = true; }
      if (/\bgeyser|water heater/.test(text)) { found.add('geyser-leak'); matched = true; }
      if (!matched) found.add('water-leak');
      matched = true;
    }
    if (/\bblock\w*\b|\bclog\w*\b|\bdrain\w*\b|\bsewage\b|not\s+flushing|won.t\s+flush|slow\s+draining/.test(text)) { found.add('drainage'); matched = true; }
    if (/\belectric\w*\b|\bpower\b|\bsocket\b|\btripp\w*\b|\blight\w*\b/.test(text)) { found.add('electrical'); matched = true; }
    if (/\bdoor\w*\b|\block\w*\b|\bwindow\w*\b/.test(text)) { found.add('doors'); matched = true; }
    if (/\bdamp\b|\bmould\b|\bmold\b/.test(text)) { found.add('damp'); matched = true; }
    if (!matched) found.add('other');
  }
  return [...(found.size ? found : new Set(['other']))];
}
export const isLeakTicket = ticket => issueKeys(ticket).some(key => key.endsWith('-leak'));
export function summarizeIssues(tickets) {
  const groups = issueCategories.map(([key, label]) => {
    const matching = tickets.filter(ticket => issueKeys(ticket).includes(key));
    const properties = new Map();
    matching.forEach(ticket => {
      const name = String(ticket.property || '').trim();
      if (!name) return;
      const normalized = name.toLowerCase().replace(/\s+/g, ' ');
      const current = properties.get(normalized) || { property: name, count: 0 };
      current.count++;
      properties.set(normalized, current);
    });
    return { key, label, tickets: matching, count: matching.length, active: matching.filter(ticket => String(ticket.status).toLowerCase() !== 'closed').length, repeats: [...properties.values()].filter(item => item.count > 1).sort((a,b) => b.count - a.count) };
  }).filter(group => group.count).sort((a,b) => b.count - a.count || a.label.localeCompare(b.label));
  return { confirmed: tickets.filter(hasConfirmedIssueCategories).length, suggested: tickets.filter(ticket => !hasConfirmedIssueCategories(ticket)).length, groups, leaks: tickets.filter(isLeakTicket).length, activeLeaks: tickets.filter(ticket => isLeakTicket(ticket) && String(ticket.status).toLowerCase() !== 'closed').length, repeats: groups.flatMap(group => group.repeats.map(item => ({ ...item, label: group.label }))) };
}
export function trendData(tickets, start, end) {
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(+first) || !Number.isFinite(+last) || first > last) return [];
  const monthly = (last - first) / 86400000 > 45;
  const bins = new Map();
  const cursor = new Date(first);
  if (monthly) cursor.setUTCDate(1);
  while (cursor <= last && bins.size < 600) {
    const key = cursor.toISOString().slice(0, monthly ? 7 : 10);
    bins.set(key, { key, label: new Intl.DateTimeFormat('en-ZA', { timeZone: 'UTC', ...(monthly ? {month:'short', year:'2-digit'} : {day:'numeric', month:'short'}) }).format(cursor), total:0, leaks:0 });
    if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1); else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  tickets.forEach(ticket => {
    const date = ticketDateKey(ticket);
    if (date < start || date > end) return;
    const bin = bins.get(date.slice(0, monthly ? 7 : 10));
    if (bin) { bin.total++; if (isLeakTicket(ticket)) bin.leaks++; }
  });
  return [...bins.values()];
}
