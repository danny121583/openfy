import fs from 'node:fs';
import path from 'node:path';

const OPENAI_AUTH_BASE_URL = "https://auth.openai.com";
const OPENAI_CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const CACHE_PATH = path.resolve('.actor/codex-creds.json');

/**
 * Runs the OpenAI Codex Device Code OAuth authentication flow.
 * @returns {Promise<Object>} The OAuth credentials (access token, refresh token).
 */
export async function authenticateCodexOAuth() {
    // 1. Try to load cached credentials if they exist and are not expired
    try {
        if (fs.existsSync(CACHE_PATH)) {
            const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
            if (cache.expires && cache.expires > Date.now()) {
                console.log(`[CODEX-OAUTH] Using valid cached Codex credentials.`);
                return cache;
            }
        }
    } catch (e) {
        // ignore
    }

    console.log(`[CODEX-OAUTH] Initiating Codex OAuth login...`);
    
    // 2. Request User Code
    const userCodeRes = await fetch(`${OPENAI_AUTH_BASE_URL}/api/accounts/deviceauth/usercode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: OPENAI_CODEX_CLIENT_ID })
    });

    if (!userCodeRes.ok) {
        throw new Error(`Failed to request device code: ${userCodeRes.statusText}`);
    }

    const userCodeJson = await userCodeRes.json();
    const deviceAuthId = userCodeJson.device_auth_id;
    const userCode = userCodeJson.user_code || userCodeJson.usercode;
    const verificationUrl = `${OPENAI_AUTH_BASE_URL}/codex/device`;
    const intervalMs = (userCodeJson.interval || 5) * 1000;

    console.log('\n==================================================');
    console.log('            OPENAI CODEX OAUTH LOGIN              ');
    console.log('==================================================');
    console.log(`1. Visit this URL: ${verificationUrl}`);
    console.log(`2. Enter this code: ${userCode}`);
    console.log('==================================================\n');

    // 3. Poll for token
    console.log(`[CODEX-OAUTH] Waiting for authorization...`);
    let authCode = '';
    let codeVerifier = '';
    const deadline = Date.now() + 15 * 60 * 1000; // 15 minute limit

    while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
        const pollRes = await fetch(`${OPENAI_AUTH_BASE_URL}/api/accounts/deviceauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_auth_id: deviceAuthId, user_code: userCode })
        });

        if (pollRes.ok) {
            const pollJson = await pollRes.json();
            authCode = pollJson.authorization_code;
            codeVerifier = pollJson.code_verifier;
            break;
        } else if (pollRes.status !== 403 && pollRes.status !== 404) {
            throw new Error(`Polling failed with status ${pollRes.status}`);
        }
    }

    if (!authCode || !codeVerifier) {
        throw new Error('Device authentication timed out or failed.');
    }

    // 4. Exchange Auth Code for Tokens
    console.log(`[CODEX-OAUTH] Exchanging authorization code for access token...`);
    const tokenRes = await fetch(`${OPENAI_AUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: `${OPENAI_AUTH_BASE_URL}/deviceauth/callback`,
            client_id: OPENAI_CODEX_CLIENT_ID,
            code_verifier: codeVerifier
        })
    });

    if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenJson = await tokenRes.json();
    const creds = {
        access: tokenJson.access_token,
        refresh: tokenJson.refresh_token,
        expires: Date.now() + (tokenJson.expires_in || 3600) * 1000
    };

    // Save to cache
    try {
        fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify(creds, null, 2), 'utf8');
        console.log(`[CODEX-OAUTH] Credentials successfully cached to ${CACHE_PATH}`);
    } catch (e) {
        console.warn(`[CODEX-OAUTH] Could not write cache: ${e.message}`);
    }

    return creds;
}
