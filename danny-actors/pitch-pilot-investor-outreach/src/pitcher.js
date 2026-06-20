import OpenAI from 'openai';

/**
 * Evaluates investor relevance and drafts custom pitch emails and proposals.
 * @param {Object} profile - Scraped investor profile.
 * @param {Object} appConfig - App configuration parameters.
 * @returns {Promise<Object>} Output enriched with pitches and scoring.
 */
export async function generatePitch(profile, appConfig) {
    const { appName, appDescription, targetNiche, fundingStage, openaiApiKey, geminiApiKey, isWarmFollowUp = false } = appConfig;

    // 1. Calculate relevance score (1-10)
    let relevanceScore = 5.0; // base score for B2B/SaaS match
    const textToSearch = (profile.aboutText + ' ' + (profile.focusNiches || []).join(' ')).toLowerCase();
    
    const nicheMatches = [
        targetNiche.toLowerCase(),
        'healthcare', 'health', 'medical', 'clinic', 'digital health', 'biotech', 'life sciences', 'ehr', 'emr',
        'saas', 'b2b', 'enterprise', 'automation', 'productivity', 'document'
    ];

    let matches = 0;
    for (const match of nicheMatches) {
        if (textToSearch.includes(match)) {
            matches++;
        }
    }

    relevanceScore += Math.min(matches * 1.5, 4.5); // Add up to 4.5 points
    if (profile.portfolio.some(comp => /health|cure|care|med|clinic|rx|doc/i.test(comp))) {
        relevanceScore += 0.5; // portfolio match bonus
    }
    relevanceScore = Math.min(relevanceScore, 10.0);

    // 2. Determine target contact details
    const contactEmail = profile.emails[0] || `pitch@${new URL(profile.domain).hostname.replace('www.', '')}`;
    const partnerName = profile.team[0] || '';
    const portfolioExample = profile.portfolio[0] || '';

    let subject = '';
    let pitchEmail = '';
    let proposal = '';

    const partnerFirstName = partnerName ? partnerName.split(' ')[0] : 'Partner';

    const prompt = `
You are an elite B2B startup founder raising capital. Write a personalized, high-converting ${isWarmFollowUp ? 'warm follow-up' : 'cold outreach'} email and a short proposal to a Venture Capital firm based on the following details.

${isWarmFollowUp ? 'NOTE: The investor has previously replied to our outreach. This is a warm follow-up email. Keep the tone warm, acknowledge the previous correspondence, and follow up directly on the previous conversation.' : ''}

STARTUP PROFILE:
- App Name: ${appName}
- Target Niche: ${targetNiche}
- Funding Stage: ${fundingStage}
- App Description: ${appDescription}

INVESTOR DETAILS:
- VC Firm Name: ${profile.name}
- Scraped Website Thesis/About: ${profile.aboutText.substring(0, 1500)}
- Partner/Team Member: ${partnerName ? partnerName : 'VC Partner'}
- Sample Portfolio Companies: ${profile.portfolio.slice(0, 5).join(', ')}

SALUTATION RULES:
- If isWarmFollowUp is true: Start directly with "Hi ${partnerFirstName}," or "Hi {{investorFirstName}},". Do NOT use "Dear Selection Committee", "Dear Investment Team", "Dear Partners", or any formal committee-style salutations.
- If cold outreach: Start with a personal salutation, preferably "Hi ${partnerFirstName}," or "Hi {{investorFirstName}},". Do NOT address generic committees or teams.

PORTFOLIO & THESIS SPECIFICITY:
- If referencing the investor's focus area or a portfolio company, you MUST specify the focus/company name AND include at least one concrete detail showing why it is relevant to us (e.g., shared healthcare niche, similar SaaS business model, or a recent exit/growth stage). Do not just drop the name in a generic list (e.g., 'Given your investment in Company, we believe...'). Explain the connection.

NEGATIVE CONSTRAINTS (BUZZWORD & PATTERN BAN):
- Do NOT use typical AI buzzwords and canned phrases: "delighted", "revolutionary", "game-changer", "testament", "deep expertise", "critical need", "efficiency and compliance", "we believe our mission aligns", "aligns with your thesis", "aligns well".
- Do NOT end the email with abstract, restated summary/closer sentences (e.g., "This directly addresses the critical need for..."). Keep the language concrete, factual, and direct.
- Do NOT include any sign-off, signature block, or closing name block (e.g. "Best regards, [Your Name]"). Stop writing immediately after your call to action or final sentence. The signature block is appended separately.
- Do NOT include any bracketed placeholders like "[Your Name]" or "[AppName]".

EMAIL FORMAT:
- Keep the email brief (under 120 words).
- End with a low-friction Call to Action (e.g. "Are you open to a 10-minute chat next Tuesday?").
- The proposal should be a concise 3-sentence summary of: Problem, Solution, and Market Opportunity.

Return your response in standard JSON format:
{
  "subject": "Email Subject Line",
  "pitchEmail": "Body of the outreach email...",
  "proposal": "Short proposal summary..."
}
`;

    // 3. Draft pitches using Gemini API, OpenAI API or Fallback Template
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;
    let feedback = '';

    while (attempts < maxAttempts) {
        attempts++;
        let currentPrompt = prompt;
        if (feedback) {
            console.log(`[PITCH-PILOT] Retry attempt ${attempts}/${maxAttempts} with feedback: ${feedback}`);
            currentPrompt += `\n\nFEEDBACK FROM PREVIOUS FAILED ATTEMPT:\n${feedback}\nFix these issues in the new draft.`;
        }

        let resultData = null;
        if (geminiApiKey && geminiApiKey.trim() !== '') {
            resultData = await callGemini(geminiApiKey, currentPrompt);
        }
        if (!resultData && openaiApiKey && openaiApiKey.trim() !== '') {
            resultData = await callOpenai(openaiApiKey, currentPrompt);
        }

        if (!resultData) {
            break;
        }

        // Validate content
        const validation = validatePitchContent(resultData, isWarmFollowUp);
        if (!validation.valid) {
            console.warn(`[VALIDATION] Pitch attempt ${attempts} failed validation checks:`, validation.errors);
            feedback = `Your draft failed the following validation checks:\n` + validation.errors.map(e => `- ${e}`).join('\n');
            continue;
        }

        // Run AI-sounding self-check
        const selfCheck = await selfCheckAiSounding(geminiApiKey, openaiApiKey, resultData.pitchEmail);
        if (selfCheck.soundsLikeAi) {
            console.warn(`[AI-SELF-CHECK] Pitch attempt ${attempts} flagged as sounding like AI: ${selfCheck.reason}`);
            feedback = `Your draft was flagged as sounding like AI:\n- ${selfCheck.reason}`;
            continue;
        }

        subject = resultData.subject || '';
        pitchEmail = resultData.pitchEmail || '';
        proposal = resultData.proposal || '';
        success = true;
        break;
    }

    if (!success) {
        console.log('Using rule-based hybrid template fallback...');
        const fallback = getFallbackPitch(profile.name, partnerName, portfolioExample, appName, appDescription, targetNiche, fundingStage);
        subject = fallback.subject;
        pitchEmail = fallback.pitchEmail;
        proposal = fallback.proposal;
    }

    return {
        investorName: profile.name,
        website: profile.domain,
        focusNiches: detectNiches(textToSearch),
        relevanceScore: Math.round(relevanceScore * 10) / 10,
        contactEmails: profile.emails,
        phoneNumbers: profile.phones,
        socialLinks: profile.socials,
        teamMembers: profile.team.slice(0, 5),
        portfolioCompanies: profile.portfolio,
        personalizedSubjectLine: subject,
        personalizedPitchEmail: pitchEmail,
        personalizedProposal: proposal
    };
}

