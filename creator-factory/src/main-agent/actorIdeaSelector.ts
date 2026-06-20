import { actorsPerRun } from "./config.js";
import type { ActorIdea, GapAnalysis, RegistryEntry, StoreResearch } from "./types.js";

export function selectActorIdeas(_research: StoreResearch, _gaps: GapAnalysis, registry: RegistryEntry[], existingSlugs: Set<string>) {
  const used = new Set([...registry.map((entry) => entry.slug), ...existingSlugs]);
  const selected: ActorIdea[] = [];
  for (const idea of candidateIdeas()) {
    if (selected.length >= actorsPerRun) break;
    if (used.has(idea.slug)) continue;
    selected.push(idea);
    used.add(idea.slug);
  }
  if (selected.length < actorsPerRun) {
    for (const idea of overflowIdeas()) {
      if (selected.length >= actorsPerRun) break;
      if (used.has(idea.slug)) continue;
      selected.push(idea);
      used.add(idea.slug);
    }
  }
  return selected;
}

function baseInput(description: string) {
  return {
    startUrls: { type: "array", required: true, description },
    maxItems: { type: "integer", default: 25 },
    includeAiAnalysis: { type: "boolean", default: true }
  };
}

function baseOutput(extra: Record<string, unknown>) {
  return {
    inputUrl: "string",
    status: "success | failed",
    score: "number",
    findings: "array",
    recommendations: "array",
    createdAt: "ISO string",
    ...extra
  };
}

