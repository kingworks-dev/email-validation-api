// Email validation core (pure logic + DoH MX lookup). No SMTP probing.
export const ROLES = new Set("admin administrator abuse billing contact help hello info jobs marketing noreply no-reply postmaster sales security support webmaster team office root hostmaster mail service enquiries enquiry press hr careers accounts".split(" "));
export const FREE = new Set("gmail.com googlemail.com yahoo.com ymail.com outlook.com hotmail.com live.com msn.com aol.com icloud.com me.com mac.com proton.me protonmail.com gmx.com gmx.net mail.com zoho.com yandex.com yandex.ru qq.com 163.com 126.com comcast.net att.net verizon.net sbcglobal.net".split(" "));
export const COMMON = ["gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com","aol.com","live.com","msn.com","comcast.net","protonmail.com","proton.me","me.com","att.net","sbcglobal.net","verizon.net","ymail.com"];
export function lev(a, b) {
  const m = a.length, n = b.length; let p = Array.from({length: n + 1}, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j-1] + 1, p[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); p = c; }
  return p[n];
}
export function suggest(domain) {
  if (COMMON.includes(domain)) return null;
  let best = null, bd = 3;
  for (const c of COMMON) { const d = lev(domain, c); if (d < bd) { bd = d; best = c; } }
  return bd <= 2 && domain.length >= 6 ? best : null;
}
const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
export function syntax(email) {
  if (typeof email !== "string" || email.length > 254) return null;
  const at = email.lastIndexOf("@"); if (at < 1) return null;
  const local = email.slice(0, at), domain = email.slice(at + 1).toLowerCase();
  if (local.length > 64 || !LOCAL_RE.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  const labels = domain.split("."); if (labels.length < 2 || !labels.every(l => LABEL_RE.test(l)) || !/^[a-z]{2,}$|^xn--/.test(labels[labels.length-1])) return null;
  return { local, domain };
}
export async function mx(domain, fetchFn = fetch) {
  const hit = async (type) => {
    const r = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    return r.json();
  };
  let j; try { j = await hit("MX"); } catch (e) {
    try { const r = await fetchFn(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`); j = await r.json(); } catch (e2) { return { ok: null, records: [], error: "dns_unavailable" }; }
  }
  const recs = (j.Answer || []).filter(a => a.type === 15).map(a => a.data.trim()).sort();
  if (recs.length && !(recs.length === 1 && /^0?\s*\.$/.test(recs[0]))) return { ok: true, records: recs };
  if (j.Status === 3) return { ok: false, records: [] };
  try { const a = await hit("A"); if ((a.Answer || []).some(x => x.type === 1)) return { ok: true, records: [], implicit_a_record: true }; } catch (e) {}
  return { ok: false, records: [] };
}
export async function validate(email, disposable, fetchFn = fetch) {
  const out = { email, valid_syntax: false, domain: null, mx_found: null, mx_records: [], disposable: false, role_account: false, free_provider: false, did_you_mean: null, deliverable: "undeliverable", score: 0, reasons: [] };
  const s = syntax((email || "").trim()); if (!s) { out.reasons.push("invalid_syntax"); return out; }
  out.valid_syntax = true; out.domain = s.domain;
  out.disposable = disposable.has(s.domain);
  out.role_account = ROLES.has(s.local.toLowerCase());
  out.free_provider = FREE.has(s.domain);
  out.did_you_mean = suggest(s.domain) ? `${s.local}@${suggest(s.domain)}` : null;
  const m = await mx(s.domain, fetchFn); out.mx_found = m.ok; out.mx_records = m.records;
  if (m.ok === false) out.reasons.push("no_mx_records");
  if (m.ok === null) out.reasons.push("dns_unavailable");
  if (out.disposable) out.reasons.push("disposable_domain");
  if (out.role_account) out.reasons.push("role_account");
  if (out.did_you_mean) out.reasons.push("possible_typo");
  let sc = 100; if (m.ok === false) sc = 0; else { if (m.ok === null) sc -= 20; if (out.disposable) sc -= 60; if (out.role_account) sc -= 15; if (out.did_you_mean) sc -= 40; }
  out.score = Math.max(0, sc);
  out.deliverable = m.ok === false ? "undeliverable" : (out.disposable || out.did_you_mean) ? "risky" : m.ok === null ? "unknown" : "deliverable";
  return out;
}
