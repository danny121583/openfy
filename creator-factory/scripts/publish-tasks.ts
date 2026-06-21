#!/usr/bin/env tsx
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const factoryRoot = path.resolve(__dirname, "..");
const registryPath = path.join(factoryRoot, "reports", "actor-registry.json");

// Command-line options
const args = process.argv.slice(2);
const targetSlug = args.find(a => a.startsWith("--slug="))?.split("=")[1];
const limit = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] || 50);
const clean = args.includes("--clean");

async function getApifyCredentials() {
  let token = process.env.APIFY_TOKEN || "";
  let uiToken = process.env.APIFY_UI_TOKEN || "";

  // Try loading from auth.json
  try {
    const authPath = path.join(process.env.HOME ?? "", ".apify", "auth.json");
    if (fsSync.existsSync(authPath)) {
      const auth = JSON.parse(await fs.readFile(authPath, "utf8"));
      if (!token) token = auth.token || auth.apifyToken || auth.apiToken || "";
    }
  } catch (err) {
    // ignore
  }

  // Load from local environment files if any exist
  const envPaths = [
    path.join(factoryRoot, ".env"),
    path.join(factoryRoot, "..", ".env")
  ];
  for (const envPath of envPaths) {
    if (fsSync.existsSync(envPath)) {
      try {
        const content = await fs.readFile(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const index = trimmed.indexOf("=");
            if (index > 0) {
              const key = trimmed.substring(0, index).trim();
              const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
              if (key === "APIFY_TOKEN" && !token) token = val;
              if (key === "APIFY_UI_TOKEN" && !uiToken) uiToken = val;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return { token, uiToken };
}

// Input generator
function generateInputsForActor(slug: string, count: number, inputSchema?: any): Array<{ name: string, title: string, description: string, input: any }> {
  const list: Array<{ name: string, title: string, description: string, input: any }> = [];
  const properties = inputSchema?.properties || {};
  
  const cities = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", 
    "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
    "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
    "Indianapolis", "San Francisco", "Seattle", "Denver", "Washington",
    "Boston", "El Paso", "Nashville", "Detroit", "Portland",
    "Las Vegas", "Oklahoma City", "Memphis", "Louisville", "Baltimore",
    "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento",
    "Mesa", "Kansas City", "Atlanta", "Omaha", "Colorado Springs",
    "Raleigh", "Long Beach", "Virginia Beach", "Miami", "Oakland",
    "Minneapolis", "Tulsa", "Bakersfield", "Tampa", "Wichita"
  ];
  
  const niches = [
    "Dentists", "Plumbers", "Roofers", "Chiropractors", "Gyms", 
    "Law Firms", "CPA Accountants", "Hair Salons", "HVAC Services", "Electricians",
    "Auto Repair", "Real Estate Agents", "Veterinarians", "Pet Groomers", "Physiotherapists",
    "Dermatologists", "Plastic Surgeons", "Optometrists", "Dry Cleaners", "House Cleaners",
    "Pest Control", "Locksmiths", "Towing Services", "Junk Removal", "Moving Companies",
    "Landscapers", "Tree Trimming", "Painters", "Flooring Contractors", "Carpenters"
  ];

  const saasTools = [
    "Salesforce", "HubSpot", "Slack", "Zoom", "Asana", "Trello", "Jira", "Mailchimp", 
    "Shopify", "Stripe", "Intercom", "Zendesk", "ClickUp", "Monday.com", "ActiveCampaign",
    "Notion", "Dropbox", "DocuSign", "Basecamp", "QuickBooks", "Freshworks", "Canva", 
    "Pipedrive", "Airtable", "Wrike", "Loom", "Miro", "Typeform", "SurveyMonkey", "Calendly",
    "Gong", "Outreach.io", "Apollo.io", "Cognism", "ZoomInfo", "Brex", "Deel", "Ramp",
    "Gusto", "Papaya Global", "BambooHR", "Rippling", "Zenefits", "Hopin", "Webex",
    "Microsoft Teams", "Google Workspace", "Figma", "Sketch", "InVision"
  ];

  const targetWebsites = [
    "https://github.com", "https://stackoverflow.com", "https://reddit.com", "https://medium.com",
    "https://techcrunch.com", "https://news.ycombinator.com", "https://producthunt.com", 
    "https://wikipedia.org", "https://nytimes.com", "https://forbes.com", "https://bloomberg.com",
    "https://wsj.com", "https://reuters.com", "https://cnn.com", "https://bbc.co.uk",
    "https://wired.com", "https://cnet.com", "https://verge.com", "https://engadget.com",
    "https://gizmodo.com", "https://mashable.com", "https://lifehacker.com", "https://businessinsider.com",
    "https://entrepreneur.com", "https://fastcompany.com", "https://inc.com", "https://hbr.org",
    "https://kickstarter.com", "https://indiegogo.com", "https://quora.com", "https://vimeo.com",
    "https://twitch.tv", "https://pinterest.com", "https://tumblr.com", "https://flickr.com",
    "https://deviantart.com", "https://behance.net", "https://dribbble.com", "https://unsplash.com",
    "https://pixabay.com", "https://pexels.com", "https://shutterstock.com", "https://gettyimages.com",
    "https://istockphoto.com", "https://adobe.com", "https://canva.com", "https://figma.com",
    "https://miro.com", "https://trello.com", "https://asana.com"
  ];

  for (let i = 0; i < count; i++) {
    let taskName = "";
    let taskTitle = "";
    let taskDesc = "";
    let taskInput: any = {};

    if (slug.includes("lead-quality") || slug.includes("google-maps") || properties.searchQuery) {
      const city = cities[i % cities.length];
      const niche = niches[Math.floor(i / cities.length) % niches.length];
      taskName = `${niche.toLowerCase().replace(/\s+/g, "-")}-in-${city.toLowerCase().replace(/\s+/g, "-")}`;
      taskTitle = `${niche} in ${city} Lead Audit`;
      taskDesc = `AI-powered lead quality scan and B2B outreach scoring for ${niche} located in ${city}.`;
      
      if (properties.searchQuery) {
        taskInput.searchQuery = `${niche} in ${city}`;
      }
      if (properties.startUrls) {
        taskInput.startUrls = [{ url: `https://www.google.com/maps/search/${encodeURIComponent(niche + ' in ' + city)}` }];
      }
      if (properties.maxItems) taskInput.maxItems = 50;
      if (properties.includeAiAnalysis) taskInput.includeAiAnalysis = true;
      if (properties.exportEmail) taskInput.exportEmail = "leadpilot-results@example.com";
      
    } else if (slug.includes("alternative") || slug.includes("alt-pilot") || properties.competitorName) {
      const tool = saasTools[i % saasTools.length];
      taskName = `${tool.toLowerCase().replace(/\s+/g, "-")}-alternatives`;
      taskTitle = `Best ${tool} Alternatives & Gaps`;
      taskDesc = `Audits competitor marketing and alternative pages for ${tool} to build SEO outlines.`;
      
      if (properties.competitorName) taskInput.competitorName = tool;
      if (properties.queries) {
        taskInput.queries = [`${tool} alternatives`, `best alternatives to ${tool}`, `migrate from ${tool} to`];
      }
      if (properties.maxSearchItems) taskInput.maxSearchItems = 10;
      if (properties.generateSeoBrief) taskInput.generateSeoBrief = true;
      if (properties.startUrls) {
        taskInput.startUrls = [{ url: `https://www.google.com/search?q=${encodeURIComponent(tool + ' alternatives')}` }];
      }

    } else if (slug.includes("competitor") || slug.includes("pricing") || slug.includes("intel-pilot")) {
      const site = targetWebsites[i % targetWebsites.length];
      const hostname = new URL(site).hostname;
      taskName = `monitor-${hostname.replace(/\./g, "-")}`;
      taskTitle = `Monitor Pricing for ${hostname}`;
      taskDesc = `Tracks pricing plans, packages, CTAs, and offer changes on ${hostname}.`;
      
      if (properties.startUrls) {
        taskInput.startUrls = [{ url: `${site}/pricing` }];
      }
      if (properties.targetUrl) {
        taskInput.targetUrl = `${site}/pricing`;
      }
      if (properties.selectors) taskInput.selectors = ["pricing", "price", "plan", "subscription"];
      if (properties.notificationEmail) taskInput.notificationEmail = "monitor-alerts@example.com";
      if (properties.frequencyHours) taskInput.frequencyHours = 24;
      if (properties.maxItems) taskInput.maxItems = 25;
      if (properties.includeAiAnalysis) taskInput.includeAiAnalysis = true;

    } else if (slug.includes("crawler-pilot") || slug.includes("web-crawler")) {
      const site = targetWebsites[i % targetWebsites.length];
      const hostname = new URL(site).hostname;
      taskName = `crawl-${hostname.replace(/\./g, "-")}`;
      taskTitle = `LLM Crawl of ${hostname}`;
      taskDesc = `Crawls and extracts clean Markdown formatting from ${hostname} optimized for LLM/RAG.`;
      
      if (properties.startUrls) {
        taskInput.startUrls = [{ url: site }];
      }
      if (properties.targetUrl) {
        taskInput.targetUrl = site;
      }
      if (properties.maxPages) taskInput.maxPages = 100;
      if (properties.outputFormat) taskInput.outputFormat = "markdown";
      if (properties.maxConcurrency) taskInput.maxConcurrency = 10;

    } else {
      const site = targetWebsites[i % targetWebsites.length];
      const hostname = new URL(site).hostname;
      taskName = `audit-${hostname.replace(/\./g, "-")}`;
      taskTitle = `AI Audit of ${hostname}`;
      taskDesc = `Runs automated B2B scans and heuristic analyses on ${hostname}.`;
      
      if (properties.startUrls) {
        taskInput.startUrls = [{ url: site }];
      }
      if (properties.targetUrl) {
        taskInput.targetUrl = site;
      }
      // Set default fallback if neither is found
      if (!properties.startUrls && !properties.targetUrl) {
        taskInput.targetUrl = site;
        taskInput.startUrls = [{ url: site }];
      }
      if (properties.maxPages) taskInput.maxPages = 10;
      if (properties.maxItems) taskInput.maxItems = 25;
      if (properties.includeAiScoring) taskInput.includeAiScoring = true;
      if (properties.includeAiAnalysis) taskInput.includeAiAnalysis = true;
      if (properties.industryHint) taskInput.industryHint = "";
    }

    // Handle other general/dynamic required schema properties
    if (properties.emails) {
      taskInput.emails = ["support@example.com", "info@example.com", "sales@example.com"];
    }

    // Clean task name for Apify slug rules (a-z, 0-9, hyphens, max 63 length)
    const cleanedTaskName = `${slug}-${taskName}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 63)
      .replace(/^-|-$/g, "");

    list.push({
      name: cleanedTaskName,
      title: taskTitle,
      description: taskDesc,
      input: taskInput
    });
  }

  return list;
}

async function fetchAllTasks(token: string): Promise<any[]> {
  let tasks: any[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    try {
      const res = await fetch(`https://api.apify.com/v2/actor-tasks?limit=${limit}&offset=${offset}`, {
        headers: { authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        break;
      }
      const body = await res.json() as any;
      const items = body.data?.items || [];
      tasks.push(...items);
      if (items.length < limit) {
        break;
      }
      offset += limit;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      break;
    }
  }
  return tasks;
}

async function main() {
  const { token, uiToken } = await getApifyCredentials();
  if (!token) {
    console.error("[ERROR] No Apify API token found. Configure APIFY_TOKEN or authenticate using apify login.");
    process.exit(1);
  }

  if (!fsSync.existsSync(registryPath)) {
    console.error(`[ERROR] Actor registry file not found at: ${registryPath}`);
    process.exit(1);
  }

  const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
  console.log(`Loaded ${registry.length} actors from registry.`);

  console.log("Fetching all existing tasks from Apify console...");
  const allTasks = await fetchAllTasks(token);
  console.log(`Fetched ${allTasks.length} total tasks from Apify account.`);

  for (const entry of registry) {
    const slug = entry.slug;
    if (targetSlug && slug !== targetSlug) {
      continue;
    }

    if (entry.status !== "pushed" && entry.status !== "published") {
      console.log(`Skipping ${slug} (status: ${entry.status})`);
      continue;
    }

    const actorId = entry.apifyActorUrl.match(/actors\/([A-Za-z0-9]+)/)?.[1];
    if (!actorId) {
      console.error(`Could not extract Actor ID for ${slug} from URL: ${entry.apifyActorUrl}`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Processing Actor: ${entry.actorName} (${slug})`);
    console.log(`Actor ID: ${actorId}`);
    console.log(`========================================`);

    // Fetch input schema to pass to generator
    const inputSchemaPath = path.join(factoryRoot, "generated-actors", slug, ".actor", "input_schema.json");
    let inputSchema: any = null;
    try {
      if (fsSync.existsSync(inputSchemaPath)) {
        inputSchema = JSON.parse(await fs.readFile(inputSchemaPath, "utf8"));
      }
    } catch (e: any) {
      console.warn(`Could not read input schema for ${slug}:`, e.message);
    }

    // Filter tasks belonging to this actor locally
    let existingTasks = allTasks.filter((t: any) => t.actId === actorId);
    console.log(`Found ${existingTasks.length} existing tasks on Apify console for ${slug}.`);

    if (clean && existingTasks.length > 0) {
      console.log(`Cleaning/deleting ${existingTasks.length} existing tasks...`);
      for (const t of existingTasks) {
        try {
          const delRes = await fetch(`https://api.apify.com/v2/actor-tasks/${t.id}`, {
            method: "DELETE",
            headers: { authorization: `Bearer ${token}` }
          });
          if (delRes.ok) console.log(`Deleted task: ${t.name}`);
        } catch (e: any) {
          console.error(`Failed to delete task ${t.name}:`, e.message);
        }
      }
      existingTasks = [];
    }

    const tasksToCreate = generateInputsForActor(slug, limit, inputSchema);

    console.log(`Generated ${tasksToCreate.length} diverse task configurations.`);

    const createdIds: string[] = [];

    for (const taskDef of tasksToCreate) {
      const exists = existingTasks.find(t => t.name === taskDef.name);
      let taskId = exists?.id;

      if (exists) {
        console.log(`Task ${taskDef.name} already exists. Updating settings...`);
        try {
          const updRes = await fetch(`https://api.apify.com/v2/actor-tasks/${taskId}`, {
            method: "PUT",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              input: taskDef.input,
              title: taskDef.title,
              description: taskDef.description
            })
          });
          if (updRes.ok) {
            console.log(`✔ Updated task successfully.`);
            createdIds.push(taskId);
          } else {
            console.error(`✘ Failed to update task: HTTP ${updRes.status}`);
          }
        } catch (err: any) {
          console.error(`Failed to update task ${taskDef.name}:`, err.message);
        }
      } else {
        console.log(`Creating task ${taskDef.name}...`);
        try {
          const creRes = await fetch(`https://api.apify.com/v2/actor-tasks`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              actId: actorId,
              name: taskDef.name,
              input: taskDef.input,
              title: taskDef.title,
              description: taskDef.description
            })
          });
          if (creRes.ok) {
            const creData = await creRes.json() as any;
            taskId = creData.data?.id;
            console.log(`✔ Created task successfully. ID: ${taskId}`);
            createdIds.push(taskId);
          } else {
            console.error(`✘ Failed to create task: HTTP ${creRes.status} - ${await creRes.text()}`);
          }
        } catch (err: any) {
          console.error(`Failed to create task ${taskDef.name}:`, err.message);
        }
      }

      // Automatically publish task if UI token is available
      if (taskId && uiToken) {
        console.log(`Publishing task ${taskDef.name} to Apify Store...`);
        try {
          const pubRes = await fetch(`https://console-backend.apify.com/actor-tasks/${taskId}/publish`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${uiToken}`,
              "content-type": "application/json"
            }
          });
          if (pubRes.ok) {
            console.log(`✔ Programmatically published task!`);
          } else {
            const errBody = await pubRes.json().catch(() => ({}));
            console.warn(`⚠ Publication response: HTTP ${pubRes.status} - ${errBody?.errorMessage || errBody?.error?.message || "Internal error"}`);
          }
        } catch (err: any) {
          console.error(`Failed to trigger publication:`, err.message);
        }
      }
    }

    console.log(`Successfully processed ${createdIds.length} tasks for ${slug}.`);
    if (!uiToken) {
      console.log(`\n[WARNING] APIFY_UI_TOKEN is not configured in environment or .env file.`);
      console.log(`Generated tasks have been created under your account but are currently PRIVATE.`);
      console.log(`To publish them to the Store / make them public:`);
      console.log(`1. Go to your Task in the Apify Console.`);
      console.log(`2. Click the 'Publication' tab.`);
      console.log(`3. Review and hit 'Publish task' manually.`);
      console.log(`Or set the APIFY_UI_TOKEN environment variable and run this script again.`);
    }
  }

  console.log("\nTask Generation & Publication Complete.");
}

main().catch(console.error);
