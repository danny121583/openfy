import path from "node:path";

export const projectRoot = path.resolve(process.cwd());

export const generatedActorsDir = path.join(projectRoot, "generated-actors");
export const reportsDir = path.join(projectRoot, "reports");
export const mainRunsDir = path.join(reportsDir, "main-agent-runs");
export const actorRegistryPath = path.join(reportsDir, "actor-registry.json");

export const maxAttempts = Number(process.env.MAIN_AGENT_MAX_ATTEMPTS ?? 10);
export const actorsPerRun = Number(process.env.MAIN_AGENT_ACTORS_PER_RUN ?? 5);

export const storeCategories = [
  "AI",
  "Agents",
  "Lead generation",
  "SEO tools",
  "E-commerce",
  "Social media",
  "Google Maps",
  "Web scraping",
  "Automation",
  "Data extraction",
  "Monitoring",
  "Jobs",
  "Real estate",
  "Restaurants",
  "Reviews",
  "Local business"
];

export const crowdedAreas = [
  "Google Maps scrapers",
  "Instagram scrapers",
  "TikTok scrapers",
  "LinkedIn scrapers",
  "YouTube scrapers",
  "Google Search scrapers",
  "generic website crawlers",
  "generic lead scrapers",
  "Amazon/ecommerce scrapers",
  "job scrapers",
  "real estate listing scrapers"
];
