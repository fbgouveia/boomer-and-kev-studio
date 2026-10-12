import { NextResponse } from 'next/server';

// ponytail: agente 24/7 (trends -> roteiro -> banco) nunca foi implementado.
// Responde 501 honesto em vez do antigo "roteiros gerados" falso (BK-26).
// Implementar de verdade = consumir /api/trends, gerar via /api/ai/script e gravar rascunho.
export async function GET() {
  return NextResponse.json(
    {
      status: 'not_implemented',
      agent: 'offline',
      message: 'Agente automático de roteiros ainda não implementado. Nenhum roteiro foi gerado.',
    },
    { status: 501 },
  );
}
