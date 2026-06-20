import { Actor } from 'apify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { scrapeInvestors } from './src/scraper.js';
import { generatePitch } from './src/pitcher.js';
import { sendEmailViaGog, checkRepliesViaGog } from './src/gog-gmail.js';
import { sendWhatsAppMessage } from './src/whatsapp.js';
import { authenticateCodexOAuth } from './src/codex-oauth.js';
import { renderEmailTemplate, validateHtml } from './src/template-engine.js';
import { generatePlainTextFallback } from './src/text-fallback.js';

await Actor.init();

// Load preferences if they exist (Self-learning preference persistence)
const preferencesPath = '/Users/danny/Desktop/apify/danny-actors/reports/preferences.json';
let cachedPrefs = {};
try {
    if (fs.existsSync(preferencesPath)) {
        cachedPrefs = JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
        console.log(`[SELF-LEARNING] Loaded cached preferences from ${preferencesPath}`);
    }
} catch (e) {
    console.warn(`[SELF-LEARNING] Could not read preferences file: ${e.message}`);
}

const input = await Actor.getInput();

// 1. Resolve local project codebase path and study it
let studiedName = '';
let studiedDescription = '';
const localProjectPath = input?.projectPath || cachedPrefs.projectPath || '/Users/danny/Desktop/health-erecords-app';

if (fs.existsSync(localProjectPath)) {
    console.log(`Studying target project codebase at: ${localProjectPath}`);
    try {
        const packageJsonPath = path.join(localProjectPath, 'package.json');
        const readmePath = path.join(localProjectPath, 'README.md');
        
        if (fs.existsSync(packageJsonPath)) {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            studiedName = pkg.name;
            if (studiedName === 'health-erecords' || studiedName === 'health-erecords-app') {
                studiedName = 'Health eRecords';
            }
        }
        
        if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf8');
            const lines = readme.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('---'));
            
            studiedDescription = lines.slice(0, 3).join(' ');
        }
    } catch (e) {
        console.error(`Failed to study local project: ${e.message}`);
    }
}

// 2. Fallbacks and defaults
const {
    appName: rawAppName = '',
    appDescription = studiedDescription || cachedPrefs.appDescription || 'A personal health record management app built with Expo Router, Supabase, and Gemini AI.',
    targetNiche = cachedPrefs.targetNiche || 'HealthTech',
    fundingStage = cachedPrefs.fundingStage || 'Seed',
    investorUrls = [],
    autoDiscover = true,
    openaiApiKey = '',
    emailTo = input?.emailTo || cachedPrefs.emailTo || 'apd1034@gmail.com',
    outreachChannel = input?.outreachChannel || cachedPrefs.outreachChannel || 'gmail-gog',
    gmailAccount = input?.gmailAccount || cachedPrefs.gmailAccount || 'apd1034@gmail.com',
    useCodexOAuth = input?.useCodexOAuth || cachedPrefs.useCodexOAuth || false,
    preview = process.argv.includes('--preview') || input?.preview || false
} = input || {};

let appName = rawAppName || studiedName || cachedPrefs.appName || 'Health eRecords';
if (appName === 'health-erecords' || appName === 'health-erecords-app') {
}

// Save preferences back (Self-learning)
try {
    const updatedPrefs = {
        projectPath: localProjectPath,
        emailTo,
        appName,
        appDescription,
        targetNiche,
        fundingStage,
        outreachChannel,
        gmailAccount,
        useCodexOAuth,
        deckSlideImageUrl: cachedPrefs.deckSlideImageUrl || 'https://raw.githubusercontent.com/openclaw/openclaw/main/docs/channels/whatsapp/icon.png',
        deckLinkUrl: cachedPrefs.deckLinkUrl || 'https://health-erecords.com/pitch-deck',
        calendarLinkUrl: cachedPrefs.calendarLinkUrl || 'https://calendly.com/danny-health-erecords',
        unsubscribeUrl: cachedPrefs.unsubscribeUrl || 'https://health-erecords.com/unsubscribe'
    };
    fs.mkdirSync(path.dirname(preferencesPath), { recursive: true });
    fs.writeFileSync(preferencesPath, JSON.stringify(updatedPrefs, null, 2), 'utf8');
    console.log(`[SELF-LEARNING] Saved current preferences to ${preferencesPath}`);
} catch (e) {
    console.warn(`[SELF-LEARNING] Could not save preferences: ${e.message}`);
}

