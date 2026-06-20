# PitchPilot — Investor Finder & Cold Pitch Writer

PitchPilot is a B2B lead intelligence and outreach automation agent designed to find early-stage venture capital firms, scrape their investment thesis and portfolios, and draft highly personalized cold outreach emails and proposals for SaaS applications.

---

## How It Works

PitchPilot executes a multi-step crawling and enrichment pipeline:

1. **Investor Discovery & Dorking**:
   - If a seed list of target VC domains is not provided, the Actor automatically uses search engine dorks (via public HTML indexes) to search for VC firms matching your target niche (e.g., *HealthTech*, *FinTech*, *B2B SaaS*).
2. **Deep Website Crawling**:
   - The Actor runs a high-speed parallel crawl on target VC domains.
   - It crawls `About`, `Team`, `Portfolio`, `Companies`, and `Contact` subpages to extract investment criteria text, contact emails, phone numbers, social handles, and partner names.
3. **Synergy Assessment**:
   - It parses portfolio company names and matches the VC's active thesis keywords against your application's profile to calculate a relevance score.
4. **Outreach Sequence Drafting**:
   - Using OpenAI's `gpt-4o-mini` (or a smart B2B outreach fallback template engine if no API key is provided), it drafts a personalized email referencing the partner's name, their specific investment focus, and a related portfolio company.
   - It generates a 3-sentence proposal summarizing the Problem, Solution, and Market Opportunity.

---

## Input Parameters

The Actor accepts the following input parameters:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `appName` | String | Yes | `health-erecords` | The name of your application. |
| `appDescription` | String | Yes | *See default* | Core features, target audience, and problem solved. |
| `targetNiche` | String | No | `HealthTech` | The vertical your app resides in. |
| `fundingStage` | String | No | `Seed` | Current round target (e.g., Pre-Seed, Seed, Series A). |
| `investorUrls` | Array | No | `[]` | List of target VC domains to crawl. |
| `autoDiscover` | Boolean | No | `true` | Auto-search and find matching VCs if target list is empty. |
| `openaiApiKey` | String | No | `""` | OpenAI API Key for customized AI pitch generation. |

### Example Input JSON
```json
{
  "appName": "health-erecords",
  "appDescription": "A HIPAA-compliant Electronic Health Records (EHR) platform for private medical practices that automates patient intake and clinical charting, saving doctors 10+ hours a week.",
  "targetNiche": "HealthTech",
  "fundingStage": "Seed",
  "investorUrls": [
    { "url": "https://www.character.vc" }
  ],
  "autoDiscover": false
}
```

---

## Output Dataset Schema

The output dataset contains structured records for each target investor:

| Field | Type | Description |
|---|---|---|
| `investorName` | String | VC firm or investor name. |
| `website` | String | Target website URL. |
| `focusNiches` | Array | Detected focus industries. |
| `relevanceScore` | Number | Alignment rating between 1.0 and 10.0. |
| `contactEmails` | Array | Found email addresses. |
| `phoneNumbers` | Array | Found phone numbers. |
| `socialLinks` | Array | LinkedIn/Twitter profiles. |
| `teamMembers` | Array | Key partners or team names. |
| `portfolioCompanies` | Array | Sample portfolio companies. |
| `personalizedSubjectLine` | String | Suggested email subject. |
| `personalizedPitchEmail` | String | Complete cold outreach email draft. |
| `personalizedProposal` | String | High-level pitch proposal summary. |

---

## Integration

You can trigger this Actor and consume its output datasets programmatically using the Apify API or SDK clients:

### Node.js Integration
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_APIFY_TOKEN' });

const run = await client.actor('username/pitch-pilot-investor-outreach').call({
    appName: "health-erecords",
    targetNiche: "HealthTech"
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.dir(items);
```

### Python Integration
```python
from apify_client import ApifyClient

client = ApifyClient('YOUR_APIFY_TOKEN')

run = client.actor('username/pitch-pilot-investor-outreach').call(run_input={
    'appName': 'health-erecords',
    'targetNiche': 'HealthTech'
})

for item in client.dataset(run['defaultDatasetId']).list_items().items:
    print(item)
```

---

## Disclaimer & Compliance

- **Data Privacy**: Users must ensure compliance with regional email outreach laws (e.g. CAN-SPAM, GDPR) when contacting investors.
- **Bot Etiquette**: This crawler accesses public content only. Refrain from crawling sites that explicitly prohibit scanning via `robots.txt` or security guidelines.
- **AI Output Validation**: Always review email drafts manually before sending to ensure accuracy and appropriate tone.
