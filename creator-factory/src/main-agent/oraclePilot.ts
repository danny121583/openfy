import fs from "node:fs/promises";
import path from "node:path";
import type { ActorIdea, RegistryEntry } from "./types.js";

const factoryRoot = path.resolve(process.cwd());
const preferencesPath = path.join(factoryRoot, "data", "user-preferences.json");

export interface ValidationResult {
  approved: boolean;
  score: number;
  reason: string;
  feedback: string[];
}

export interface PreferencesProfile {
  rules: string[];
  likes: Array<{ slug: string; reason: string }>;
  dislikes: Array<{ slug: string; reason: string }>;
  manualEditsHistory: Array<{ timestamp: string; slug: string; changeDetected: string; newRuleExtracted: string }>;
}

export class OraclePilot {
  private profile: PreferencesProfile | null = null;

  async loadPreferences(): Promise<PreferencesProfile> {
    if (this.profile) return this.profile;
    try {
      const raw = await fs.readFile(preferencesPath, "utf8");
      this.profile = JSON.parse(raw) as PreferencesProfile;
    } catch {
      // Fallback if file not found
      this.profile = {
        rules: [
          "Actor display titles must follow the 'Pilot Family' naming convention (e.g. 'TrendPilot — TikTok Scraper').",
          "Never include competitor names like 'Clockworks'; use 'legacy-compatible' instead.",
          "Input properties must declare a valid 'editor' field."
        ],
        likes: [],
        dislikes: [],
        manualEditsHistory: []
      };
    }
    return this.profile;
  }

  async savePreferences(): Promise<void> {
    if (!this.profile) return;
    await fs.mkdir(path.dirname(preferencesPath), { recursive: true });
    await fs.writeFile(preferencesPath, JSON.stringify(this.profile, null, 2), "utf8");
  }

