import { NextRequest, NextResponse } from 'next/server';
import { getUserBySessionId } from '@/lib/db';

// Route pour tester l'authentification
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { authenticated: false, error: 'Session ID manquant' },
        { status: 400 }
      );
    }
    
    const user = await getUserBySessionId(sessionId);
    
    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: 'Session invalide' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        age: user.age,
        gender: user.gender,
        last_active: user.last_active
      }
    });
  } catch (error) {
    console.error('Erreur lors du test d\'authentification:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
