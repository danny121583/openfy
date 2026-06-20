import type { GapAnalysis, StoreResearch } from "./types.js";

export function analyzeGaps(research: StoreResearch): GapAnalysis {
  const fetchedCount = research.categories.filter((item) => item.status === "fetched").length;
  return {
    gaps: [
      "AI-assisted local business conversion audits that produce agency-ready pitch data.",
      "Revenue-gap detectors that turn website weaknesses into outreach angles.",
      "Competitor offer and pricing change monitors for sales teams and local agencies.",
      "Prospect qualification scorers that combine contact reachability, CTA gaps, and improvement potential.",
      "Service-page extraction plus AI briefs for agencies building proposals and content plans."
    ],
    avoid: [
      "Another generic Google Maps scraper.",
      "Another generic social media scraper.",
      "Another generic website crawler without business logic.",
      "Actors requiring logins, private APIs, or unclear access rights.",
      "Pure commodity ecommerce/job/real-estate listing scrapers."
    ],
    recommendedAngles: [
      `Use live Store research where available (${fetchedCount}/${research.categories.length} categories fetched).`,
      "Combine extraction with deterministic scoring and optional grounded AI analysis.",
      "Prioritize recurring agency and monitoring use cases.",
      "Return buyer-ready reports, not only raw scraped fields.",
      "Keep inputs simple: website URLs, competitor URLs, or business records."
    ]
  };
}
