import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Get userId and songId from query parameters
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const songId = url.searchParams.get('songId');

  console.log(`[Irys Progress API] Request received with userId=${userId}, songId=${songId}`);

  if (!userId || !songId) {
    console.error('[Irys Progress API] Missing userId or songId parameters');
    return NextResponse.json({ error: 'Missing userId or songId parameters' }, { status: 400 });
  }

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

    console.log(`[Irys Progress API] Executing GraphQL query for userId=${userId}, songId=${songId}`);
    console.log(`[Irys Progress API] Query: ${query.replace(/\s+/g, ' ')}`);

    // Make a direct request to the Irys GraphQL endpoint - using the correct URL from the docs
    const graphqlResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!graphqlResponse.ok) {
      console.error(`[Irys Progress API] GraphQL request failed: ${graphqlResponse.statusText}`);
      throw new Error(`GraphQL request failed: ${graphqlResponse.statusText}`);
    }

    const graphqlData = await graphqlResponse.json();
    console.log('[Irys Progress API] GraphQL response:', JSON.stringify(graphqlData));
    
    if (graphqlData?.data?.transactions?.edges?.length > 0) {
      const txId = graphqlData.data.transactions.edges[0].node.id;
      console.log(`[Irys Progress API] Found transaction ID: ${txId}`);
      
      // Fetch the transaction data directly from the gateway
      console.log(`[Irys Progress API] Fetching transaction data from gateway for txId=${txId}`);
      const dataResponse = await fetch(`https://gateway.irys.xyz/${txId}`);
      
      if (!dataResponse.ok) {
        console.error(`[Irys Progress API] Failed to fetch transaction data: ${dataResponse.statusText}`);
        throw new Error(`Failed to fetch transaction data: ${dataResponse.statusText}`);
      }
      
      const rawData = await dataResponse.json();
      console.log('[Irys Progress API] Transaction data retrieved successfully');
      
      // Convert the data to match the expected format for the client
      // This ensures compatibility with both IrysService and FSRSService
      const formattedData = {
        userId: rawData.userId,
        songId: rawData.songId,
        questions: rawData.questions.map((q: any) => {
          // Create a basic FSRS card structure if it doesn't exist
          const now = new Date();
          const fsrsData = q.fsrs || {
            due: now.toISOString(),
            stability: 0,
            difficulty: 0,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            state: 0,
            last_review: now.toISOString()
          };
          
          return {
            uuid: q.uuid,
            correct: q.correct,
            timestamp: q.timestamp || Date.now(),
            fsrs: fsrsData
          };
        }),
        totalCorrect: rawData.totalCorrect || 0,
        totalQuestions: rawData.totalQuestions || 0,
        completedAt: rawData.completedAt || Date.now()
      };
      
      console.log('[Irys Progress API] Returning formatted data with FSRS structure');
      return NextResponse.json(formattedData);
    }

    console.log('[Irys Progress API] No transactions found, returning null');
    return NextResponse.json(null);
  } catch (error) {
    console.error("[Irys Progress API] Error fetching progress from Irys:", error);
    return NextResponse.json({ error: 'Failed to fetch progress from Irys' }, { status: 500 });
  }
} 