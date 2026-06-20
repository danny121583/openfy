import { execSync } from 'node:child_process';

async function main() {
    try {
        const infoStr = execSync('/opt/homebrew/bin/apify info --json', { encoding: 'utf8' });
        const info = JSON.parse(infoStr);
        const token = info.token;
        if (token) {
            const b64 = Buffer.from(token).toString('base64');
            console.log(`Base64 Token: ${b64}`);
        } else {
            console.log('No token found in info.');
        }
    } catch (err) {
        console.error('Error running apify info:', err.message);
    }
}

main().catch(console.error);
