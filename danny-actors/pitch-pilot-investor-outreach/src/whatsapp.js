import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import path from 'node:path';

/**
 * Connects to WhatsApp Web and sends a message to the target recipient.
 * @param {string} to - Recipient phone number or WhatsApp JID.
 * @param {string} message - Message body.
 * @returns {Promise<string>} Sent message ID.
 */
export async function sendWhatsAppMessage(to, message) {
    console.log(`[WHATSAPP] Connecting to WhatsApp Web...`);
    const authPath = path.resolve('.actor/whatsapp-auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    // Create WASocket connection
    const sock = makeWASocket.default({
        auth: state,
        printQRInTerminal: false
    });
    
    return new Promise((resolve, reject) => {
        // Set a safety timeout of 3 minutes for QR scan or connection
        const timeout = setTimeout(() => {
            console.error('[WHATSAPP] Connection timed out.');
            sock.end();
            reject(new Error('WhatsApp connection timed out (3 minutes).'));
        }, 180_000);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('\n==================================================');
                console.log('   SCAN THIS WHATSAPP QR CODE TO PAIR PITCHPILOT   ');
                console.log('==================================================');
                qrcode.generate(qr, { small: true });
                console.log('==================================================\n');
            }
            
            if (connection === 'close') {
                clearTimeout(timeout);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== 401;
                console.log(`[WHATSAPP] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
                if (!shouldReconnect) {
                    reject(new Error('WhatsApp authorization failed. Please delete .actor/whatsapp-auth/ and re-run to scan QR.'));
                }
            } else if (connection === 'open') {
                clearTimeout(timeout);
                console.log('[WHATSAPP] Connection opened successfully!');
                
                try {
                    // Formulate JID: strip non-digits and append @s.whatsapp.net
                    const cleaned = to.replace(/\D/g, '');
                    const jid = `${cleaned}@s.whatsapp.net`;
                    
                    console.log(`[WHATSAPP] Sending pitch message to: ${jid}`);
                    const response = await sock.sendMessage(jid, { text: message });
                    
                    console.log(`[WHATSAPP] Message sent successfully. ID: ${response.key.id}`);
                    sock.end();
                    resolve(response.key.id);
                } catch (err) {
                    console.error('[WHATSAPP] Send failed:', err.message);
                    sock.end();
                    reject(err);
                }
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
    });
}
