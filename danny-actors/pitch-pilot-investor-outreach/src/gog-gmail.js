import { spawnSync } from 'node:child_process';

/**
 * Sends an email using the local gog CLI.
 * @param {string} to - Recipient email.
 * @param {string} subject - Email subject line.
 * @param {string} body - Email body content.
 * @param {string} [account] - Optional Gmail account to send from.
 * @returns {boolean} True if successful.
 */
export function sendEmailViaGog(to, subject, body, account) {
    console.log(`[GOG-GMAIL] Sending email to ${to} via gog CLI...`);
    const args = ['gmail', 'send', '--to', to, '--subject', subject, '--body-file', '-'];
    if (account) {
        args.push('--account', account);
    }
    
    try {
        const result = spawnSync('gog', args, {
            input: body,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        if (result.status === 0) {
            console.log(`[GOG-GMAIL] Email sent successfully via gog!`);
            return true;
        } else {
            console.error(`[GOG-GMAIL] gog send command failed with code ${result.status}:`, result.stderr);
            return false;
        }
    } catch (err) {
        console.error(`[GOG-GMAIL] Failed to execute gog command:`, err.message);
        return false;
    }
}

/**
 * Searches for messages/replies from a specific email address using gog.
 * @param {string} email - Email address to search for.
 * @param {string} [account] - Optional Gmail account.
 * @returns {Array<Object>} Found messages.
 */
export function checkRepliesViaGog(email, account) {
    console.log(`[GOG-GMAIL] Checking for replies from ${email} via gog CLI...`);
    const args = ['gmail', 'messages', 'search', `from:${email}`, '--max', '5', '--json'];
    if (account) {
        args.push('--account', account);
    }

    try {
        const result = spawnSync('gog', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });

        if (result.status === 0 && result.stdout) {
            try {
                const parsed = JSON.parse(result.stdout);
                // Return messages list (normally inside results or root array)
                const messages = parsed.messages || (Array.isArray(parsed) ? parsed : []);
                console.log(`[GOG-GMAIL] Found ${messages.length} existing messages/replies from ${email}`);
                return messages;
            } catch (e) {
                console.warn(`[GOG-GMAIL] Could not parse gog JSON response: ${e.message}`);
                return [];
            }
        }
    } catch (err) {
        console.error(`[GOG-GMAIL] Failed to search messages via gog:`, err.message);
    }
    return [];
}
