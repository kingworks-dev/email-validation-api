# Email Validation API

Validates an email address: syntax, MX records, disposable domains (10,400, list from https://github.com/disposable-email-domains/disposable-email-domains, CC0), role accounts, free providers, typo suggestions and a 0-100 score. No SMTP probing. Endpoints: `GET /validate?email=`, `POST /validate/batch`.

MIT licensed. Runs as a single Cloudflare Worker with no database and no paid dependencies.

## Self-host on Cloudflare Workers (free plan)

```sh
npm i -g wrangler
wrangler login
wrangler deploy
wrangler secret put PROXY_SECRET   # any long random string you choose
```

Every route except `/health` requires the header `X-RapidAPI-Proxy-Secret` to equal your `PROXY_SECRET`.
Without that secret set, protected routes return 403. (Edit `worker.js` if you want the routes open.)
Run the tests with `node test.mjs`. See `openapi.yaml` for the endpoints.

The Workers Free plan allows 100,000 requests per day, per https://developers.cloudflare.com/workers/platform/limits/ (read 2026-11-20).

## Hosted version

Don't want to run it? Use the hosted API (free 100 requests/month, PRO $9.99/month): https://rapidapi.com/kingaiapis4/api/email-validation-api46

## Support / sponsor

If this saves you time, sponsor the open-source APIs: https://buy.stripe.com/6oU5kwaPJ4Gg0Fc0Eb0x41A