function detectNiches(text) {
    const niches = [];
    if (text.includes('health') || text.includes('medical') || text.includes('clinic')) niches.push('HealthTech');
    if (text.includes('saas') || text.includes('software') || text.includes('enterprise')) niches.push('B2B SaaS');
    if (text.includes('ai') || text.includes('intelligence') || text.includes('ml')) niches.push('AI/ML');
    if (text.includes('fintech') || text.includes('finance') || text.includes('payment')) niches.push('FinTech');
    if (text.includes('dev') || text.includes('developer') || text.includes('api')) niches.push('Developer Tools');
    if (text.includes('consumer') || text.includes('marketplace')) niches.push('Consumer Tech');
    
    if (niches.length === 0) niches.push('General Technology');
    return niches;
}

function getFallbackPitch(vcName, partnerName, portfolioExample, appName, appDescription, targetNiche, fundingStage) {
    const greeting = partnerName ? `Hi ${partnerName.split(' ')[0]}` : `Hi Team at ${vcName}`;
    const portfolioReference = portfolioExample 
        ? `Given your investment in ${portfolioExample} and your focus on ${targetNiche}`
        : `Given your active investments in the ${targetNiche} sector`;

    const subject = `Outreach: Pitching ${appName} to ${vcName}`;
    
    const pitchEmail = `${greeting},\n\n` +
        `${portfolioReference}, I wanted to share what we are building.\n\n` +
        `We have launched ${appName}, a specialized solution designed for the ${targetNiche} space. ${appDescription}\n\n` +
        `We are currently raising our ${fundingStage} round to accelerate product development and expand our customer base.\n\n` +
        `Would you be open to a quick 10-minute call next week to see if there is alignment with your current investment thesis?`;

    const proposal = `Proposal Pitch for ${appName}:\n` +
        `- Problem: Administrative friction and operational inefficiencies in the ${targetNiche} sector.\n` +
        `- Solution: ${appName} automates clinical/business workflows, saving users valuable hours every week.\n` +
        `- Market: Pitching to early-stage investors for ${fundingStage} funding to capture market share.`;

    return { subject, pitchEmail, proposal };
}