// 3. Resolve Gemini API Key from local project .env if not supplied in env or inputs
let resolvedGeminiApiKey = input?.geminiApiKey || process.env.GEMINI_API_KEY || '';

if (!resolvedGeminiApiKey) {
    const envPath = path.join(localProjectPath, '.env');
    if (fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
            if (match) {
                resolvedGeminiApiKey = match[1].trim();
                console.log('Automatically resolved GEMINI_API_KEY from local project .env file.');
            }
        } catch (e) {
            // ignore
        }
    }
}

// 4. Codex OAuth Device Code Flow (if enabled)
if (useCodexOAuth) {
    try {
        const creds = await authenticateCodexOAuth();
        console.log(`[CODEX-OAUTH] Authentication token resolved successfully.`);
    } catch (err) {
        console.error(`[CODEX-OAUTH] Authentication failed:`, err.message);
    }
}

let targets = (investorUrls || []).map(item => typeof item === 'string' ? item : item.url).filter(Boolean);

// 5. Auto-discover target investors if list is empty
if (targets.length === 0 && autoDiscover) {
    console.log(`No investor URLs provided. Starting auto-discovery for niche: "${targetNiche}"...`);
    try {
        const query = encodeURIComponent(`${targetNiche} venture capital firms website`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
        
        console.log(`Searching DuckDuckGo HTML: ${searchUrl}`);
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (response.ok) {
            const html = await response.text();
            const uddgRegex = /uddg=([^&"\s'>]+)/g;
            const domainsFound = new Set();
            let match;
            
            while ((match = uddgRegex.exec(html)) !== null) {
                try {
                    const decodedUrl = decodeURIComponent(match[1]);
                    const urlObj = new URL(decodedUrl);
                    const domain = urlObj.hostname;
                    
                    if (domain && !/duckduckgo|google|bing|yahoo|linkedin|twitter|x/i.test(domain)) {
                        domainsFound.add(`https://${domain}`);
                    }
                } catch {
                    // skip
                }
            }

            targets = [...domainsFound].slice(0, 3); // top 3 target VCs
            console.log(`Discovered ${targets.length} target domains:`, targets);
        } else {
            console.warn(`Search request failed with status: ${response.status}`);
        }
    } catch (err) {
        console.error('Failed to auto-discover investors:', err.message);
    }
}

if (targets.length === 0) {
    console.log('No targets found. Falling back to default investor list.');
    targets = ['https://www.character.vc'];
}

console.log(`Processing outreach templates and scraping profiles for ${targets.length} investors...`);

// 6. Scrape target domains
const scrapedProfiles = await scrapeInvestors(targets);

// 7. Self-learning reply history check
let isWarmFollowUp = false;
if (outreachChannel === 'gmail-gog' && emailTo) {
    try {
        const replies = checkRepliesViaGog(emailTo, gmailAccount);
        if (replies.length > 0) {
            console.log(`\n[SELF-LEARNING] Investor ${emailTo} has responded to our outreach previously! Setting isWarmFollowUp = true.`);
            isWarmFollowUp = true;
        }
    } catch (err) {
        console.warn(`[SELF-LEARNING] Failed to check previous replies: ${err.message}`);
    }
}

// 8. Draft personalized pitches
console.log('Generating pitches for scraped investor profiles...');
const results = [];
for (const profile of scrapedProfiles) {
    const enriched = await generatePitch(profile, {
        appName,
        appDescription,
        targetNiche,
        fundingStage,
        openaiApiKey,
        geminiApiKey: resolvedGeminiApiKey,
        isWarmFollowUp
    });
    results.push(enriched);
}

// 9. Push results to default dataset
console.log(`Outreach generation complete. Saving ${results.length} investor pitch records to dataset.`);
for (const item of results) {
    await Actor.pushData(item);
}

// 10. Send or Preview the highest relevance pitch
if (emailTo && results.length > 0) {
    const sorted = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
    const bestPitch = sorted[0];
    
    // Set up template variables
    const vars = {
        appName: appName,
        investorFirstName: bestPitch.teamMembers?.[0]?.split(' ')[0] || '',
        firmName: bestPitch.investorName,
        deckSlideImageUrl: preview ? `file://${path.resolve('reports/deck-slide.png')}` : 'cid:deck-slide.png',
        deckLinkUrl: cachedPrefs.deckLinkUrl || 'https://health-erecords.com/pitch-deck',
        calendarLinkUrl: cachedPrefs.calendarLinkUrl || 'https://calendly.com/danny-health-erecords',
        unsubscribeUrl: cachedPrefs.unsubscribeUrl || 'https://health-erecords.com/unsubscribe',
        bodyParagraphs: bestPitch.personalizedPitchEmail || ''
    };
    
    // Render the HTML and Plain Text versions
    const htmlOutput = renderEmailTemplate('templates/pitch-email.html', vars);
    const plainTextOutput = generatePlainTextFallback(bestPitch.personalizedPitchEmail, vars);
    
    // Perform pre-send HTML validation
    const validation = validateHtml(htmlOutput);
    let useHtml = true;
    
    const hasUnresolvedHtml = /\[|\]|\{\{/.test(htmlOutput);
    const hasUnresolvedText = /\[|\]|\{\{/.test(plainTextOutput);
    
    if (hasUnresolvedHtml || hasUnresolvedText) {
        console.error(`\n[CRITICAL-VALIDATION-ERROR] Blocked email send due to unresolved placeholder syntax in output.`);
        if (hasUnresolvedHtml) {
            console.error(`HTML Output contains unresolved placeholders:`, htmlOutput.match(/\[[^\]]*\]|\{\{[^\}]*\}\}/g));
        }
        if (hasUnresolvedText) {
            console.error(`Plain Text Output contains unresolved placeholders:`, plainTextOutput.match(/\[[^\]]*\]|\{\{[^\}]*\}\}/g));
        }
        await Actor.exit();
        process.exit(1);
    }

    if (!validation.valid) {
        console.error(`[VALIDATION] Rendered HTML failed validation. Falling back to plain text outreach. Errors:`, validation.errors);
        useHtml = false;
    } else {
        console.log(`[VALIDATION] HTML template successfully validated (size: ${Buffer.byteLength(htmlOutput, 'utf8')} bytes).`);
    }

    // Handle Local Preview Loop
    if (preview) {
        const previewPath = 'reports/preview/pitch-email-preview.html';
        console.log(`\n========================================`);
        console.log(`[PREVIEW] Generating local browser preview...`);
        console.log(`========================================`);
        
        fs.mkdirSync(path.dirname(previewPath), { recursive: true });
        fs.writeFileSync(previewPath, htmlOutput, 'utf8');
        
        console.log(`Opening preview file in default browser: ${previewPath}`);
        spawnSync('open', [previewPath]);
        
        await Actor.exit();
        process.exit(0);
    }
    
    console.log(`\n========================================`);
    console.log(`Preparing outreach via channel: ${outreachChannel}`);
    console.log(`Recipient: ${emailTo}`);
    console.log(`Relevance Score: ${bestPitch.relevanceScore}/10`);
    console.log(`========================================`);
    
    const subject = bestPitch.personalizedSubjectLine || `Pitch: ${appName} B2B outreach`;
    
    if (plainTextOutput) {
        let sentSuccessfully = false;

        if (outreachChannel === 'gmail-gog') {
            if (useHtml) {
                console.log(`[GOG-GMAIL] Dispatching HTML email to ${emailTo} via gog...`);
                try {
                    const result = spawnSync('gog', [
                        'gmail', 'send',
                        '--to', emailTo,
                        '--subject', subject,
                        '--body', plainTextOutput,
                        '--body-html', htmlOutput,
                        '--account', gmailAccount
                    ], {
                        encoding: 'utf8',
                        stdio: ['ignore', 'pipe', 'pipe']
                    });
                    
                    if (result.status === 0) {
                        console.log(`[GOG-GMAIL] Email sent successfully via gog!`);
                        sentSuccessfully = true;
                    } else {
                        console.error(`[GOG-GMAIL] gog send command failed with code ${result.status}:`, result.stderr);
                    }
                } catch (err) {
                    console.error(`[GOG-GMAIL] Failed to execute gog:`, err.message);
                }
            } else {
                sentSuccessfully = sendEmailViaGog(emailTo, subject, plainTextOutput, gmailAccount);
            }
        } else if (outreachChannel === 'whatsapp-baileys') {
            try {
                // Send plain text version with the deck link appended
                const whatsappMsg = `*${subject}*\n\n${plainTextOutput}`;
                await sendWhatsAppMessage(emailTo, whatsappMsg);
                sentSuccessfully = true;
            } catch (err) {
                console.error(`[ERROR] Failed to send via WhatsApp:`, err.message);
            }
        }
        
        // Fallback A: Apify Send-Mail API
        if (!sentSuccessfully && (outreachChannel === 'apify-mail' || outreachChannel === 'gmail-gog')) {
            console.log('Attempting to send email via Apify Send-Mail API...');
            let apifyToken = process.env.APIFY_TOKEN || '';
            if (!apifyToken) {
                try {
                    const authPath = path.join(os.homedir(), '.apify', 'auth.json');
                    if (fs.existsSync(authPath)) {
                        const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
                        apifyToken = auth.token || '';
                    }
                } catch (e) {
                    // ignore
                }
            }
            
            if (apifyToken) {
                try {
                    const payload = {
                        to: emailTo,
                        subject: subject,
                        text: plainTextOutput
                    };
                    if (useHtml) {
                        payload.html = htmlOutput;
                    }
                    
                    const response = await fetch(`https://api.apify.com/v2/acts/apify~send-mail/runs?token=${apifyToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (response.ok) {
                        const runData = await response.json();
                        console.log(`[SUCCESS] Email successfully sent to ${emailTo} via Apify Send-Mail API. Run ID: ${runData.data?.id}`);
                        sentSuccessfully = true;
                    } else {
                        const errorText = await response.text();
                        console.warn(`Apify Send-Mail API returned status ${response.status}: ${errorText}`);
                    }
                } catch (err) {
                    console.error('Failed to call Apify Send-Mail API:', err.message);
                }
            }
        }
        
        // Fallback B: Local system mail utility
        if (!sentSuccessfully && (outreachChannel === 'system-mail' || outreachChannel === 'gmail-gog')) {
            console.log(`Falling back to local system mail utility...`);
            try {
                // If HTML is enabled and validated, prepend MIME content type headers to the mail command stdin
                const mailBody = useHtml 
                    ? `MIME-Version: 1.0\nContent-Type: text/html; charset=utf-8\n\n${htmlOutput}`
                    : plainTextOutput;
                    
                const sendResult = spawnSync('mail', ['-s', subject, emailTo], {
                    input: mailBody,
                    encoding: 'utf8'
                });
                if (sendResult.status === 0) {
                    console.log(`[SUCCESS] Email successfully sent to ${emailTo} using system mail utility`);
                    sentSuccessfully = true;
                } else {
                    console.error(`[ERROR] mail command failed with code ${sendResult.status}:`, sendResult.stderr);
                }
            } catch (err) {
                console.error('[ERROR] Failed to execute mail command:', err.message);
            }
        }
    }
}

await Actor.exit();
