import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const searchDirs = [
    '/Users/danny/Desktop/apify/creator-factory/generated-actors',
    '/Users/danny/Desktop/apify/danny-actors'
];

async function main() {
    console.log('Scanning for actors missing output schemas...');
    
    const actorsToDeploy = [];
    
    for (const searchDir of searchDirs) {
        if (!fs.existsSync(searchDir)) continue;
        
        const actorDirs = fs.readdirSync(searchDir);
        for (const actorDirName of actorDirs) {
            // Skip backup folders
            if (actorDirName.includes('backup') || actorDirName.startsWith('.')) continue;
            
            const actorPath = path.join(searchDir, actorDirName);
            if (!fs.statSync(actorPath).isDirectory()) continue;
            
            const actorJsonPath = path.join(actorPath, '.actor', 'actor.json');
            const outputSchemaPath = path.join(actorPath, '.actor', 'output_schema.json');
            
            if (fs.existsSync(actorJsonPath)) {
                let actorTitle = 'Actor Output';
                try {
                    const content = fs.readFileSync(actorJsonPath, 'utf8');
                    const json = JSON.parse(content);
                    actorTitle = json.title || actorDirName;
                } catch (e) {
                    // fallback
                }
                
                let changed = false;
                
                // 1. Create output_schema.json if it doesn't exist
                if (!fs.existsSync(outputSchemaPath)) {
                    const schema = {
                        "$schema": "https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3",
                        "actorOutputSchemaVersion": 1,
                        "title": `${actorTitle} Output Schema`,
                        "description": "Structured description of the output dataset results.",
                        "properties": {
                            "results": {
                                "type": "string",
                                "title": "Results",
                                "description": "Link to output dataset items.",
                                "template": "{{links.apiDefaultDatasetUrl}}/items"
                            }
                        }
                    };
                    
                    fs.writeFileSync(outputSchemaPath, JSON.stringify(schema, null, 4) + '\n', 'utf8');
                    console.log(`[CREATED] output_schema.json for: ${actorDirName}`);
                    changed = true;
                }
                
                // 2. Reference output_schema.json in actor.json if not done
                try {
                    const content = fs.readFileSync(actorJsonPath, 'utf8');
                    const json = JSON.parse(content);
                    if (json.output !== './output_schema.json') {
                        json.output = './output_schema.json';
                        fs.writeFileSync(actorJsonPath, JSON.stringify(json, null, 4) + '\n', 'utf8');
                        console.log(`[REFERENCED] output_schema.json in actor.json of: ${actorDirName}`);
                        changed = true;
                    }
                } catch (e) {
                    console.error(`Failed to update actor.json for ${actorDirName}:`, e.message);
                }
                
                if (changed) {
                    actorsToDeploy.push({ name: actorDirName, path: actorPath });
                }
            }
        }
    }
    
    console.log(`\nFound ${actorsToDeploy.length} actors with modified/created output schemas.`);
    
    if (actorsToDeploy.length === 0) {
        console.log('No actors require deployment.');
        return;
    }
    
    console.log('\nDeploying updates to Apify Console...');
    for (const actor of actorsToDeploy) {
        console.log(`\n========================================`);
        console.log(`Pushing: ${actor.name}`);
        console.log(`Path: ${actor.path}`);
        console.log(`========================================`);
        try {
            const stdout = execSync('npx apify push', {
                cwd: actor.path,
                encoding: 'utf8'
            });
            console.log(stdout);
            console.log(`[SUCCESS] Pushed ${actor.name}`);
        } catch (err) {
            console.error(`[ERROR] Failed to push ${actor.name}:`, err.message);
        }
    }
    
    console.log('\nDeployment completed successfully.');
}

main().catch(console.error);
