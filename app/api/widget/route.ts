import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ENV_CONFIG } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    // Obtener el JWT de los query params
    const { searchParams } = new URL(request.url);
    const jwt = searchParams.get('jwt');
    
    // Leer el template del widget
    const templatePath = path.join(process.cwd(), 'public', 'widget-template.js');
    let widgetContent = fs.readFileSync(templatePath, 'utf8');
    
    // Reemplazar variables de entorno
    const widgetUrl = ENV_CONFIG.WIDGET_URL;
    const baseUrl = jwt ? `${widgetUrl}/?jwt=${jwt}` : widgetUrl;
    
    // Reemplazar la variable en el template
    widgetContent = widgetContent.replace('{{WIDGET_BASE_URL}}', baseUrl);
    
    return new NextResponse(widgetContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving widget:', error);
    return new NextResponse('Error loading widget', { status: 500 });
  }
}
