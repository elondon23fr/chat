import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserBySessionId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, age, gender, sessionId } = await request.json();
    
    // Validation des données
    if (!username || !age || !gender || !sessionId) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si l'âge est un nombre
    if (typeof age !== 'number' || age < 13) {
      return NextResponse.json(
        { error: 'L\'âge doit être un nombre supérieur à 13' },
        { status: 400 }
      );
    }
    
    // Vérifier si le genre est valide
    if (!['homme', 'femme', 'autre'].includes(gender.toLowerCase())) {
      return NextResponse.json(
        { error: 'Le genre doit être "homme", "femme" ou "autre"' },
        { status: 400 }
      );
    }
    
    // Créer l'utilisateur
    const user = await createUser(username, age, gender, sessionId);
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID requis' },
        { status: 400 }
      );
    }
    
    const user = await getUserBySessionId(sessionId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}
