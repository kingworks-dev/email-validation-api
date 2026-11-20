import { DISPOSABLE } from "./disposable.js";
import { validate } from "./core.js";
const J = (o, s = 200, mp) => new Response(JSON.stringify(o), { status: s, headers: Object.assign({ "content-type": "application/json", "access-control-allow-origin": "*" }, mp ? { "x-marketplace": mp } : {}) });
// one proxy secret per marketplace; binding name -> marketplace label
const SECRETS = { PROXY_SECRET: "rapidapi", PROXY_SECRET_APIMARKET: "apimarket", PROXY_SECRET_ZYLA: "zyla" };
function marketplace(req, env) {
  const got = req.headers.get("X-RapidAPI-Proxy-Secret");
  if (!got) return null;
  let hit = null;
  for (const [k, label] of Object.entries(SECRETS)) { if (env[k] && got === env[k]) hit = label; }
  return hit;
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/health") return J({ ok: true });
    const mp = marketplace(req, env);
    if (!mp) return J({ error: "forbidden" }, 403);
    console.log(JSON.stringify({ evt: "call", marketplace: mp, path: u.pathname }));
    if (u.pathname === "/validate") {
      let email = u.searchParams.get("email");
      if (!email && req.method === "POST") { try { email = (await req.json()).email; } catch (e) {} }
      if (!email) return J({ error: "missing email" }, 400);
      return J(await validate(email, DISPOSABLE), 200, mp);
    }
    if (u.pathname === "/validate/batch" && req.method === "POST") {
      let b; try { b = await req.json(); } catch (e) { return J({ error: "bad json" }, 400); }
      const list = (b.emails || []).slice(0, 25);
      return J({ results: await Promise.all(list.map(e => validate(e, DISPOSABLE))) }, 200, mp);
    }
    return J({ error: "not found" }, 404);
  }
};
