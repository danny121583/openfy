import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function getApifyToken() {
    if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN;
    try {
        const authPath = path.join(os.homedir(), '.apify', 'auth.json');
        if (fs.existsSync(authPath)) {
            const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
            return auth.token;
        }
    } catch {
        // ignore
    }
    return null;
}

async function checkActor(actorId, token) {
    const url = `https://api.apify.com/v2/actors/${actorId}?token=${token}`;
    console.log(`Checking: ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
        console.log(`-> FOUND! Name: ${data.data?.name}, Username: ${data.data?.username}, ID: ${data.data?.id}`);
        return true;
    } else {
        console.log(`-> NOT FOUND: ${data.error?.message || res.status}`);
        return false;
    }
}

async function main() {
    const token = await getApifyToken();
    if (!token) {
        console.error('No token found');
        process.exit(1);
    }

    const options = [
        'danny~pitch-pilot-investor-outreach',
        'orbitai~pitch-pilot-investor-outreach',
        'pitch-pilot-investor-outreach',
        'danny/pitch-pilot-investor-outreach',
        'orbitai/pitch-pilot-investor-outreach'
    ];

    for (const opt of options) {
        const found = await checkActor(opt, token);
        if (found) {
            console.log(`Found matching endpoint option: "${opt}"`);
        }
    }
}

main().catch(console.error);
