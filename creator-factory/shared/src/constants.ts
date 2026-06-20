import type { TemplateId } from "./types.js";

export const templates: { id: TemplateId; label: string; language: string }[] = [
  { id: "auto", label: "Auto", language: "Auto" },
  {
    id: "project-langgraph-agent-javascript",
    label: "JavaScript LangGraph",
    language: "JavaScript"
  },
  { id: "ts-beeai-agent", label: "TypeScript BeeAI", language: "TypeScript" },
  { id: "python-langgraph", label: "Python LangGraph", language: "Python" }
];

export const monetizableCategories = [
  "Lead generation",
  "Local business scraping",
  "Ecommerce scraping",
  "Social media data tools",
  "SEO tools",
  "Review monitoring",
  "Competitor monitoring",
  "Price monitoring",
  "Job scraping",
  "Real estate scraping",
  "Travel data extraction",
  "Restaurant/menu extraction",
  "AI enrichment of scraped data",
  "Contact discovery",
  "Website auditing",
  "Marketplace automation",
  "Workflow agents for business research",
  "Sales prospecting",
  "Recruiting intelligence",
  "Data cleaning/enrichment"
];

export const approvedTemplates = templates.filter((template) => template.id !== "auto").map((template) => template.id);