export function candidateIdeas(): ActorIdea[] {
  return [
    {
      actorName: "AgentPilot — API AI-Readiness & MCP Server Generator",
      slug: "agent-pilot-mcp-generator",
      problemSolved: "Audits public OpenAPI specifications for AI suitability and automatically generates run-ready typescript/python Model Context Protocol (MCP) server code packages.",
      targetUsers: ["AI developers", "software engineers", "CTOs", "product managers", "system architects"],
      whyNotDuplicate: "Instead of being a generic API caller, this Actor evaluates schemas against strict LLM usability standards (description completeness, schema types, auth complexity) and generates fully functional stdio MCP servers on the fly.",
      inputSchemaDraft: {
        openapiUrl: { type: "string", description: "The URL pointing to a public OpenAPI YAML/JSON schema." },
        openapiSpec: { type: "string", description: "Directly pasted OpenAPI specification in YAML or JSON format." },
        targetLanguage: { type: "string", default: "typescript", enum: ["typescript", "python"] }
      },
      outputSchemaDraft: {
        aiReadinessScore: "number",
        overallWarnings: "array",
        endpointsAudited: "number",
        generatedCodeZipUrl: "string"
      },
      monetizationAngle: "Usage-based or pay-per-event pricing for developers and agencies exporting MCP servers from APIs.",
      template: "project-langgraph-agent-javascript",
      difficulty: "medium",
      expectedCategory: "mcp-servers",
      behavior: "Fetch and parse OpenAPI schemas, evaluate LLM parameter description completeness and auth requirements, generate Node/Python standard MCP server code files, and package into a downloadable zip."
    },
    {
      actorName: "TonePilot — Brand Aligner & Tone Consistency Auditor",
      slug: "brand-aligner-tone-auditor",
      problemSolved: "Crawls a business website and landing pages to audit all text against a provided Brand Guidelines document, scoring brand consistency and tone alignment.",
      targetUsers: ["brand managers", "marketing agencies", "content directors", "franchise marketers"],
      whyNotDuplicate: "Unlike generic content scrapers, this Actor compares live copy directly against a brand style guide, using AI to identify off-brand wording, passive tone, or deprecated terms and suggesting direct rewrites.",
      inputSchemaDraft: baseInput("Website homepage or subpages to audit for brand and tone consistency."),
      outputSchemaDraft: baseOutput({ brandAlignmentScore: "number", toneViolations: "array", recommendedRewrites: "array" }),
      monetizationAngle: "Pay-per-audit or monthly tone monitoring checks for marketing departments and agency clients.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Crawl web pages, extract copy, load brand guideline rules, execute Gemini consistency audits, and generate structured tone violation reports."
    },
    {
      actorName: "CleanPilot — B2B Lead List Data-Science Cleaner",
      slug: "lead-list-datascience-cleaner",
      problemSolved: "Cleans, format-normalizes, dedupes, and prioritizes raw scraped lead lists using sandboxed data engineering routines and domain enrichment.",
      targetUsers: ["lead sellers", "outbound agencies", "B2B sales teams", "data brokers"],
      whyNotDuplicate: "Instead of scraping data, this tool performs intelligent data quality cleaning, deduping, and enrichment on uploaded lead lists (CSVs), outputting sales-ready prioritized files.",
      inputSchemaDraft: baseInput("Lead list URLs or uploaded CSV paths to clean and enrich."),
      outputSchemaDraft: baseOutput({ cleaningQualityScore: "number", invalidContactsRemoved: "array", enrichedProfiles: "array" }),
      monetizationAngle: "Pay-per-clean or subscription API access for lead brokers and outbound sales operations.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Retrieve raw CSV records, apply formatting regexes, cross-reference contactability, deduplicate entries, and export clean sorted tables."
    },
    {
      actorName: "BriefPilot — Google Trends SEO Brief Generator",
      slug: "googletrends-content-brief-generator",
      problemSolved: "Translates breakout queries from Google Trends into fully structured, competitor-researched blog briefs and content outlines.",
      targetUsers: ["SEO agencies", "content marketers", "bloggers", "news publishers"],
      whyNotDuplicate: "Standard tools show trend keywords; this Actor fetches the trending search term, crawls the top-ranking competitor pages for it, and uses AI to generate content briefs.",
      inputSchemaDraft: baseInput("Google Trends query feeds or keyword lists to convert into briefs."),
      outputSchemaDraft: baseOutput({ trendVelocityScore: "number", competitorGaps: "array", contentOutline: "string" }),
      monetizationAngle: "Pay-per-brief or recurring content production planning for publishers.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Identify search trends, crawl competing SERP results, extract outlines, and compile AI content briefs with suggested titles and keyword density."
    },
    {
      actorName: "ShopPilot — E-commerce Personalized Product Recommender",
      slug: "product-personalized-recommender",
      problemSolved: "Scrapes e-commerce store feeds to act as a recommendation engine, outputting personalized product suggestions based on user profiles or queries.",
      targetUsers: ["e-commerce brands", "DTC marketers", "email marketing developers"],
      whyNotDuplicate: "It converts web scraping into a personalized recommendation API endpoint that can be directly integrated with marketing platforms like Klaviyo.",
      inputSchemaDraft: baseInput("Store collection or catalog feed URLs to parse and recommend from."),
      outputSchemaDraft: baseOutput({ productRecommendations: "array", recommendationReasoning: "string" }),
      monetizationAngle: "Usage-based API calls for e-commerce marketers running personalized email campaigns.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "E-commerce",
      behavior: "Crawl e-commerce product lists, extract prices, categories, and tags, index into a local context, and query recommendation matches using AI."
    },
    {
      actorName: "ResearchPilot — Deep Academic & Patent Research Auditor",
      slug: "deep-search-patent-auditor",
      problemSolved: "Performs multi-step academic and patent database queries to compile structured technology summaries, key claims, and market briefs.",
      targetUsers: ["R&D teams", "venture capital analysts", "patent lawyers", "biotech founders"],
      whyNotDuplicate: "It automates the tedious phase of technical literature analysis and patent claims mapping by performing multi-step search audits and compiling research briefs.",
      inputSchemaDraft: baseInput("Patent numbers, research paper links, or technology topic URLs to audit."),
      outputSchemaDraft: baseOutput({ researchBriefScore: "number", keyScientificClaims: "array", citationNetwork: "array" }),
      monetizationAngle: "Pay-per-brief for R&D teams and analysts reviewing competitive IP and academic progress.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Developer tools",
      behavior: "Query research archives, extract claims, trace citations, perform multi-step synthesis, and generate comprehensive technological briefs."
    },
    {
      actorName: "PrivacyPilot — GDPR & Privacy Compliance Auditor",
      slug: "website-privacy-gdpr-auditor",
      problemSolved: "Crawls business websites to find privacy policy, terms of service, and cookie disclosures, auditing them for compliance (GDPR, CCPA) and missing mandatory elements.",
      targetUsers: ["local agencies", "SEO agencies", "e-commerce operators", "web design teams", "privacy consultants"],
      whyNotDuplicate: "While generic website scrapers extract raw text, this Actor specifically crawls, locates, parses, and scores the compliance of legal and disclosure pages, producing a remediation brief for agencies to resell.",
      inputSchemaDraft: baseInput("Website homepage URLs to audit for privacy and GDPR compliance."),
      outputSchemaDraft: baseOutput({ complianceScore: "number", missingElements: "array", GDPRIssues: "array" }),
      monetizationAngle: "Pay-per-audit or recurring compliance monitoring for local business sites and e-commerce stores.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Crawl website to identify privacy policy and terms pages, extract policy text, run compliance checklist audits using AI, and return remediation briefs."
    },
    {
      actorName: "FactPilot — AI Fact-Checking & Content Revisions",
      slug: "ai-factcheck-content-revisions",
      problemSolved: "Extracts factual claims from public web articles or raw text, checks them against Google Search facts, and rewrites the content to be fully verified with sources.",
      targetUsers: ["content agencies", "SEO marketers", "publishers", "PR teams", "bloggers"],
      whyNotDuplicate: "While other actors extract raw text, this Actor acts as a full fact-checker and editor, identifying discrepancies, rating claim accuracy, and revising the text with source citations.",
      inputSchemaDraft: baseInput("URLs or articles to fact-check and revise."),
      outputSchemaDraft: baseOutput({ truthVerdict: "string", factCheckBreakdown: "array", revisedText: "string", sourceCitations: "array" }),
      monetizationAngle: "Pay-per-audit for content creators and SEO agencies protecting site authority against AI search engine hallucination penalties.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Parse input text, isolate factual assertions, query Google Search for verification context, run ADK-style critic/reviser loops, and return edited outputs with citations."
    },
    {
      actorName: "GuardPilot — Website AI Chatbot Security Auditor",
      slug: "website-chatbot-security-auditor",
      problemSolved: "Crawls public websites to detect AI chat widgets and audits them for prompt injection, instruction leakage, and agent security risks.",
      targetUsers: ["web design agencies", "security consultants", "business owners deploying chat widgets", "AI developers"],
      whyNotDuplicate: "Unlike broad security tools, this Actor specifically identifies AI chatbot widgets on websites and runs diagnostic safety testing payloads to check if they leak instructions or customer data.",
      inputSchemaDraft: baseInput("Website URLs to scan and test for AI chatbot vulnerabilities."),
      outputSchemaDraft: baseOutput({ chatbotSafetyScore: "number", vulnerabilitiesFound: "array", leakageRisks: "array" }),
      monetizationAngle: "Pay per audited website scan or CI/CD integration for teams deploying public widgets.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Developer tools",
      behavior: "Scan public websites for active chat widgets, attempt interaction simulations, and audit system prompt and data privacy boundary safety."
    },
    {
      actorName: "VoicePilot — Voice Search Readiness Auditor",
      slug: "voice-search-readiness-auditor",
      problemSolved: "Checks how well a business website is structured and optimized for conversational AI engines and voice assistants (Gemini, Siri, Alexa).",
      targetUsers: ["SEO agencies", "digital marketers", "local business consultants"],
      whyNotDuplicate: "Traditional SEO tools check standard keywords; this tool specifically evaluates Schema markup, natural language readability, mobile viewport compliance, and conversational response clarity.",
      inputSchemaDraft: baseInput("Website URLs to evaluate for voice search readiness."),
      outputSchemaDraft: baseOutput({ voiceReadinessScore: "number", structuredDataIssues: "array", conversationalReadiness: "string" }),
      monetizationAngle: "Pay per audit report for digital marketing agencies pitching voice optimization services.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Audit website text formatting, local schema markup, sentence structure complexity, and responsiveness to conversational queries."
    },
    {
      actorName: "LeadPilot — Google Maps Lead Quality Agent",
      slug: "google-maps-lead-quality-agent",
      problemSolved: "Turns Google Maps business websites and exported prospect lists into ranked local leads with contactability, conversion gaps, and pitch-ready outreach angles.",
      targetUsers: ["local lead sellers", "SEO agencies", "appointment setters", "web design agencies", "local growth consultants"],
      whyNotDuplicate: "It does not try to beat the incumbent Google Maps Scraper at raw extraction; it improves the money step after extraction by scoring which businesses are worth contacting and why.",
      inputSchemaDraft: baseInput("Business website URLs from Google Maps results, local prospect lists, or manual research."),
      outputSchemaDraft: baseOutput({ leadQualityScore: "number", outreachPriority: "high | medium | low", pitchAngles: "array", contactabilitySignals: "array" }),
      monetizationAngle: "Pay per qualified local lead audit for agencies that already buy or scrape Google Maps leads and need prioritization before outreach.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Audit public business websites for contactability, booking/quote readiness, trust proof, service visibility, social signals, and conversion gaps; return ranked outreach angles for local sales teams."
    },
    {
      actorName: "IntentPilot — B2B Buyer Intent Website Scanner",
      slug: "b2b-buyer-intent-website-scanner",
      problemSolved: "Scores company websites for buying intent, urgency signals, budget hints, growth triggers, and sales outreach angles.",
      targetUsers: ["B2B sales teams", "lead generation agencies", "RevOps teams", "founder-led outbound teams"],
      whyNotDuplicate: "Turns public website evidence into outreach priority and pitch angles instead of returning another generic contact list.",
      inputSchemaDraft: baseInput("Company website URLs to scan for buying-intent and outreach signals."),
      outputSchemaDraft: baseOutput({ buyerIntentScore: "number", urgencySignals: "array", outreachAngles: "array" }),
      monetizationAngle: "Pay per qualified website scan for teams that want ranked accounts before spending on outreach.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Inspect public company pages for hiring, pricing, technology, expansion, compliance, and conversion signals; return a sales-ready account brief."
    },
    {
      actorName: "MarginPilot — E-commerce Margin Leak Monitor",
      slug: "ecommerce-margin-leak-monitor",
      problemSolved: "Finds ecommerce pages where discounts, shipping promises, return policies, price-match copy, or stock messages may leak margin.",
      targetUsers: ["ecommerce operators", "marketplace agencies", "pricing teams", "DTC growth teams"],
      whyNotDuplicate: "Focuses on margin-risk decisions and monitoring rather than raw product extraction.",
      inputSchemaDraft: baseInput("Storefront, collection, or product page URLs to monitor for margin-impacting signals."),
      outputSchemaDraft: baseOutput({ marginLeakScore: "number", promoRisks: "array", monitoringTriggers: "array" }),
      monetizationAngle: "Recurring pay-per-page monitoring for brands and agencies protecting margin.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "E-commerce",
      behavior: "Fetch public ecommerce pages, detect promo and policy signals, and summarize margin risks with recommended follow-up checks."
    },
    {
      actorName: "FranchisePilot — Franchise Location Page Consistency Auditor",
      slug: "franchise-location-page-consistency-auditor",
      problemSolved: "Audits franchise and multi-location pages for missing phone numbers, booking CTAs, local offers, trust proof, hours, and service-area copy.",
      targetUsers: ["franchise marketers", "local SEO agencies", "multi-location operators", "web audit agencies"],
      whyNotDuplicate: "Targets consistency and revenue leakage across location pages, a workflow gap broad crawlers do not package for agencies.",
      inputSchemaDraft: baseInput("Franchise or multi-location landing page URLs to audit."),
      outputSchemaDraft: baseOutput({ consistencyScore: "number", missingLocationSignals: "array", remediationPriority: "string" }),
      monetizationAngle: "Pay per location-page audit for agencies and operators managing hundreds of pages.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Evaluate each location page for conversion, trust, contactability, and local SEO completeness; rank remediation priority."
    },
    {
      actorName: "AltPilot — SaaS Alternative Page Opportunity Finder",
      slug: "saas-alternative-page-opportunity-finder",
      problemSolved: "Finds competitor, alternative, comparison, and migration-page opportunities from SaaS websites and turns them into SEO briefs.",
      targetUsers: ["SaaS growth teams", "SEO agencies", "content marketers", "competitive intelligence teams"],
      whyNotDuplicate: "Packages comparison-page opportunity discovery and positioning gaps rather than generic website crawling.",
      inputSchemaDraft: baseInput("SaaS competitor or category website URLs to inspect for comparison and alternative-page opportunities."),
      outputSchemaDraft: baseOutput({ seoOpportunityScore: "number", comparisonAngles: "array", contentBrief: "string" }),
      monetizationAngle: "Pay per competitor audit or recurring monitoring for growth teams building high-intent SEO pages.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Analyze public SaaS pages for pricing, feature, integration, migration, and alternative positioning signals; produce SEO opportunity briefs."
    },
    {
      actorName: "RiskPilot — Vendor Risk Surface Auditor",
      slug: "vendor-risk-surface-auditor",
      problemSolved: "Checks public vendor websites for security, privacy, compliance, support, trust, and procurement-readiness signals.",
      targetUsers: ["procurement teams", "security reviewers", "B2B buyers", "vendor management consultants"],
      whyNotDuplicate: "Turns website evidence into a vendor-review checklist and risk brief instead of scraping unstructured pages.",
      inputSchemaDraft: baseInput("Vendor website URLs to audit before procurement or partnership review."),
      outputSchemaDraft: baseOutput({ vendorRiskScore: "number", trustSignals: "array", missingReviewSignals: "array" }),
      monetizationAngle: "Pay per vendor pre-screen for teams that need a quick first-pass procurement or security review.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Business intelligence",
      behavior: "Inspect public vendor pages for privacy, terms, security, support, compliance, trust, and contact signals; output a concise risk surface brief."
    },
    {
      actorName: "SitePilot — AI Website Sales Readiness Auditor",
      slug: "ai-website-sales-readiness-auditor",
      problemSolved: "Finds local business websites that lose customers because contact paths, CTAs, trust signals, or booking flows are weak.",
      targetUsers: ["SEO agencies", "web design agencies", "AI automation agencies", "lead sellers"],
      whyNotDuplicate: "Not a generic crawler; it returns conversion readiness scoring and agency pitch angles.",
      inputSchemaDraft: baseInput("Business website URLs to audit."),
      outputSchemaDraft: baseOutput({ salesReadinessScore: "number", leadOpportunityScore: "number" }),
      monetizationAngle: "Pay per audited website or per 1,000 websites for agency prospecting.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Lead generation",
      behavior: "Audit public websites for conversion assets, trust signals, technical basics, and missing revenue opportunities."
    },
    {
      actorName: "RevenuePilot — Local Business Missed Revenue Detector",
      slug: "local-business-missed-revenue-detector",
      problemSolved: "Identifies missing online booking, quote forms, online ordering, menus, review links, and lead capture.",
      targetUsers: ["local consultants", "restaurant marketers", "web designers", "cold email agencies"],
      whyNotDuplicate: "Focuses on missed revenue channels and outreach prioritization instead of raw contact scraping.",
      inputSchemaDraft: baseInput("Local business website URLs or public business pages."),
      outputSchemaDraft: baseOutput({ missedRevenueChannels: "array", opportunityScore: "number" }),
      monetizationAngle: "Lead sellers and agencies can pay for revenue-gap lists.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Scan pages for missing revenue paths and summarize the service pitch."
    },
    {
      actorName: "IntelPilot — Competitor Offer & Pricing Monitor",
      slug: "competitor-offer-change-monitor",
      problemSolved: "Tracks competitor website changes in pricing, promos, packages, service pages, menus, and calls to action.",
      targetUsers: ["sales teams", "local agencies", "revenue teams", "business owners"],
      whyNotDuplicate: "Differentiated by change intelligence and sales implications, not one-off scraping.",
      inputSchemaDraft: baseInput("Competitor website URLs to monitor."),
      outputSchemaDraft: baseOutput({ changesDetected: "array", salesImplications: "array" }),
      monetizationAngle: "Recurring monitoring for agencies and businesses.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Monitoring",
      behavior: "Fetch current page signals, compare with prior key-value store snapshots, and report meaningful offer changes."
    },
    {
      actorName: "PitchPilot — Agency Prospect Scorer & Outreach Agent",
      slug: "agency-prospect-qualification-scorer",
      problemSolved: "Ranks business website prospects by reachable contact data, CTA gaps, website weakness, and improvement potential.",
      targetUsers: ["SEO agencies", "web agencies", "AI agencies", "lead generation teams"],
      whyNotDuplicate: "Scores agency-fit and sales priority instead of returning generic lead records.",
      inputSchemaDraft: baseInput("Business website URLs to score for agency outreach."),
      outputSchemaDraft: baseOutput({ qualificationScore: "number", outreachPriority: "high | medium | low" }),
      monetizationAngle: "Agencies can pay to prioritize high-conversion outreach lists.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Extract weak signals, score agency fit, and generate pitch angles."
    },
    {
      actorName: "ServicePilot — Local Service Page Extractor & AI Brief Builder",
      slug: "local-service-page-extractor-ai-brief",
      problemSolved: "Extracts service pages and creates structured briefs about services offered, pricing visibility, CTAs, service areas, and content gaps.",
      targetUsers: ["content agencies", "SEO agencies", "web designers", "local service marketers"],
      whyNotDuplicate: "Turns service-page extraction into proposal-ready briefs and missing content opportunities.",
      inputSchemaDraft: baseInput("Local business websites whose service pages should be summarized."),
      outputSchemaDraft: baseOutput({ servicesFound: "array", contentGapBrief: "string" }),
      monetizationAngle: "Proposal prep and content planning at scale.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools",
      behavior: "Discover service pages, extract service claims, and produce structured briefs."
    },
    {
      actorName: "RepurposePilot — Social Content Repurpose Opportunity Auditor",
      slug: "social-content-repurpose-opportunity-auditor",
      problemSolved: "Audits public creator, brand, and campaign pages for posts that can be repurposed into emails, shorts, landing-page proof, and sales assets.",
      targetUsers: ["content agencies", "social media managers", "creator agencies", "DTC marketers"],
      whyNotDuplicate: "Popular social Actors extract posts; this ranks reuse opportunities and turns raw content into campaign actions.",
      inputSchemaDraft: baseInput("Public social, creator, blog, or campaign URLs to audit for repurposing potential."),
      outputSchemaDraft: baseOutput({ repurposeScore: "number", contentAngles: "array", recommendedChannels: "array" }),
      monetizationAngle: "Pay per content audit for agencies that need campaign ideas after collecting social data.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Social media / AI",
      behavior: "Scan public pages for topic, proof, CTA, and format signals; return ranked repurposing angles and channel recommendations."
    },
    {
      actorName: "HookPilot — Short Video Hook Intelligence Agent",
      slug: "short-video-hook-intelligence-agent",
      problemSolved: "Scores public video pages and captions for hook strength, CTA clarity, topic angle, and reuse potential for short-form campaigns.",
      targetUsers: ["short-form agencies", "creator marketers", "paid social teams", "brand content teams"],
      whyNotDuplicate: "It analyzes hook and campaign quality instead of competing with TikTok, Reel, or YouTube data extractors.",
      inputSchemaDraft: baseInput("Public video, post, transcript, or campaign URLs to score for hook quality."),
      outputSchemaDraft: baseOutput({ hookScore: "number", hookPatterns: "array", rewriteIdeas: "array" }),
      monetizationAngle: "Pay per video or campaign audit for agencies improving creative before ad spend.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Videos / Social media",
      behavior: "Inspect text, captions, titles, and page signals for hook, promise, audience, CTA, and proof; output creative improvement briefs."
    },
    {
      actorName: "SponsorPilot — Creator Sponsorship Fit Scorer",
      slug: "creator-sponsorship-fit-scorer",
      problemSolved: "Scores creator or influencer pages for brand safety, niche fit, sponsorship readiness, contactability, and likely campaign value.",
      targetUsers: ["influencer agencies", "affiliate managers", "DTC brands", "creator partnership teams"],
      whyNotDuplicate: "Social scrapers collect creator data; this turns public creator evidence into sponsorship qualification and outreach priority.",
      inputSchemaDraft: baseInput("Public creator websites, profiles, or media-kit URLs to evaluate."),
      outputSchemaDraft: baseOutput({ sponsorshipFitScore: "number", nicheSignals: "array", partnershipRisks: "array" }),
      monetizationAngle: "Pay per creator screening for brands building sponsorship lists.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation / Social media",
      behavior: "Audit public creator pages for niche, contact, audience, proof, brand-safety, and monetization signals; rank outreach priority."
    },
    {
      actorName: "BriefBuilderPilot — SERP Revenue Intent Brief Builder",
      slug: "serp-revenue-intent-brief-builder",
      problemSolved: "Turns search result URLs and ranking pages into revenue-intent briefs with buyer stage, offer gaps, CTA gaps, and content actions.",
      targetUsers: ["SEO agencies", "content marketers", "SaaS growth teams", "affiliate publishers"],
      whyNotDuplicate: "Search Actors return SERP data; this packages the commercial interpretation teams use to create or improve pages.",
      inputSchemaDraft: baseInput("SERP result pages, ranking URLs, or competitor pages to convert into revenue-intent briefs."),
      outputSchemaDraft: baseOutput({ revenueIntentScore: "number", buyerStage: "string", contentActions: "array" }),
      monetizationAngle: "Pay per SERP or ranking-page brief for content teams chasing high-intent keywords.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "SEO tools / AI",
      behavior: "Inspect ranking pages for commercial intent, offers, proof, pricing, CTAs, and comparison language; output action-ready briefs."
    },
    {
      actorName: "HiringPilot — B2B Hiring Signal Lead Qualifier",
      slug: "hiring-signal-lead-qualifier",
      problemSolved: "Ranks company and job pages by hiring urgency, department growth, vendor need, and outreach angles for B2B sales teams.",
      targetUsers: ["B2B sales teams", "recruiting agencies", "staffing agencies", "RevOps teams"],
      whyNotDuplicate: "Job scrapers extract listings; this translates hiring signals into vendor sales opportunities.",
      inputSchemaDraft: baseInput("Company career pages, job listing pages, or hiring-result URLs to qualify."),
      outputSchemaDraft: baseOutput({ hiringIntentScore: "number", departmentSignals: "array", vendorAngles: "array" }),
      monetizationAngle: "Pay per hiring-signal account brief for sales teams targeting growing companies.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Jobs / Lead generation",
      behavior: "Analyze public job and career pages for urgency, roles, departments, locations, tech needs, and outreach angles."
    },
    {
      actorName: "AdPilot — Paid Media Creative Creative Gap Analyzer",
      slug: "ad-creative-gap-analyzer",
      problemSolved: "Audits public ad landing pages and campaign pages for missing proof, weak offer clarity, poor CTA alignment, and creative testing gaps.",
      targetUsers: ["paid media agencies", "DTC brands", "growth marketers", "creative strategists"],
      whyNotDuplicate: "Ad-library scrapers collect ads; this focuses on landing-page and creative-gap diagnosis that improves spend efficiency.",
      inputSchemaDraft: baseInput("Ad landing pages, public campaign URLs, or creative reference pages to audit."),
      outputSchemaDraft: baseOutput({ creativeGapScore: "number", missingProof: "array", testIdeas: "array" }),
      monetizationAngle: "Pay per ad funnel audit for agencies and brands before scaling campaigns.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "E-commerce / Social media",
      behavior: "Check offer clarity, proof, objections, CTA alignment, page speed basics, and creative-message consistency; output test ideas."
    },
    {
      actorName: "Transcript Sales Insight Agent",
      slug: "transcript-sales-insight-agent",
      problemSolved: "Turns public video transcripts, webinar pages, or podcast pages into buyer pain points, objections, quotes, and sales content ideas.",
      targetUsers: ["sales enablement teams", "content agencies", "podcast marketers", "founder-led sales teams"],
      whyNotDuplicate: "Transcript Actors extract text; this packages the sales insights and reusable messaging that teams actually monetize.",
      inputSchemaDraft: baseInput("Public transcript, video, webinar, or podcast URLs to analyze for sales insights."),
      outputSchemaDraft: baseOutput({ insightScore: "number", buyerPains: "array", reusableMessages: "array" }),
      monetizationAngle: "Pay per transcript insight brief for agencies turning long-form content into sales assets.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Videos",
      behavior: "Extract page text and transcript-like content, detect pain points, objections, proof, offers, and reusable sales messages."
    },
    {
      actorName: "Website RAG Readiness Auditor",
      slug: "website-rag-readiness-auditor",
      problemSolved: "Audits websites for AI retrieval readiness by checking content structure, crawlability, answer density, policy pages, and source quality.",
      targetUsers: ["AI agencies", "RAG builders", "SaaS support teams", "developer tool teams"],
      whyNotDuplicate: "Website crawlers fetch text; this scores whether that text is actually ready for AI assistant and RAG use.",
      inputSchemaDraft: baseInput("Documentation, support, marketing, or knowledge-base URLs to audit for RAG readiness."),
      outputSchemaDraft: baseOutput({ ragReadinessScore: "number", retrievalRisks: "array", contentFixes: "array" }),
      monetizationAngle: "Pay per website audit for AI agencies selling RAG and support-bot implementations.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "AI / Developer tools",
      behavior: "Inspect public pages for content structure, source quality, headings, policy coverage, answer density, and retrieval risks."
    },
    {
      actorName: "Directory Lead Enrichment QA Agent",
      slug: "directory-lead-enrichment-qa-agent",
      problemSolved: "Checks exported directory or map leads for website quality, contactability, duplicate risk, and enrichment gaps before outreach.",
      targetUsers: ["lead sellers", "local agencies", "data brokers", "appointment setters"],
      whyNotDuplicate: "Raw lead extractors produce records; this quality-controls and prioritizes those records for outreach profitability.",
      inputSchemaDraft: baseInput("Business websites or directory lead URLs to validate and enrich."),
      outputSchemaDraft: baseOutput({ enrichmentQualityScore: "number", duplicateRiskSignals: "array", outreachReadiness: "string" }),
      monetizationAngle: "Pay per lead QA result for teams selling cleaner, higher-converting lead lists.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation / Automation",
      behavior: "Audit public lead URLs for contact, CTA, trust, duplicate, social, and enrichment signals; output QA status and outreach priority."
    },
    {
      actorName: "Review Funnel Trust Gap Auditor",
      slug: "review-funnel-trust-gap-auditor",
      problemSolved: "Audits websites for review capture paths, testimonial quality, trust proof placement, and missing reputation assets.",
      targetUsers: ["reputation agencies", "local SEO agencies", "franchise marketers", "web designers"],
      whyNotDuplicate: "Review scrapers gather review text; this diagnoses how businesses fail to convert reputation into leads.",
      inputSchemaDraft: baseInput("Business websites and landing pages to audit for trust and review-funnel gaps."),
      outputSchemaDraft: baseOutput({ trustGapScore: "number", reviewFunnelIssues: "array", trustFixes: "array" }),
      monetizationAngle: "Pay per reputation-conversion audit for agencies pitching review and trust improvements.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Reviews / Lead generation",
      behavior: "Scan public pages for testimonials, review links, badges, case studies, guarantees, and review CTAs; output trust gap fixes."
    },
    {
      actorName: "TrendPilot — TikTok Scraper & Creator Leads",
      slug: "trend-pilot-tiktok-scraper",
      problemSolved: "Extract TikTok videos, hashtags, profiles, comments, sounds, and search results with automated lead, viral, and brand fit scoring.",
      targetUsers: ["influencer agencies", "B2B brands", "creator marketers", "content strategists"],
      whyNotDuplicate: "Provides B2B outcomes such as creator lead qualification, virality analysis, brand fit scoring, and contact details with strict data accuracy and no competitor overlaps.",
      inputSchemaDraft: {},
      outputSchemaDraft: {},
      monetizationAngle: "Pay-per-event pricing on results for marketing and lead gen teams.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Lead generation",
      behavior: "Scrapes TikTok content and executes rich B2B analytical metrics on top of the raw data."
    }
  ];
}

