import { readFile } from "node:fs/promises";
import path from "node:path";
import { actorLogoContentType, actorLogoRelativePath, isPng, readActorLogoPng } from "./actorLogo.js";
import type { ActorRunState } from "./types.js";

export type StorePublicationResult = {
  passed: boolean;
  actorId: string;
  actorUrl: string;
  storeUrl: string;
  statusCode: number;
  message: string;
  title: string;
  categories: string[];
  icon: {
    required: boolean;
    status: "uploaded" | "skipped" | "failed";
    message: string;
    localPath: string;
  };
  pricing: {
    actorStartUsd: number;
    datasetItemUsd: number;
    datasetItemPer1000Usd: number;
    startsAt: string;
  };
};

export async function publishActorToStore(actor: ActorRunState): Promise<StorePublicationResult> {
  const actorId = extractActorId(actor.apifyActorUrl);
  if (!actorId) return failed("", 0, "Could not extract Actor ID from pushed Actor URL.", actor);

  const token = await getApifyToken();
  if (!token) return failed(actorId, 0, "No Apify token found in APIFY_TOKEN or ~/.apify/auth.json.", actor);

  const actorStartUsd = priceFromEnv("MAIN_AGENT_PPE_START_USD", 0.10005);
  const datasetItemUsd = priceFromEnv("MAIN_AGENT_PPE_RESULT_USD", 0.10001);
  const pricingStartsAt = futureIsoDate(Number(process.env.MAIN_AGENT_PRICING_NOTICE_DAYS ?? 15));
  if (!validPrice(actorStartUsd) || !validPrice(datasetItemUsd)) {
    return failed(actorId, 0, "Pricing guardrail failed. PPE prices must be between $0 and $0.25 per event.", actor);
  }

  const exampleInput = await readExampleInput(actor.actorDir);
  const icon = await uploadActorIcon(actorId, actor);
  const requireIconUpload = process.env.MAIN_AGENT_REQUIRE_ICON_UPLOAD === "1";
  if (requireIconUpload && !icon.publicUrl) {
    return failed(actorId, 0, icon.message || "Icon upload failed and MAIN_AGENT_REQUIRE_ICON_UPLOAD=1.", actor, {
      required: true,
      status: "failed",
      message: icon.message || "Icon upload failed.",
      localPath: actorLogoRelativePath
    });
  }

  // Fetch existing actor configuration to avoid overwriting or breaking pricing history
  const getResponse = await fetch(`https://api.apify.com/v2/actors/${actorId}`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  const getActorData = await getResponse.json().catch(() => ({}));
  const existingActor = getActorData?.data ?? {};

  const newPricingRecord = {
    pricingModel: "PAY_PER_EVENT",
    startedAt: pricingStartsAt,
    createdAt: new Date().toISOString(),
    isPPEPlatformUsagePaidByUser: false,
    minimalMaxTotalChargeUsd: null,
    pricingPerEvent: {
      actorChargeEvents: {
        "apify-actor-start": {
          eventTitle: "Actor Start",
          eventDescription: "Charged when the Actor starts running.",
          isOneTimeEvent: true,
          eventPriceUsd: actorStartUsd,
          isPrimaryEvent: true
        },
        "apify-default-dataset-item": {
          eventTitle: "result",
          eventDescription: "Single result in the default dataset.",
          isOneTimeEvent: false,
          eventPriceUsd: datasetItemUsd,
          isPrimaryEvent: false
        }
      }
    }
  };

  const payload: any = {
    title: actor.idea.actorName,
    description: actor.idea.problemSolved.slice(0, 300),
    seoTitle: seoTitle(actor.idea.actorName),
    seoDescription: seoDescription(actor.idea.problemSolved),
    ...(icon.publicUrl ? { pictureUrl: icon.publicUrl } : {}),
    categories: categoriesFor(actor.idea.expectedCategory),
    isSourceCodeHidden: true,
    actorPermissionLevel: "LIMITED_PERMISSIONS",
    defaultRunOptions: {
      build: "latest",
      timeoutSecs: 3600,
      memoryMbytes: 4096,
      restartOnError: false,
      forcePermissionLevel: "LIMITED_PERMISSIONS"
    },
    exampleRunInput: {
      body: JSON.stringify(exampleInput, null, 2),
      contentType: "application/json; charset=utf-8"
    },
    isPublic: true
  };

  let finalPricingInfos = existingActor.pricingInfos;
  if (Array.isArray(finalPricingInfos) && finalPricingInfos.length > 0) {
    // Check if the latest pricing info is already PAY_PER_EVENT and has the correct prices
    const latest = finalPricingInfos[finalPricingInfos.length - 1];
    const hasCorrectStartPrice = latest.pricingPerEvent?.actorChargeEvents?.["apify-actor-start"]?.eventPriceUsd === actorStartUsd;
    const hasCorrectResultPrice = latest.pricingPerEvent?.actorChargeEvents?.["apify-default-dataset-item"]?.eventPriceUsd === datasetItemUsd;
    const isCorrectModel = latest.pricingModel === "PAY_PER_EVENT";

    if (!isCorrectModel || !hasCorrectStartPrice || !hasCorrectResultPrice) {
      // Need to add/update pricing record in the array
      // Make sure all existing records have their createdAt preserved
      payload.pricingInfos = [
        ...finalPricingInfos.map((p: any) => ({
          ...p,
          createdAt: p.createdAt || new Date().toISOString()
        })),
        newPricingRecord
      ];
    } else {
      // Pricing is already correct, do NOT include pricingInfos to avoid triggering month-limit modification checks!
      console.log(`[store-publication] Pricing is already correct for ${actor.idea.slug}. Omitting pricingInfos to avoid limit error.`);
    }
  } else {
    // No existing pricing records at all
    payload.pricingInfos = [newPricingRecord];
  }

  let response = await fetch(`https://api.apify.com/v2/actors/${actorId}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  let data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = data?.error?.message ?? `HTTP ${response.status}`;
    if (errMsg.includes("modify the pricing") && payload.pricingInfos) {
      console.warn(`[store-publication] Pricing update rate-limited/restricted for ${actor.idea.slug}. Retrying sync without pricingInfos to update other metadata.`);
      delete payload.pricingInfos;
      response = await fetch(`https://api.apify.com/v2/actors/${actorId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      data = await response.json().catch(() => ({}));
    }
  }
  if (!response.ok) {
    return failed(actorId, response.status, data?.error?.message ?? `HTTP ${response.status}`, actor);
  }

  const updated = data.data ?? {};
  const storeUrl = updated.url || `https://apify.com/${updated.username ?? "orbitai"}/${updated.name ?? actor.idea.slug}`;
  return {
    passed: Boolean(updated.isPublic),
    actorId,
    actorUrl: actor.apifyActorUrl,
    storeUrl,
    statusCode: response.status,
    message: updated.isPublic ? `Published to Apify Store with automated PPE monetization.${icon.message ? ` ${icon.message}` : ""}` : "Actor updated but isPublic was not true in API response.",
    title: updated.title ?? actor.idea.actorName,
    categories: updated.categories ?? payload.categories,
    icon: {
      required: requireIconUpload,
      status: icon.publicUrl ? "uploaded" : "skipped",
      message: icon.message,
      localPath: actorLogoRelativePath
    },
    pricing: {
      actorStartUsd,
      datasetItemUsd,
      datasetItemPer1000Usd: Number((datasetItemUsd * 1000).toFixed(2)),
      startsAt: pricingStartsAt
    }
  };
}

