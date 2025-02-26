import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Get txId from query parameters
  const url = new URL(request.url);
  const txId = url.searchParams.get('txId');

  console.log(`[Irys Direct API] Request received with txId=${txId}`);

  if (!txId) {
    console.error('[Irys Direct API] Missing txId parameter');
    return NextResponse.json({ error: 'Missing txId parameter' }, { status: 400 });
  }

  try {
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
    
    console.log(`[Irys Direct API] Verifying transaction with GraphQL query`);
    
    // Make a direct request to the Irys GraphQL endpoint - using the correct URL from the docs
    const graphqlResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!graphqlResponse.ok) {
      console.error(`[Irys Direct API] GraphQL request failed: ${graphqlResponse.statusText}`);
    } else {
      const graphqlData = await graphqlResponse.json();
      console.log('[Irys Direct API] GraphQL response:', JSON.stringify(graphqlData));
      
      // Check if the transaction exists in the GraphQL response
      if (!graphqlData?.data?.transactions?.edges?.length) {
        console.warn(`[Irys Direct API] Transaction not found in GraphQL index, but will still try gateway`);
      }
    }
    
    // Fetch the transaction data directly from the gateway
    console.log(`[Irys Direct API] Fetching transaction data for ID: ${txId}`);
    const dataResponse = await fetch(`https://gateway.irys.xyz/${txId}`);
    
    if (!dataResponse.ok) {
      console.error(`[Irys Direct API] Failed to fetch transaction data: ${dataResponse.statusText}`);
      throw new Error(`Failed to fetch transaction data: ${dataResponse.statusText}`);
    }
    
    const data = await dataResponse.json();
    console.log(`[Irys Direct API] Successfully fetched transaction data`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Irys Direct API] Error fetching transaction data:", error);
    return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 });
  }
} 