export function overflowIdeas(): ActorIdea[] {
  return [
    {
      actorName: "RepPilot — Testimonial & Review Funnel Auditor",
      slug: "review-response-opportunity-finder",
      problemSolved: "Finds businesses with weak review-link visibility and missing reputation conversion assets.",
      targetUsers: ["reputation agencies", "local marketers"],
      whyNotDuplicate: "Focuses on website review conversion paths, not scraping review platforms.",
      inputSchemaDraft: baseInput("Business website URLs to inspect for review and testimonial paths."),
      outputSchemaDraft: baseOutput({ reviewPathScore: "number" }),
      monetizationAngle: "Reputation agencies use it to find pitch-ready accounts.",
      template: "ts-beeai-agent",
      difficulty: "low",
      expectedCategory: "Reviews",
      behavior: "Audit review links, testimonial pages, trust proof, and missing reputation CTAs."
    },
    {
      actorName: "Local Landing Page CTA Monitor",
      slug: "local-landing-page-cta-monitor",
      problemSolved: "Monitors local landing pages for CTA and offer changes.",
      targetUsers: ["agencies", "franchise marketers"],
      whyNotDuplicate: "Recurring CTA intelligence rather than generic page monitoring.",
      inputSchemaDraft: baseInput("Landing page URLs to monitor."),
      outputSchemaDraft: baseOutput({ ctaChanges: "array" }),
      monetizationAngle: "Recurring change monitoring.",
      template: "ts-beeai-agent",
      difficulty: "medium",
      expectedCategory: "Monitoring",
      behavior: "Snapshot CTA text and links, compare runs, and summarize changes."
    }
  ];
}
