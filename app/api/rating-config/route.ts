import { NextRequest, NextResponse } from 'next/server';
import { ENV_CONFIG } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id es requerido' },
        { status: 400 }
      );
    }

    // Get JWT from Authorization header
    const authHeader = request.headers.get('authorization');
    const jwt = authHeader?.replace('Bearer ', '') || '';

    const backendUrl = ENV_CONFIG.BACKEND_URL;
    const res = await fetch(`${backendUrl}/widget-rating-config/workspace/${workspaceId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
      },
    });

    if (!res.ok) {
      console.error('Error fetching rating config from backend:', res.status);
      return NextResponse.json(null);
    }

    const raw = await res.text();
    if (!raw.trim()) {
      return NextResponse.json(null);
    }

    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in rating-config API route:', error);
    return NextResponse.json(null);
  }
}