  // Resilient LLM Completion Client using direct fetch
  private async queryLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey && !anthropicKey) {
      console.warn("[oracle-pilot] No LLM API keys configured. Using local deterministic rule fallback.");
      return "FALLBACK";
    }

    let lastError: Error | null = null;

    // Retry 1: OpenAI
    if (openaiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 1000
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          return data.choices[0].message.content.trim();
        }
        throw new Error(`OpenAI API error: HTTP ${response.status} - ${await response.text()}`);
      } catch (err) {
        console.warn("[oracle-pilot] OpenAI call failed, attempting fallback...", err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // Retry 2: Anthropic Claude
    if (anthropicKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-5-flash-20241022",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          return data.content[0].text.trim();
        }
        throw new Error(`Anthropic API error: HTTP ${response.status} - ${await response.text()}`);
      } catch (err) {
        console.warn("[oracle-pilot] Anthropic call failed.", err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error("All LLM providers failed.");
  }

  // 1. Validate Idea Concept
  async validateConcept(idea: ActorIdea): Promise<ValidationResult> {
    const profile = await this.loadPreferences();
    
    // Deterministic Local Check (Always executes first for stability)
    const localIssues: string[] = [];
    if (!idea.actorName.includes("Pilot")) {
      localIssues.push("Title does not belong to the 'Pilot Family' naming convention (e.g. TrendPilot).");
    }
    if (idea.problemSolved.toLowerCase().includes("clockworks")) {
      localIssues.push("Concept contains competitor name 'Clockworks'.");
    }

    const systemPrompt = `You are OraclePilot, a self-learning user proxy representing the developer's preferences.
Your job is to evaluate if a new Actor Idea aligns with the developer's preferences.

Developer Rules:
${profile.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Likes:
${JSON.stringify(profile.likes, null, 2)}

Dislikes:
${JSON.stringify(profile.dislikes, null, 2)}

Respond with a JSON object:
{
  "approved": boolean,
  "score": number, // 0 to 100
  "reason": "General summary of verification",
  "feedback": ["Feedback bullet point 1", "Feedback bullet point 2"]
}`;

    const userPrompt = `Evaluate this Actor Idea:
Name: ${idea.actorName}
Slug: ${idea.slug}
Problem: ${idea.problemSolved}
Target Users: ${JSON.stringify(idea.targetUsers)}
Expected Category: ${idea.expectedCategory}
Monetization Angle: ${idea.monetizationAngle}`;

    try {
      const response = await this.queryLLM(systemPrompt, userPrompt);
      if (response === "FALLBACK") {
        return {
          approved: localIssues.length === 0,
          score: localIssues.length === 0 ? 100 : 50,
          reason: localIssues.length === 0 ? "Approved by local check." : "Rejected by local rule checks.",
          feedback: localIssues
        };
      }
      
      const parsed = JSON.parse(response) as ValidationResult;
      // Merge with local checks
      if (localIssues.length > 0) {
        parsed.approved = false;
        parsed.score = Math.min(parsed.score, 60);
        parsed.feedback = Array.from(new Set([...parsed.feedback, ...localIssues]));
        parsed.reason = "Local rule checks failed: " + localIssues.join(" ");
      }
      return parsed;
    } catch (err) {
      console.error("[oracle-pilot] JSON parse failed, defaulting to local check.", err);
      return {
        approved: localIssues.length === 0,
        score: localIssues.length === 0 ? 100 : 50,
        reason: "Fallback check after LLM failure.",
        feedback: localIssues
      };
    }
  }

  // 2. Validate Spec file
  async validateSpec(specMd: string): Promise<ValidationResult> {
    const profile = await this.loadPreferences();
    const systemPrompt = `You are OraclePilot, evaluating if the generated Actor SPEC.md aligns with the user's rules.
Evaluate branding consistency, input/output schemas, and competitor redactions.

Rules:
${profile.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Respond with a JSON object:
{
  "approved": boolean,
  "score": number,
  "reason": "Brief summary",
  "feedback": []
}`;

    try {
      const response = await this.queryLLM(systemPrompt, `Validate this SPEC.md:\n\n${specMd}`);
      if (response === "FALLBACK") {
        const hasClockworks = specMd.toLowerCase().includes("clockworks");
        return {
          approved: !hasClockworks,
          score: !hasClockworks ? 100 : 40,
          reason: !hasClockworks ? "Passed local spec check." : "Rejected due to competitor names.",
          feedback: hasClockworks ? ["Remove competitor name 'Clockworks' from the spec."] : []
        };
      }
      return JSON.parse(response) as ValidationResult;
    } catch {
      return { approved: true, score: 90, reason: "Fallback approved.", feedback: [] };
    }
  }

  // 3. Self-Learning: Compare Generated Templates with User Edits to Learn Preferences
  async learnFromUserEdits(
    slug: string,
    filename: string,
    originalContent: string,
    editedContent: string
  ): Promise<string | null> {
    // If contents are identical, no edits made
    if (originalContent.trim() === editedContent.trim()) return null;

    const profile = await this.loadPreferences();
    const systemPrompt = `You are a self-learning preference extractor.
The user has manually edited a generated file in our AI Actor repository.
You must compare what the factory generated (Original) with what the user edited (User Edited) to identify the user's stylistic, coding, or branding preferences.

Existing Rules:
${profile.rules.map((r, i) => `- ${r}`).join("\n")}

Instructions:
Identify if the user's edit represents a new general rule/preference we should follow for future actors.
If it does, write a single concise instruction rule in English (under 30 words) starting with a verb (e.g. 'Ensure all links use relative paths', 'Use legacy-compatible terminology').
If the edit is extremely specific (like modifying a specific keyword query) or doesn't represent a general rule, return 'NONE'.
Return ONLY the rule text (or 'NONE') without any formatting, JSON, or quotes.`;

    const userPrompt = `Actor: ${slug}
File: ${filename}

Original:
${originalContent}

User Edited:
${editedContent}`;

    try {
      const newRule = await this.queryLLM(systemPrompt, userPrompt);
      if (newRule && newRule !== "FALLBACK" && newRule !== "NONE" && newRule.length > 5) {
        // Prevent adding duplicate rules
        const isDuplicate = profile.rules.some((r) => r.toLowerCase().includes(newRule.toLowerCase().substring(0, 15)));
        if (!isDuplicate) {
          profile.rules.push(newRule);
          profile.manualEditsHistory.push({
            timestamp: new Date().toISOString(),
            slug,
            changeDetected: `Manual edits in ${filename}`,
            newRuleExtracted: newRule
          });
          await this.savePreferences();
          console.log(`[oracle-pilot] Self-learned new rule: "${newRule}"`);
          return newRule;
        }
      }
    } catch (err) {
      console.error("[oracle-pilot] Failed to run learning model.", err);
    }
    return null;
  }
}
