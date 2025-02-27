// A more detailed test script that checks response content
const routes = [
  { path: '/', name: 'Home Page' },
  { path: '/en', name: 'English Home' },
  { path: '/en/chat', name: 'English Chat' },
  { path: '/zh/chat', name: 'Chinese Chat' },
  { path: '/en/songs/1', name: 'Song Detail' },
  { path: '/en/songs/1/play', name: 'Song Play' },
  { path: '/en/songs/1/questions', name: 'Song Questions' },
  { path: '/api/songs', name: 'Songs API', isJson: true },
  { path: '/api/auth', name: 'Auth API', method: 'POST', body: { address: 'test', signature: 'test' }, isJson: true }
];

async function testRoutes() {
  console.log('Starting detailed route testing...');
  const baseUrl = 'http://localhost:3000';
  
  for (const route of routes) {
    try {
      console.log(`\nTesting ${route.name} (${route.path})...`);
      
      const options = {
        method: route.method || 'GET',
        headers: {}
      };
      
      if (route.body) {
        options.body = JSON.stringify(route.body);
        options.headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(`${baseUrl}${route.path}`, options);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      // Check if the response is valid
      if (response.ok) {
        console.log('  ✅ Route is working');
        
        // For API routes, check if the response is valid JSON
        if (route.isJson) {
          try {
            const data = await response.json();
            console.log('  ✅ Valid JSON response');
            console.log(`  Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
          } catch (error) {
            console.log('  ❌ Invalid JSON response');
          }
        } else {
          // For page routes, check if the response contains HTML
          const text = await response.text();
          if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
            console.log('  ✅ Valid HTML response');
            console.log(`  HTML length: ${text.length} characters`);
          } else {
            console.log('  ❌ Invalid HTML response');
          }
        }
      } else {
        console.log('  ❌ Route is not working');
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${route.path}: ${error.message}`);
    }
  }
  
  console.log('\nTesting complete!');
}

// Wait for server to start
console.log('Waiting for server to be ready...');
setTimeout(testRoutes, 5000); 