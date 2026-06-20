import fs from 'node:fs';
import path from 'node:path';

/**
 * Renders the HTML template with provided variables.
 * @param {string} templatePath - Path to the HTML template file.
 * @param {Object} vars - Variables for templating replacement.
 * @returns {string} Fully rendered HTML string.
 */
export function renderEmailTemplate(templatePath, vars) {
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found at ${templatePath}`);
    }
    
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // Format body paragraphs
    let paragraphsHtml = '';
    if (vars.bodyParagraphs) {
        const paras = vars.bodyParagraphs
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(Boolean);
            
        paragraphsHtml = paras
            .map(p => `<p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #334155;">${p}</p>`)
            .join('\n');
    }
    
    const allVars = {
        ...vars,
        bodyParagraphs: paragraphsHtml
    };
    
    // Replace all placeholders like {{variableName}}
    for (const [key, value] of Object.entries(allVars)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        html = html.replace(regex, value !== undefined ? String(value) : '');
    }
    
    return html;
}

/**
 * Validates that the rendered HTML complies with B2B deliverability rules.
 * @param {string} html - Rendered HTML string.
 * @returns {Object} Validation status and any errors found.
 */
export function validateHtml(html) {
    const errors = [];
    
    // 1. Check size limit (< 100KB)
    const byteLength = Buffer.byteLength(html, 'utf8');
    if (byteLength > 102400) {
        errors.push(`HTML size is ${Math.round(byteLength / 102.4) / 10}KB, which exceeds the 100KB limit (may clip in Gmail).`);
    }
    
    // 2. Check for style blocks
    if (/<style/i.test(html)) {
        errors.push('Forbidden <style> tags found. Only inline CSS is allowed for deliverability.');
    }
    
    // 3. Check for script blocks
    if (/<script/i.test(html)) {
        errors.push('Forbidden <script> tags found. Scripts will trigger spam filters.');
    }
    
    // 4. Check that all images have alt text
    const imgRegex = /<img\s+[^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const tag = match[0];
        if (!/alt\s*=/i.test(tag) || /alt\s*=\s*""/i.test(tag) || /alt\s*=\s*''/i.test(tag)) {
            errors.push(`Image tag missing descriptive alt text: ${tag}`);
        }
    }
    
    // 5. Check for unresolved brackets or template variables
    if (/\[|\]/.test(html)) {
        errors.push('Contains unresolved brackets (e.g. "[Your Name]" or similar placeholders).');
    }
    if (/\{\{/.test(html)) {
        errors.push('Contains unresolved template parameters (e.g. "{{variableName}}").');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
