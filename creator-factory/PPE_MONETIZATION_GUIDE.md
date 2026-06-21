# PPE Monetization Guide

**How to price, model, and configure Pay-Per-Event (PPE) for your Apify Pilot actors.**

---

## Table of Contents

1. [PPE Overview](#1-ppe-overview)
2. [Cost Modeling Calculator](#2-cost-modeling-calculator)
3. [Setting PPE in Openfy](#3-setting-ppe-in-openfy)
4. [Pricing Strategies](#4-pricing-strategies)
5. [FAQ](#5-faq)

---

## 1. PPE Overview

### What Is Pay-Per-Event?

Pay-Per-Event (PPE) is Apify's usage-based billing model for Store-published actors. Instead of a flat monthly fee, **users are charged per "event" your actor reports** — typically per result pushed to the dataset.

You set the price. Apify takes a platform cut. The remainder is your revenue.

### Two Event Types Openfy Configures

Openfy's `sync-store` script automatically configures two events for each actor:

| Event | ID | When It Fires | One-Time? | Default Price |
| --- | --- | --- | --- | --- |
| **Actor Start** | `apify-actor-start` | Once per run, when the actor launches | Yes | `$0.10005` |
| **Result** | `apify-default-dataset-item` | Once per item pushed to the default dataset | No (per item) | `$0.10001` (~$100/1,000 results) |

### Apify's Role

- Apify handles all billing, payment collection, and fraud prevention
- **Platform usage costs** (compute, storage) are paid by **you** (the actor developer) by default. Openfy sets `isPPEPlatformUsagePaidByUser: false` so the **user** pays for compute, not you
- You keep the net margin between your event price and Apify's platform overhead

### Free Tier vs. Paid Tier

Actors published to the Apify Store with PPE enabled are **paid-tier only** by default. There is no built-in free tier — users pay per run.

If you want a free tier, you must implement it in your actor code (e.g., cap results at 10 without checking PPE pricing — Apify doesn't enforce code-level free limits automatically).

---

## 2. Cost Modeling Calculator

Use this table to model your revenue before setting prices. Adjust the values for your actor's expected usage pattern.

### Basic Revenue Model

| Parameter | Example Value | Your Value |
| --- | --- | --- |
| Start event price (per run) | `$0.10` | |
| Result event price (per result) | `$0.10` | |
| Average results per run | `50` | |
| Monthly runs (projected) | `200` | |
| Monthly results (runs × avg results) | `10,000` | |

### Monthly P&L

| Line Item | Calculation | Example |
| --- | --- | --- |
| **Start event revenue** | runs × start price | 200 × $0.10 = **$20.00** |
| **Result event revenue** | results × result price | 10,000 × $0.10 = **$1,000.00** |
| **Gross revenue** | start + result | **$1,020.00** |
| **Apify platform cut** (est. ~20-30%) | gross × 0.25 | ~**$255.00** |
| **Your net revenue** | gross − platform cut | ~**$765.00** |
| **Your compute costs** | paid by user (PPE model) | **$0.00** |
| **Your net profit** | net revenue − compute | ~**$765.00** |

> **Note**: Apify's exact platform cut varies and is not publicly documented to a specific percentage. The 25% estimate above is illustrative. Check your Apify Console earnings dashboard for actual figures.

### Sensitivity Table — Result Price vs. Monthly Volume

| Monthly Results | $0.01/result | $0.05/result | $0.10/result | $0.50/result |
| --- | --- | --- | --- | --- |
| 1,000 | $10 | $50 | $100 | $500 |
| 5,000 | $50 | $250 | $500 | $2,500 |
| 10,000 | $100 | $500 | $1,000 | $5,000 |
| 50,000 | $500 | $2,500 | $5,000 | $25,000 |
| 100,000 | $1,000 | $5,000 | $10,000 | $50,000 |

*(Gross revenue only — subtract Apify's platform cut for net)*

### Break-Even Analysis

To find your minimum viable monthly volume at a given price:

```
break_even_runs = your_monthly_fixed_costs / (net_revenue_per_run)
```

Since compute is user-paid in Openfy's PPE config, your fixed costs are effectively **$0** (unless you're paying for an AI API key). This means **any revenue is profit** from day one.

**Practical minimum** to justify maintenance time: aim for **$200+/month net**. At $0.10/result and a 25% platform cut:

```
$200 net / $0.075 net per result = ~2,667 results/month minimum
```

---

## 3. Setting PPE in Openfy

### How `sync-store` Configures Pricing

The `npm run sync-store` script reads the actor registry (`reports/actor-registry.json`) and calls the Apify API to apply PPE pricing. You do **not** need to manually touch the Apify Console.

The pricing payload sent looks like this:

```json
{
  "pricingInfos": [
    {
      "pricingModel": "PAY_PER_EVENT",
      "isPPEPlatformUsagePaidByUser": false,
      "apifyMarginPercent": 20,
      "ppeConfig": {
        "events": [
          {
            "eventType": "apify-actor-start",
            "title": "Actor Start",
            "description": "Charged when the Actor starts running.",
            "isInfrequent": true,
            "price": 0.10005
          },
          {
            "eventType": "apify-default-dataset-item",
            "title": "result",
            "description": "Single result in the default dataset.",
            "isInfrequent": false,
            "price": 0.10001
          }
        ]
      }
    }
  ]
}
```

### Customizing Prices Per Actor

To set custom prices for a specific actor, modify the `storePublication.ts` pricing block before running `sync-store`, or override prices directly in the Apify Console after the initial sync.

> ⚠️ **Important**: Apify only allows pricing changes **once per 30 days** per actor. `sync-store` detects whether pricing is already configured and skips the update if so, to avoid hitting this limit accidentally.

### Verifying PPE Is Active

After running `sync-store`, verify in the Apify Console:
1. Go to [console.apify.com](https://console.apify.com) → Your Actors
2. Open your actor → **Monetization** tab
3. Confirm "Pay-Per-Event" is shown with both event types listed

---

## 4. Pricing Strategies

### Strategy 1: Standard PPE (Recommended for most actors)

Set both a start event fee and a per-result fee. Users pay a small run fee plus a per-result charge.

**Best for**: Lead generation, website auditors, data enrichment actors.

```
Start fee:  $0.10 per run
Result fee: $0.10 per result
```

**User pays for 100 results**: $0.10 + (100 × $0.10) = **$10.10**

**Pros**: Predictable. Scales directly with user value received.
**Cons**: Users may hesitate if they don't know their expected volume.

---

### Strategy 2: High Start Fee, Low Result Fee

Charge more upfront, less per result. Better for actors where the "run itself" provides value even with few results.

```
Start fee:  $0.50 per run
Result fee: $0.01 per result
```

**User pays for 100 results**: $0.50 + (100 × $0.01) = **$1.50**

**Best for**: Actors that do expensive upfront analysis (AI calls, slow crawls) regardless of result count.
**Pros**: Captures value even from runs with low yield.
**Cons**: Users with very high volume may prefer a lower per-result model.

---

### Strategy 3: Results-Only Pricing

No start fee. Pure per-result billing.

```
Start fee:  $0.00
Result fee: $0.15 per result
```

**User pays for 100 results**: 0 + (100 × $0.15) = **$15.00**

**Best for**: Scrapers where users care only about result quality, not run overhead.
**Pros**: Zero barrier to try the actor (no upfront cost). Very transparent.
**Cons**: Users may run many low-yield runs to "try" the actor for free.

---

### Strategy 4: Premium Pricing (High-value data)

For actors surfacing rare or hard-to-get data, premium pricing is justified.

```
Start fee:  $0.25 per run
Result fee: $0.50 per result
```

**User pays for 100 results**: $0.25 + (100 × $0.50) = **$50.25**

**Best for**: Competitive intelligence, investor leads, rare contact data.
**Real-world benchmark**: Some premium Apify actors charge $1–$5 per result for proprietary data access.

---

## 5. FAQ

**Q: How much does Apify take from each transaction?**  
A: Apify's exact revenue share is not publicly disclosed in a fixed percentage. Check your Apify Console → Monetization for real-time earnings breakdowns.

**Q: Can I offer a free trial?**  
A: Not natively via PPE. You can implement a code-level trial (e.g., cap results at 5 for runs without a paid plan) but the billing infrastructure itself doesn't have a trial concept.

**Q: What if I set the price too high?**  
A: Users simply won't buy. Start conservative ($0.05–$0.10/result), watch adoption, and increase over 30-day windows as demand grows.

**Q: What if I want to change prices later?**  
A: Apify allows pricing updates once per 30 days per actor. Plan changes carefully. The `sync-store` script will skip the pricing update if you've already updated within 30 days.

**Q: Does PPE affect my free Apify compute quota?**  
A: With `isPPEPlatformUsagePaidByUser: false` (Openfy's default), **users pay for compute** as part of their usage. Your Apify account's own compute quota is not consumed by user runs of your published actor.

**Q: Where can I read Apify's official pricing docs?**  
A: [https://apify.com/pricing](https://apify.com/pricing) and [https://docs.apify.com/platform/actors/publishing/monetize](https://docs.apify.com/platform/actors/publishing/monetize)
