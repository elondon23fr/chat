import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getRoomById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, type, created_by } = await request.json();
    
    // Validation des données
    if (!name || !type || !created_by) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si le type est valide
    if (type !== 'public' && type !== 'private') {
      return NextResponse.json(
        { error: 'Le type doit être "public" ou "private"' },
        { status: 400 }
      );
    }
    
    // Créer le salon
    const room = await createRoom(name, type, created_by);
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Erreur lors de la création du salon:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du salon' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'ID du salon requis' },
        { status: 400 }
      );
    }
    
    const room = await getRoomById(parseInt(roomId, 10));
    
    if (!room) {
      return NextResponse.json(
        { error: 'Salon non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Erreur lors de la récupération du salon:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du salon' },
      { status: 500 }
    );
  }
}
