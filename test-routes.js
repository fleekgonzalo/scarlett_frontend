// Using native fetch available in Node.js instead of node-fetch
const routes = [
  '/',
  '/en',
  '/en/chat',
  '/zh/chat',
  '/en/songs/1',
  '/en/songs/1/play',
  '/en/songs/1/questions',
  '/api/songs',
  '/api/auth'
];

async function testRoutes() {
  console.log('Testing routes...');
  const baseUrl = 'http://localhost:3000';
  
  for (const route of routes) {
    try {
      console.log(`Testing ${route}...`);
      const response = await fetch(`${baseUrl}${route}`);
      console.log(`  Status: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`  Error testing ${route}: ${error.message}`);
    }
  }
}

// Wait for server to start
setTimeout(testRoutes, 5000);
