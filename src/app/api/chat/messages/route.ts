import { NextRequest, NextResponse } from 'next/server';
import { getMessagesByRoomId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'ID du salon requis' },
        { status: 400 }
      );
    }
    
    const messages = await getMessagesByRoomId(Number(roomId));
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages' },
      { status: 500 }
    );
  }
}
