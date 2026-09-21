# Dakzo Systems Website

Production website for **Dakzo Systems**.

## Current production scope

- French-first website with FR / EN language switching
- Home, Services, Pricing, About, Demo/Quote, Privacy, and Terms
- Dakzo brand palette: navy, blue, cyan
- Mobile-responsive design
- Secure server-side lead submission to Airtable CRM
- UTM, referrer, source-page, language, and form attribution
- Lead conversion event hooks through `window.dataLayer`
- Render-ready Node web service

## Lead flow

Browser form → `POST /api/leads` → secure Render server → Airtable **Website Lead Intake** webhook → **Leads** table → Airtable notification automation.

The Airtable webhook URL must only exist in the server environment variable:

`AIRTABLE_LEAD_WEBHOOK_URL`

Never expose it in browser JavaScript.

## Local run

```bash
npm run build
AIRTABLE_LEAD_WEBHOOK_URL="your-secret-webhook" npm start
```

Open `http://localhost:10000`.

## Render

- Runtime: Node
- Build command: `npm run build`
- Start command: `npm start`
- Required secret: `AIRTABLE_LEAD_WEBHOOK_URL`
- Recommended region: Frankfurt

## Commercial rules reflected on the site

- Websites: $800–$1,500 setup + $50–$100/month
- Business systems: $2,500–$6,000 setup + $250–$600/month
- ERP/custom: $7,500+ setup + $750+/month
- 50% deposit / 50% before final deployment
- 2 revision rounds
- Out-of-scope work quoted separately
