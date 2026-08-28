const http = require('https');

const tenantId = '84c62447-5e8a-4647-b1f1-d47a3501677f';

// Step 1: Get token
http.get(`https://burflow.onrender.com/api/widget/public-token?tenantId=${tenantId}`, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const { token, tenantId: resolvedId } = JSON.parse(body);
    console.log('Token tenantId:', resolvedId);
    
    // Step 2: Fetch config with token
    const opts = {
      hostname: 'burflow.onrender.com',
      path: `/api/widget/config?token=${encodeURIComponent(token)}`,
      headers: { 'Content-Type': 'application/json' }
    };
    http.get(opts, res2 => {
      let body2 = '';
      res2.on('data', c => body2 += c);
      res2.on('end', () => {
        const config = JSON.parse(body2);
        console.log('\n=== FULL CONFIG ===');
        console.log('companyName:', config.companyName);
        console.log('starterOptions:', JSON.stringify(config.starterOptions));
        console.log('suggestedActions:', JSON.stringify(config.suggestedActions));
        console.log('greeting:', config.greeting);
        console.log('launcherText:', config.launcherText);
        console.log('businessProfile:', JSON.stringify(config.businessProfile, null, 2));
      });
    });
  });
});
