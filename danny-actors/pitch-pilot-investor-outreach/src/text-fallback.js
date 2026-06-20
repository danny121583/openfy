/**
 * Generates a clean plain-text fallback version of the email outreach.
 * @param {string} rawBodyText - The raw AI-generated prose paragraphs (from Phase 5 output).
 * @param {Object} vars - Variables including links.
 * @returns {string} Plain-text version of the outreach.
 */
export function generatePlainTextFallback(rawBodyText, vars) {
    const greeting = vars.investorFirstName ? `Hi ${vars.investorFirstName},` : `Hi Team at ${vars.firmName || 'VC Partner'},`;
    
    let text = `${greeting}\n\n`;
    
    // Inject core body text
    text += rawBodyText.trim() + '\n\n';
    
    // Add footer

    text += `Best regards,\n`;
    text += `The ${vars.appName} Team\n\n`;
    text += `---\n`;
    text += `${vars.appName} Technologies Inc.\n`;
    text += `To unsubscribe, visit: ${vars.unsubscribeUrl || 'https://www.health-erecords.com/unsubscribe'}\n`;
    
    return text;
}
