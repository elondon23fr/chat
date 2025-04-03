import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }
    
    const user = await getUserById(parseInt(userId, 10));
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    // Ne pas renvoyer d'informations sensibles comme le session_id
    return NextResponse.json({
      id: user.id,
      username: user.username,
      age: user.age,
      gender: user.gender,
      last_active: user.last_active
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}
