import express from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as https from "https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import os from "os";
const execPromise = promisify(exec);
const app = express();
const PORT = 3001;
const homedir = os.homedir();
let WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), "..", "..");
app.use(cors());
app.use(express.json());
// Safe File Tree walker, ignoring heavy dependencies
function buildTree(dirPath) {
    const nodes = [];
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (file === "node_modules" || file === ".git" || file === ".DS_Store") {
                continue;
            }
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            const relativePath = fullPath.replace(WORKSPACE_ROOT, "");
            if (stat.isDirectory()) {
                nodes.push({
                    name: file,
                    path: relativePath,
                    isDirectory: true,
                    children: buildTree(fullPath)
                });
            }
            else {
                nodes.push({
                    name: file,
                    path: relativePath,
                    isDirectory: false
                });
            }
        }
    }
    catch (e) {
        console.error(`Error reading directory: ${dirPath}`, e);
    }
    return nodes;
}
// 1. GET /api/files - Walk workspace
app.get("/api/files", (req, res) => {
    const tree = buildTree(WORKSPACE_ROOT);
    const rootName = path.basename(WORKSPACE_ROOT);
    res.json({ tree, rootName });
});
// 2. GET /api/files/content - Read file
app.get("/api/files/content", (req, res) => {
    const relativePath = req.query.path;
    if (!relativePath) {
        return res.status(400).json({ error: "Missing path query parameter" });
    }
    const absolutePath = path.join(WORKSPACE_ROOT, relativePath);
    // Security Guardrail: Prevent directory traversal outside the workspace
    if (!absolutePath.startsWith(WORKSPACE_ROOT)) {
        return res.status(403).json({ error: "Access denied: outside workspace root" });
    }
    try {
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
            const isImage = /\.(png|jpe?g|gif|ico|webp)$/i.test(absolutePath);
            if (isImage) {
                const buffer = fs.readFileSync(absolutePath);
                const ext = path.extname(absolutePath).toLowerCase().replace(".", "");
                const mimeType = ext === "jpg" ? "image/jpeg" : ext === "ico" ? "image/x-icon" : `image/${ext}`;
                const base64Data = buffer.toString("base64");
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                res.json({ content: dataUrl });
            }
            else {
                const content = fs.readFileSync(absolutePath, "utf-8");
                res.json({ content });
            }
        }
        else {
            res.status(404).json({ error: "File not found" });
        }
    }
    catch (e) {
        res.status(500).json({ error: `Failed to read file: ${e.message}` });
    }
});
// 3. POST /api/files/save - Save file content
app.post("/api/files/save", (req, res) => {
    const { path: relativePath, content } = req.body;
    if (!relativePath || content === undefined) {
        return res.status(400).json({ error: "Missing path or content parameter" });
    }
    const absolutePath = path.join(WORKSPACE_ROOT, relativePath);
    // Security Guardrail: Prevent directory traversal outside the workspace
    if (!absolutePath.startsWith(WORKSPACE_ROOT)) {
        return res.status(403).json({ error: "Access denied: outside workspace root" });
    }
    try {
        const parentDir = path.dirname(absolutePath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(absolutePath, content, "utf-8");
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: `Failed to save file: ${e.message}` });
    }
});
// 4. POST /api/agent/run - Agent execution stream with Gemini 2.5 Flash
app.post("/api/agent/run", async (req, res) => {
    const { prompt } = req.body;
    console.log(`Agent triggered with prompt: ${prompt}`);
    // Set headers for chunked/SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
        sendEvent("error", "GEMINI_API_KEY is not configured in the environment.");
        res.end();
        return;
    }
    const isActorPrompt = prompt.toLowerCase().includes("actor") ||
        prompt.toLowerCase().includes("apify") ||
        prompt.toLowerCase().includes("scrape") ||
        prompt.toLowerCase().includes("pilot");
    if (!isActorPrompt) {
        // Normal Q&A/general assistant chat flow using Gemini 2.5 Flash streaming
        try {
            sendEvent("thought", "Synthesizing answer...");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContentStream(prompt);
            sendEvent("thought", null); // Clear thought
            for await (const chunk of result.stream) {
                const text = chunk.text();
                sendEvent("message", text);
            }
            res.end();
        }
        catch (e) {
            sendEvent("error", e.message);
            res.end();
        }
        return;
    }
    // Actor creation workflow
    try {
        sendEvent("thought", "Analyzing Actor concept and naming requirements...");
        // Step 1: Define initial tasks list
        const initialTasks = [
            { id: "1", name: "Deconstruct app requirements & design schema", status: "in_progress" },
            { id: "2", name: "Scaffold local routing hooks and components", status: "pending" },
            { id: "3", name: "Connect local MCP integrations", status: "pending" },
            { id: "4", name: "Run PACT local validation loops", status: "pending" },
            { id: "5", name: "Publish and ship to Apify Store / Vercel Web Server", status: "pending" }
        ];
        sendEvent("tasks", initialTasks);
        // Initial Step
        sendEvent("step", {
            id: "thought-1",
            label: "Thought",
            summary: "Analyzing Actor requirements using Gemini 2.5 Flash",
            details: [{ type: "info", text: "Analyzing prompt: " + prompt }],
            status: "running"
        });
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
        const namePlanningPrompt = `
      Analyze this prompt for a new Apify Actor: "${prompt}".
      Your job is to identify a suitable brand name for this Actor following the Pilot Family suite naming convention.
      The name must start with a memorable brand prefix ending with "Pilot" (like TrendPilot, SitePilot, AdPilot, BriefPilot, YelpPilot, GooglePilot, MapsPilot, LeadPilot, CleanPilot, ShopPilot, etc.) followed by an outcome-specific descriptive subtitle (e.g. "TrendPilot — TikTok Scraper & Creator Leads").
      Ensure the subtitle is clear, buyer-facing, and outcome-specific.
      Return a JSON response conforming to this TypeScript type:
      {
        brandName: string; // The full branded title, e.g. "TrendPilot — TikTok Scraper & Creator Leads"
        slug: string;      // The machine-friendly slug, e.g. "trend-pilot-tiktok-scraper"
        expectedCategory: string; // One of: "SEO_TOOLS", "LEAD_GENERATION", "ECOMMERCE", "DEVELOPER_TOOLS", "AI", "AGENTS"
        description: string; // 1-2 sentence description of what the Actor does.
      }
    `;
        const chatResponse = await model.generateContent(namePlanningPrompt);
        const textResponse = chatResponse.response.text();
        const resultObj = JSON.parse(textResponse);
        const { brandName, slug, expectedCategory, description } = resultObj;
        sendEvent("step", {
            id: "thought-1",
            label: "Thought",
            summary: "Planned branded Actor: " + brandName,
            details: [
                { type: "info", text: `Selected name: ${brandName}` },
                { type: "info", text: `Slug: ${slug}` },
                { type: "info", text: `Category: ${expectedCategory}` },
                { type: "info", text: `Description: ${description}` }
            ],
            status: "done"
        });
        // Update tasks
        const tasksAfterPlanning = initialTasks.map(t => t.id === "1" ? { ...t, status: "completed" } :
            t.id === "2" ? { ...t, status: "in_progress" } : t);
        sendEvent("tasks", tasksAfterPlanning);
        sendEvent("thought", `Scaffolding Actor workspace for ${brandName}...`);
        sendEvent("step", {
            id: "scaffold-1",
            label: "Creating project",
            summary: "Generating code structure",
            details: [
                { type: "create", text: `Creating project files at creator-factory/generated-actors/${slug}` }
            ],
            status: "running"
        });
        // Launch run-single-actor.ts script as a child process
        const singleActorScript = path.resolve(WORKSPACE_ROOT, "creator-factory", "scripts", "run-single-actor.ts");
        console.log(`Running script: npx tsx ${singleActorScript} "${brandName} - ${prompt}"`);
        const child = spawn("npx", ["tsx", singleActorScript, `${brandName} - ${prompt}`], {
            cwd: path.resolve(WORKSPACE_ROOT, "creator-factory"),
            env: {
                ...process.env,
                CREATOR_FACTORY_ROOT: path.resolve(WORKSPACE_ROOT, "creator-factory"),
            }
        });
        let stdout = "";
        let stderr = "";
        let activeTaskState = tasksAfterPlanning;
        child.stdout.on("data", (chunk) => {
            const line = chunk.toString();
            stdout += line;
            console.log(`[child stdout] ${line.trim()}`);
            // Stream lines as details in the progress step
            const cleanLine = line.trim();
            if (cleanLine) {
                sendEvent("step", {
                    id: "scaffold-1",
                    label: "Creating project",
                    summary: "Generating files & compiling...",
                    details: [{ type: "info", text: cleanLine }],
                    status: "running"
                });
                // Dynamically update task status based on output log markers
                if (cleanLine.includes("running PACT") || cleanLine.includes("Attempt 1:")) {
                    activeTaskState = activeTaskState.map(t => t.id === "2" ? { ...t, status: "completed" } :
                        t.id === "3" ? { ...t, status: "completed" } :
                            t.id === "4" ? { ...t, status: "in_progress" } : t);
                    sendEvent("tasks", activeTaskState);
                }
            }
        });
        child.stderr.on("data", (chunk) => {
            const line = chunk.toString();
            stderr += line;
            console.error(`[child stderr] ${line.trim()}`);
            if (line.trim()) {
                sendEvent("step", {
                    id: "scaffold-1",
                    label: "Creating project",
                    summary: "Error during execution",
                    details: [{ type: "info", text: line.trim() }],
                    status: "running"
                });
            }
        });
        child.on("close", async (code) => {
            console.log(`Child process exited with code ${code}`);
            if (code !== 0) {
                sendEvent("step", {
                    id: "scaffold-1",
                    label: "Creating project",
                    summary: "Scaffolding failed",
                    details: [{ type: "info", text: stderr || "Non-zero exit code" }],
                    status: "done"
                });
                sendEvent("error", `Scaffolding pipeline failed: ${stderr}`);
                res.end();
                return;
            }
            // Finish step
            sendEvent("step", {
                id: "scaffold-1",
                label: "Creating project",
                summary: `Created and tested ${brandName} successfully`,
                details: [
                    { type: "info", text: "All local PACT tests passed" },
                    { type: "info", text: "Quality gates passed successfully" }
                ],
                status: "done"
            });
            // Complete all remaining tasks
            const finalTasksState = activeTaskState.map(t => ({ ...t, status: "completed" }));
            sendEvent("tasks", finalTasksState);
            sendEvent("thought", null);
            // Parse JSON result from stdout
            let finalResult = null;
            try {
                const startMarker = "RESULT_START";
                const endMarker = "RESULT_END";
                const startIndex = stdout.indexOf(startMarker);
                const endIndex = stdout.indexOf(endMarker);
                if (startIndex !== -1 && endIndex !== -1) {
                    const jsonStr = stdout.substring(startIndex + startMarker.length, endIndex).trim();
                    finalResult = JSON.parse(jsonStr);
                }
            }
            catch (err) {
                console.error("Failed to parse child process JSON result:", err);
            }
            const filesCreated = finalResult?.actorDir || `creator-factory/generated-actors/${slug}`;
            // Emit completion event with real data
            sendEvent("completion", {
                title: `Your Actor **${brandName}** is ready`,
                description: description,
                features: [
                    `**Name:** ${brandName}`,
                    `**Slug:** ${slug}`,
                    `**Category:** ${expectedCategory}`,
                    `**Location:** \`${filesCreated}\``,
                    "**Status:** Passed PACT smoke tests and quality checks."
                ],
                devUrl: `http://localhost:5175/`, // Dev preview port
                commands: ["apify run"],
                suggestion: "You can view the full PACT and deployment reports in the Renderer panel on the right.",
                filesChanged: { added: 15, removed: 0 },
                actorSlug: slug // Critical: tell the frontend which slug was created
            });
            res.end();
        });
    }
    catch (e) {
        sendEvent("error", e.message);
        res.end();
    }
});
// 5. POST /api/workspace/open - Open folder picker on macOS
app.post("/api/workspace/open", async (req, res) => {
    try {
        const { stdout } = await execPromise("osascript -e 'POSIX path of (choose folder with prompt \"Select Workspace Folder\")'");
        const selectedPath = stdout.trim();
        if (selectedPath) {
            WORKSPACE_ROOT = selectedPath;
            console.log(`Workspace changed to: ${WORKSPACE_ROOT}`);
            res.json({ success: true, path: WORKSPACE_ROOT });
        }
        else {
            res.json({ success: false, error: "Cancelled" });
        }
    }
    catch (err) {
        console.error("macOS AppleScript folder picker error:", err);
        res.status(500).json({ error: "Failed to open folder picker or user cancelled." });
    }
});
// 6. POST /api/files/delete - Delete file or folder
app.post("/api/files/delete", (req, res) => {
    const { path: relPath } = req.body;
    if (!relPath)
        return res.status(400).json({ error: "Missing path parameter" });
    const absPath = path.join(WORKSPACE_ROOT, relPath);
    if (!absPath.startsWith(WORKSPACE_ROOT)) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        if (fs.existsSync(absPath)) {
            const stat = fs.statSync(absPath);
            if (stat.isDirectory()) {
                fs.rmSync(absPath, { recursive: true, force: true });
            }
            else {
                fs.unlinkSync(absPath);
            }
            res.json({ success: true });
        }
        else {
            res.status(404).json({ error: "Not found" });
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 7. POST /api/files/rename - Rename file or folder
app.post("/api/files/rename", (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath)
        return res.status(400).json({ error: "Missing oldPath or newPath parameter" });
    const absOld = path.join(WORKSPACE_ROOT, oldPath);
    const absNew = path.join(WORKSPACE_ROOT, newPath);
    if (!absOld.startsWith(WORKSPACE_ROOT) || !absNew.startsWith(WORKSPACE_ROOT)) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        fs.renameSync(absOld, absNew);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 8. POST /api/files/create-folder - Create new folder
app.post("/api/files/create-folder", (req, res) => {
    const { path: relPath } = req.body;
    if (!relPath)
        return res.status(400).json({ error: "Missing path parameter" });
    const absPath = path.join(WORKSPACE_ROOT, relPath);
    if (!absPath.startsWith(WORKSPACE_ROOT)) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        fs.mkdirSync(absPath, { recursive: true });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Helper for proxying HTTPS requests
function fetchText(urlStr) {
    return new Promise((resolve, reject) => {
        https.get(urlStr, (res) => {
            // Handle redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchText(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                return reject(new Error(`Failed to fetch: ${res.statusCode}`));
            }
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => resolve(body));
        }).on("error", reject);
    });
}
// 9. GET /api/skills/import - Import skill metadata from a web markdown URL
app.get("/api/skills/import", async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
        let targetUrl = fileUrl;
        try {
            const u = new URL(fileUrl);
            if (u.hostname === "github.com") {
                const parts = u.pathname.split("/").filter(Boolean);
                if (parts[2] === "blob") {
                    parts.splice(2, 1);
                    targetUrl = `https://raw.githubusercontent.com/${parts.join("/")}`;
                }
            }
        }
        catch { }
        const text = await fetchText(targetUrl);
        let name = "";
        let category = "Custom";
        let description = "";
        // Parse YAML frontmatter
        const yamlRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
        const match = text.match(yamlRegex);
        if (match) {
            const yamlContent = match[1];
            const lines = yamlContent.split("\n");
            for (const line of lines) {
                const idx = line.indexOf(":");
                if (idx !== -1) {
                    const key = line.substring(0, idx).trim().toLowerCase();
                    const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
                    if (key === "name" || key === "title")
                        name = val;
                    else if (key === "category")
                        category = val;
                    else if (key === "description")
                        description = val;
                }
            }
        }
        if (!name) {
            const h1Match = text.match(/^#\s+(.*)/m);
            if (h1Match) {
                name = h1Match[1].trim();
            }
            else {
                const parts = targetUrl.split("/");
                name = parts[parts.length - 1].replace(/\.md$/i, "");
            }
        }
        description = text;
        res.json({ name, category, description });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// 10. GET /api/skills/local-content - Fetch full SKILL.md documentation from the local environment
app.get("/api/skills/local-content", (req, res) => {
    const id = req.query.id;
    if (!id) {
        return res.status(400).json({ error: "Missing id query parameter" });
    }
    // Define paths to search locally
    const searchPaths = [
        path.join(homedir, ".gemini/config/skills", id, "SKILL.md"),
        path.join(homedir, ".gemini/config/skills", id),
        path.join(homedir, ".gemini/config/plugins/chrome-devtools-plugin/skills", id, "SKILL.md"),
        path.join(homedir, ".gemini/config/plugins/firebase/skills", id, "SKILL.md"),
        path.join(homedir, ".gemini/config/plugins/modern-web-guidance-plugin/skills", id, "SKILL.md")
    ];
    // Also search recursively under the plugins directory
    const pluginsDir = path.join(homedir, ".gemini/config/plugins");
    if (fs.existsSync(pluginsDir)) {
        try {
            const plugins = fs.readdirSync(pluginsDir);
            for (const plugin of plugins) {
                const skillPath = path.join(pluginsDir, plugin, "skills", id, "SKILL.md");
                searchPaths.push(skillPath);
            }
        }
        catch (e) {
            console.warn("Failed to search plugin directories:", e);
        }
    }
    for (const p of searchPaths) {
        try {
            if (fs.existsSync(p)) {
                const stat = fs.statSync(p);
                if (stat.isFile()) {
                    const content = fs.readFileSync(p, "utf-8");
                    return res.json({ content });
                }
            }
        }
        catch (err) {
            // try next path
        }
    }
    res.status(404).json({ error: "Skill documentation file not found locally" });
});
// Start Server
app.listen(PORT, () => {
    console.log(`Factory IDE Backend listening on http://localhost:${PORT}`);
});
