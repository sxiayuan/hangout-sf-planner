// Pulls upcoming fun events in San Francisco from DataSF (open data) into events.json.
// Run: node refresh-events.mjs   (then republish the Hangout SF artifact)
// Sources:
//   Street events: "Current and Upcoming Events based on Temporary Street Closures" (v9cz-kk5i)
//   Library events: "Our415 Events and Activities" (8i3s-ih2a), SF Public Library, adult-friendly only
import { writeFileSync } from "node:fs";

const DAYS = 21;
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const until = new Date(today.getTime() + DAYS * 864e5);
const T0 = ymd(today), T1 = ymd(until);

async function soql(id, params) {
  const url = `https://data.sfgov.org/resource/${id}.json?` + new URLSearchParams(params);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  return r.json();
}
const title = s => s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\bSt\b/g, "St").replace(/'S\b/g, "'s");
const clean = s => String(s || "").replace(/&#0?39;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const hm = t => (t || "").slice(0, 5);

const BORING = /ignite|conference|summit|construction|filming|film shoot|crane|utility|meeting|dreamforce|expo|convention/i;
const street = await soql("v9cz-kk5i", {
  $select: "case_num,case_name,start_dt,end_dt,start_time,end_time,loc_desc",
  $where: `type='Special Event' AND end_dt >= '${T0}' AND start_dt <= '${T1}T23:59:59'`,
  $order: "start_dt", $limit: "2000"
});
const byCase = new Map();
for (const r of street) {
  const name = clean(r.case_name);
  if (!name || BORING.test(name)) continue;
  const e = byCase.get(r.case_num) || { id: "s" + r.case_num, title: name, kind: "Street event", start: r.start_dt.slice(0, 10), end: r.end_dt.slice(0, 10), time: hm(r.start_time), endTime: hm(r.end_time), where: title(clean(r.loc_desc)) };
  if (r.start_dt.slice(0, 10) < e.start) e.start = r.start_dt.slice(0, 10);
  if (r.end_dt.slice(0, 10) > e.end) e.end = r.end_dt.slice(0, 10);
  byCase.set(r.case_num, e);
}

const lib = await soql("8i3s-ih2a", {
  $select: "id,event_name,event_start_date,event_end_date,start_time,end_time,site_location_name,site_address,more_info,age_group_eligibility_tags,analysis_neighborhood",
  $where: `org_name='SF Public Library' AND event_start_date >= '${T0}' AND event_start_date <= '${T1}T23:59:59'`,
  $order: "event_start_date", $limit: "5000"
});
const FUN = /^(Performance|Workshop|Social|Activity|Film|Concert|Music|Presentation|Exhibit|Exhibition|Class|Celebration|Festival|Game|Author)/i;
const NOPE = /storytime|tutorial|tech help|^full:|esl|homework|tax|resume|job|citizenship|playgroup|toddler|baby|babies|lego|teen/i;
const libEvents = lib.filter(r => {
  const tags = r.age_group_eligibility_tags || "";
  const name = clean(r.event_name);
  return /Adults|TAY|Seniors/i.test(tags) && FUN.test(name) && !NOPE.test(name);
}).map(r => ({
  id: "l" + r.id, title: clean(r.event_name).replace(/^[A-Za-z ]+:\s*/, ""), kind: clean(r.event_name).split(":")[0],
  start: r.event_start_date.slice(0, 10), end: (r.event_end_date || r.event_start_date).slice(0, 10),
  time: hm(r.start_time), endTime: hm(r.end_time),
  where: clean(r.site_location_name) + " Library", address: clean(r.site_address),
  hood: clean(r.analysis_neighborhood), link: r.more_info && /^https?:/.test(r.more_info) ? r.more_info : (r.more_info ? "https://" + r.more_info : "")
}));

const events = [...byCase.values(), ...libEvents].sort((a, b) => (a.start + a.time).localeCompare(b.start + b.time));
writeFileSync(new URL("./events.json", import.meta.url), JSON.stringify({
  updated: new Date().toISOString(),
  sources: [
    { name: "DataSF: Current and Upcoming Events based on Temporary Street Closures", url: "https://data.sfgov.org/d/v9cz-kk5i" },
    { name: "DataSF: Our415 Events and Activities (SF Public Library)", url: "https://data.sfgov.org/d/8i3s-ih2a" }
  ],
  events
}, null, 1));
console.log(`events.json: ${byCase.size} street events, ${libEvents.length} library events (${T0} to ${T1})`);
