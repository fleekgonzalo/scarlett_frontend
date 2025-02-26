import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { userId: string; songId: string } }
) {
  const { userId, songId } = params;

  try {
    // Use the Irys GraphQL API directly
    const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["Scarlett"] }
            { name: "Type", values: ["user-progress"] }
            { name: "User-Id", values: ["${userId}"] }
            { name: "Song-Id", values: ["${songId}"] }
          ]
          order: DESC
          limit: 1
        ) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    // Make a direct request to the Irys GraphQL endpoint
    const graphqlResponse = await fetch('https://node1.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!graphqlResponse.ok) {
      throw new Error(`GraphQL request failed: ${graphqlResponse.statusText}`);
    }

    const graphqlData = await graphqlResponse.json();
    
    if (graphqlData?.data?.transactions?.edges?.length > 0) {
      const txId = graphqlData.data.transactions.edges[0].node.id;
      
      // Fetch the transaction data directly from the gateway
      const dataResponse = await fetch(`https://gateway.irys.xyz/${txId}`);
      
      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch transaction data: ${dataResponse.statusText}`);
      }
      
      const data = await dataResponse.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("Error fetching progress from Irys:", error);
    return NextResponse.json({ error: 'Failed to fetch progress from Irys' }, { status: 500 });
  }
} 