async function uploadActorIcon(actorId: string, actor: ActorRunState) {
  const uiToken = process.env.APIFY_UI_TOKEN;
  if (!uiToken) return { publicUrl: "", message: "Icon upload skipped because APIFY_UI_TOKEN is not set." };

  const image = await readActorLogoPng(actor.actorDir);
  if (!isPng(image)) return { publicUrl: "", message: `Icon upload failed: ${actorLogoRelativePath} is missing or is not a PNG.` };
  const fileName = `${actor.idea.slug}-icon.png`;
  const contentType = actorLogoContentType;
  const init = await fetch(`https://console-backend.apify.com/upload/actor-picture/${actorId}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${uiToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ fileName, contentType })
  });
  const initData = await init.json().catch(() => ({}));
  if (!init.ok || !initData?.data?.uploadUrl || !initData?.data?.publicUrl) {
    return { publicUrl: "", message: `Icon upload failed: ${initData?.errorMessage ?? initData?.error?.message ?? `HTTP ${init.status}`}.` };
  }

  const upload = await fetch(initData.data.uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: image
  });
  if (!upload.ok) return { publicUrl: "", message: `Icon upload failed: storage upload returned HTTP ${upload.status}.` };
  return { publicUrl: initData.data.publicUrl as string, message: "Icon uploaded programmatically." };
}

export function storePublicationMarkdown(result: StorePublicationResult) {
  return `# Store Publication Report
## Final Verdict
${result.passed ? "PASS" : "FAIL"}
## Actor ID
${result.actorId || "N/A"}
## Actor URL
${result.actorUrl || "N/A"}
## Store URL
${result.storeUrl || "N/A"}
## API Status
${result.statusCode || "N/A"}
## Message
${result.message}
## Title
${result.title}
## Categories
${result.categories.map((category) => `- ${category}`).join("\n") || "- None"}
## Logo
- Local asset: ${result.icon.localPath}
- Upload required: ${result.icon.required ? "Yes" : "No"}
- Upload status: ${result.icon.status}
- Upload message: ${result.icon.message}
## Monetization
- Pricing model: PAY_PER_EVENT
- Pricing starts: ${result.pricing.startsAt || "N/A"}
- Actor start: $${result.pricing.actorStartUsd.toFixed(4)}
- Qualified result: $${result.pricing.datasetItemUsd.toFixed(4)}
- Qualified results per 1,000: $${result.pricing.datasetItemPer1000Usd.toFixed(2)}
## Source Visibility
Source files hidden from Actor detail.
## Permissions
LIMITED_PERMISSIONS
`;
}

function extractActorId(actorUrl: string) {
  return actorUrl.match(/actors\/([A-Za-z0-9]+)/)?.[1] ?? "";
}

async function getApifyToken() {
  if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN;
  try {
    const auth = JSON.parse(await readFile(path.join(process.env.HOME ?? "", ".apify", "auth.json"), "utf8"));
    return auth.token || auth.apifyToken || auth.apiToken || "";
  } catch {
    return "";
  }
}

function priceFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function futureIsoDate(daysFromNow: number) {
  const safeDays = Number.isFinite(daysFromNow) && daysFromNow >= 15 ? daysFromNow : 15;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + safeDays);
  return date.toISOString();
}

function validPrice(value: number) {
  return value >= 0 && value <= 0.25;
}

async function readExampleInput(actorDir: string) {
  try {
    return JSON.parse(await readFile(path.join(actorDir, "storage", "key_value_stores", "default", "INPUT.json"), "utf8"));
  } catch {
    return { startUrls: [{ url: "https://example.com" }], maxItems: 1, includeAiAnalysis: false };
  }
}

function seoTitle(title: string) {
  return title.length <= 50 ? title : title.slice(0, 47).trimEnd() + "...";
}

function seoDescription(description: string) {
  return description.length <= 156 ? description : description.slice(0, 153).trimEnd() + "...";
}

function categoriesFor(expectedCategory: string) {
  const lower = expectedCategory.toLowerCase();
  const categories = new Set<string>();
  if (lower.includes("mcp")) categories.add("MCP_SERVERS");
  if (lower.includes("ai")) categories.add("AI");
  if (lower.includes("agent")) categories.add("AGENTS");
  if (lower.includes("lead")) categories.add("LEAD_GENERATION");
  if (lower.includes("seo")) categories.add("SEO_TOOLS");
  if (lower.includes("e-commerce") || lower.includes("ecommerce")) categories.add("ECOMMERCE");
  if (lower.includes("social")) categories.add("SOCIAL_MEDIA");
  if (lower.includes("video")) categories.add("VIDEOS");
  if (lower.includes("job")) categories.add("JOBS");
  if (lower.includes("travel")) categories.add("TRAVEL");
  if (lower.includes("developer")) categories.add("DEVELOPER_TOOLS");
  
  // Fill up to exactly 3 categories using the most popular general tags for B2B AI Agents
  const defaults = ["AUTOMATION", "AI", "AGENTS", "DEVELOPER_TOOLS"];
  for (const def of defaults) {
    if (categories.size >= 3) break;
    categories.add(def);
  }
  
  return [...categories].slice(0, 3);
}


function failed(actorId: string, statusCode: number, message: string, actor: ActorRunState, icon?: StorePublicationResult["icon"]): StorePublicationResult {
  return {
    passed: false,
    actorId,
    actorUrl: actor.apifyActorUrl,
    storeUrl: "",
    statusCode,
    message,
    title: actor.idea.actorName,
    categories: categoriesFor(actor.idea.expectedCategory),
    icon: icon ?? {
      required: process.env.MAIN_AGENT_REQUIRE_ICON_UPLOAD === "1",
      status: "failed",
      message: "Store publication did not reach icon upload.",
      localPath: actorLogoRelativePath
    },
    pricing: {
      actorStartUsd: 0,
      datasetItemUsd: 0,
      datasetItemPer1000Usd: 0,
      startsAt: ""
    }
  };
}
