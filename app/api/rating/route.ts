import { NextRequest, NextResponse } from 'next/server';
import { ENV_CONFIG } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace_id, thread_id, chatbot_id, rating, comment, user_session_id } = body;

    if (!workspace_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'workspace_id y rating (1-5) son requeridos' },
        { status: 400 }
      );
    }

    // Get JWT from Authorization header
    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '') || '';

    const backendUrl = ENV_CONFIG.BACKEND_URL;
    const res = await fetch(`${backendUrl}/widget-ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        workspace_id,
        thread_id: thread_id || null,
        chatbot_id: chatbot_id || null,
        rating,
        comment: comment || null,
        user_session_id: user_session_id || null,
        user_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error submitting rating to backend:', res.status, errorText);
      return NextResponse.json(
        { error: 'Error al enviar valoración' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in rating API route:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