async function callGemini(apiKey, prompt) {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        if (response.ok) {
            const json = await response.json();
            const text = json.candidates[0].content.parts[0].text;
            return JSON.parse(text);
        } else {
            console.warn(`Gemini API returned error code: ${response.status}`);
        }
    } catch (err) {
        console.error('Gemini API call failed:', err.message);
    }
    return null;
}

async function callOpenai(apiKey, prompt) {
    try {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        console.error('OpenAI generation failed:', err.message);
    }
    return null;
}

export function validatePitchContent(data, isWarm) {
    const errors = [];
    const { subject, pitchEmail, proposal } = data;

    if (!subject || !pitchEmail || !proposal) {
        errors.push("Missing subject, pitchEmail, or proposal fields.");
        return { valid: false, errors };
    }

    if (/\[|\]/.test(pitchEmail) || /\[|\]/.test(subject) || /\[|\]/.test(proposal)) {
        errors.push("Contains bracketed placeholders (e.g. '[Your Name]' or '[AppName]').");
    }

    const formalSalutationRegex = /Dear\s+(Selection\s+Committee|Investment\s+Team|Partner|Partners|Venture|Firm|Team|Sir|Madam)/i;
    if (formalSalutationRegex.test(pitchEmail)) {
        errors.push("Uses formal or generic committee-style salutation (e.g. 'Dear Selection Committee').");
    }

    const bannedPhrases = [
        "deep expertise",
        "mission aligns",
        "aligns with your thesis",
        "aligns well",
        "critical need",
        "efficiency and compliance",
        "delighted",
        "revolutionary",
        "game-changer",
        "testament"
    ];

    for (const phrase of bannedPhrases) {
        if (pitchEmail.toLowerCase().includes(phrase) || subject.toLowerCase().includes(phrase)) {
            errors.push(`Contains banned phrase: "${phrase}".`);
        }
    }

    if (isWarm && /Dear/i.test(pitchEmail)) {
        errors.push("Warm follow-up must not use formal 'Dear' salutations.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

async function selfCheckAiSounding(geminiApiKey, openaiApiKey, pitchEmail) {
    const checkPrompt = `
You are an expert copywriter and email deliverability auditor. Review the following email draft and evaluate if it sounds overly AI-generated, contains generic closing summaries, or uses templated transition phrases (like "Given X's... we believe...").

EMAIL DRAFT:
"""
${pitchEmail}
"""

Instructions:
1. Check if the draft sounds natural and human-written.
2. Ensure there are no generic closer sentences that restate the value proposition in abstract terms (e.g., "This addresses the critical need...").
3. Ensure there are no generic filler phrases.

Respond in standard JSON format:
{
  "soundsLikeAi": true,
  "reason": "Explain why it sounds like AI."
}
OR if it sounds natural:
{
  "soundsLikeAi": false,
  "reason": ""
}
`;

    if (geminiApiKey) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: checkPrompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                }
            );
            if (response.ok) {
                const json = await response.json();
                const text = json.candidates[0].content.parts[0].text;
                return JSON.parse(text);
            }
        } catch (e) {
            console.warn(`[AI-SELF-CHECK] Gemini check failed: ${e.message}`);
        }
    } else if (openaiApiKey) {
        try {
            const openai = new OpenAI({ apiKey: openaiApiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: checkPrompt }],
                response_format: { type: "json_object" }
            });
            return JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.warn(`[AI-SELF-CHECK] OpenAI check failed: ${e.message}`);
        }
    }
    return { soundsLikeAi: false, reason: '' };
}
