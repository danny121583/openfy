import { crowdedAreas, storeCategories } from "./config.js";
import type { StoreCategoryResearch, StoreResearch } from "./types.js";

export async function researchApifyStore(): Promise<StoreResearch> {
  const categories: StoreCategoryResearch[] = [];
  for (const category of storeCategories) {
    const query = encodeURIComponent(category);
    const url = `https://apify.com/store?search=${query}`;
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Apify Creator Factory Main Agent/0.1"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      categories.push({
        category,
        url,
        status: "fetched",
        actorMentions: extractActorMentions(html),
        notes: inferNotes(category, html)
      });
    } catch (error) {
      categories.push({
        category,
        url,
        status: "failed",
        actorMentions: [],
        notes: [`Could not fetch live Store search for ${category}. Use fallback crowded-category knowledge.`],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return {
    categories,
    crowdedAreas,
    researchedAt: new Date().toISOString()
  };
}

function extractActorMentions(html: string) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const titleMatches = [...clean.matchAll(/<[^>]*(?:title|aria-label)=["']([^"']{4,120})["']/gi)].map((match) => decode(match[1]));
  const textMatches = [...clean.matchAll(/>([^<>]{12,90}(?:scraper|crawler|extractor|monitor|agent|leads?|SEO|Google|Instagram|TikTok|LinkedIn)[^<>]{0,60})</gi)].map((match) => decode(match[1]));
  return [...new Set([...titleMatches, ...textMatches].map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 20);
}

function inferNotes(category: string, html: string) {
  const lower = html.toLowerCase();
  const notes = [`Searched Apify Store for "${category}".`];
  for (const term of ["google maps", "instagram", "tiktok", "linkedin", "youtube", "amazon", "jobs", "real estate", "lead"]) {
    if (lower.includes(term)) notes.push(`Store page contains repeated signals for ${term}.`);
  }
  if (notes.length === 1) notes.push("No strong repeated crowded-area signal detected in fetched HTML.");
  return notes.slice(0, 6);
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
