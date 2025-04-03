import { NextRequest, NextResponse } from 'next/server';
import { getPrivateMessages } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const recipientId = request.nextUrl.searchParams.get('recipientId');
    
    if (!userId || !recipientId) {
      return NextResponse.json(
        { error: 'ID utilisateur et ID destinataire requis' },
        { status: 400 }
      );
    }
    
    const messages = await getPrivateMessages(
      parseInt(userId, 10),
      parseInt(recipientId, 10)
    );
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages privés:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages privés' },
      { status: 500 }
    );
  }
}
