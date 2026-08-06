const fs = require('fs');
const lines = fs.readFileSync('engine/packages/conversation-orchestrator/src/visitor-intent-engine.ts','utf8').split('\n');
for (let i = 330; i <= 560; i++) {
  const line = lines[i-1];
  if (/Pricing|pageType|titleText|headingText|contentText|metaText|userQuestion|knowledgeText|path/.test(line)) {
    console.log(i, line);
  }
}
