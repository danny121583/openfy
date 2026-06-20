import { CheerioCrawler, log } from 'crawlee';

/**
 * Scrapes target investor websites to extract emails, socials, thesis, portfolio companies, and team members.
 * @param {string[]} domains - List of target domains or URLs to crawl.
 * @returns {Promise<Object[]>} List of scraped investor profiles.
 */
export async function scrapeInvestors(domains) {
    const profiles = [];

    for (const domain of domains) {
        let rootUrl = domain;
        if (!rootUrl.startsWith('http://') && !rootUrl.startsWith('https://')) {
            rootUrl = `https://${rootUrl}`;
        }

        log.info(`Scraping investor domain: ${rootUrl}`);

        const profile = {
            domain: rootUrl,
            name: '',
            emails: new Set(),
            phones: new Set(),
            socials: new Set(),
            aboutText: '',
            portfolio: new Set(),
            team: []
        };

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 15, // limit per domain to be respectful and fast
            maxConcurrency: 5,
            
            async requestHandler({ request, $ }) {
                const url = request.loadedUrl || request.url;
                const path = new URL(url).pathname.toLowerCase();
                
                log.info(`Crawling subpage: ${url}`);

                // 1. Try to extract VC/Firm name from title or logo
                if (path === '/' || path === '') {
                    profile.name = $('title').text().split('|')[0].split('-')[0].trim();
                }

                // 2. Extract emails and phone numbers via regex
                const bodyText = $('body').text();
                
                // Email regex
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const foundEmails = bodyText.match(emailRegex) || [];
                for (const email of foundEmails) {
                    // Ignore common image/resource assets matched by mistake
                    if (!/\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2)$/i.test(email)) {
                        profile.emails.add(email.toLowerCase());
                    }
                }

                // Phone regex (simple US/International format match)
                const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
                const foundPhones = bodyText.match(phoneRegex) || [];
                for (const phone of foundPhones) {
                    profile.phones.add(phone.trim());
                }

                // 3. Extract social profiles
                $('a[href]').each((_, el) => {
                    const href = $(el).attr('href') || '';
                    if (href.includes('linkedin.com/') || href.includes('twitter.com/') || href.includes('x.com/') || href.includes('facebook.com/')) {
                        profile.socials.add(href.trim());
                    }
                });

                // 4. Extract about / thesis text
                if (path.includes('about') || path.includes('thesis') || path.includes('approach') || path.includes('mission') || path === '/' || path === '') {
                    // Grab paragraphs that contain core VC keywords
                    $('p, h1, h2, h3').each((_, el) => {
                        const txt = $(el).text().trim();
                        if (txt.length > 30 && txt.length < 1000) {
                            if (/invest|founder|partner|seed|series|growth|capital|fund|tech|health|software/i.test(txt)) {
                                profile.aboutText += txt + '\n';
                            }
                        }
                    });
                }

                // 5. Extract portfolio companies (especially on /portfolio, /companies, /investments pages)
                if (path.includes('portfolio') || path.includes('compan') || path.includes('investment')) {
                    // Look for company names in grids, list items, or image alts
                    $('a[href]').each((_, el) => {
                        const href = $(el).attr('href') || '';
                        const text = $(el).text().trim();
                        // If it's an outbound link that's not to standard socials/assets and is a clean domain
                        if (href.startsWith('http') && !href.includes(new URL(rootUrl).hostname) && !/linkedin|twitter|x\.com|facebook|medium|github|google|apple|youtube|vimeo|instagram|crunchbase|angel\.co|wellfound/i.test(href)) {
                            // Link text or domain can indicate company name
                            if (text && text.length > 2 && text.length < 30 && !/website|visit|read|more|case study/i.test(text)) {
                                profile.portfolio.add(text);
                            } else {
                                try {
                                    const hostname = new URL(href).hostname.replace('www.', '');
                                    const compName = hostname.split('.')[0];
                                    if (compName.length > 2 && compName.length < 25) {
                                        profile.portfolio.add(compName.charAt(0).toUpperCase() + compName.slice(1));
                                    }
                                } catch {
                                    // ignore invalid URLs
                                }
                            }
                        }
                    });

                    // Check image alts which often store portfolio logos
                    $('img[alt]').each((_, el) => {
                        const alt = $(el).attr('alt').trim();
                        if (alt && alt.length > 2 && alt.length < 35 && !/logo|icon|avatar|image|banner|photo|pic/i.test(alt)) {
                            profile.portfolio.add(alt);
                        }
                    });
                }

                // 6. Extract team names
                if (path.includes('team') || path.includes('people') || path.includes('about')) {
                    // Team members often stand in h2, h3, h4 elements or links with name titles
                    $('h2, h3, h4, .name, .team-name').each((_, el) => {
                        const text = $(el).text().trim();
                        // Standard name pattern: 2-3 words, capitalized
                        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z\'-]+){1,2}$/.test(text) && !/team|partner|about|contact|newsletter|investment|venture|career|join/i.test(text)) {
                            if (!profile.team.includes(text)) {
                                profile.team.push(text);
                            }
                        }
                    });
                }
            },

            failedRequestHandler({ request, error }) {
                log.error(`Request to ${request.url} failed: ${error.message}`);
            }
        });

        // Seed with standard internal page structures
        const pages = [
            rootUrl,
            `${rootUrl}/about`,
            `${rootUrl}/team`,
            `${rootUrl}/portfolio`,
            `${rootUrl}/companies`,
            `${rootUrl}/investments`,
            `${rootUrl}/contact`
        ];

        await crawler.run(pages);

        // Clean up text and convert Sets back to Arrays
        profile.emails = [...profile.emails];
        profile.phones = [...profile.phones];
        profile.socials = [...profile.socials];
        profile.portfolio = [...profile.portfolio].slice(0, 20); // cap at 20 representative companies
        profile.aboutText = profile.aboutText.trim().substring(0, 4000); // cap to keep payload reasonable

        // Fallback for VC name if not found
        if (!profile.name) {
            try {
                const host = new URL(rootUrl).hostname.replace('www.', '');
                profile.name = host.split('.')[0].toUpperCase();
            } catch {
                profile.name = 'Venture Capital Investor';
            }
        }

        profiles.push(profile);
    }

    return profiles;
}
