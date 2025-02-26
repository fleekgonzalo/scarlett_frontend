import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Using a more recent transaction ID format
  const txId = '75DijgjLEpYjyhGbAxveYYzE4MYak9LGpbyv5QzG66jT';
  
  try {
    console.log(`[Irys Test API] Fetching transaction data for ID: ${txId}`);
    
    // First, let's try to query the GraphQL API to verify the transaction exists
    const query = `
      query {
        transactions(
          ids: ["${txId}"]
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;
    
    console.log(`[Irys Test API] Verifying transaction with GraphQL query`);
    
    // Make a direct request to the Irys GraphQL endpoint - using the correct URL from the docs
    const graphqlResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!graphqlResponse.ok) {
      console.error(`[Irys Test API] GraphQL request failed: ${graphqlResponse.statusText}`);
    } else {
      const graphqlData = await graphqlResponse.json();
      console.log('[Irys Test API] GraphQL response:', JSON.stringify(graphqlData));
    }
    
    // Fetch the transaction data directly from the gateway
    console.log(`[Irys Test API] Fetching transaction data from gateway`);
    const dataResponse = await fetch(`https://gateway.irys.xyz/${txId}`);
    
    if (!dataResponse.ok) {
      console.error(`[Irys Test API] Failed to fetch transaction data: ${dataResponse.statusText}`);
      throw new Error(`Failed to fetch transaction data: ${dataResponse.statusText}`);
    }
    
    const data = await dataResponse.json();
    console.log(`[Irys Test API] Successfully fetched transaction data`);
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Irys API is working',
      timestamp: new Date().toISOString(),
      transactionId: txId,
      transactionData: data
    });
  } catch (error) {
    console.error("[Irys Test API] Error fetching transaction data:", error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Failed to fetch transaction data',
      timestamp: new Date().toISOString(),
      transactionId: txId,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 