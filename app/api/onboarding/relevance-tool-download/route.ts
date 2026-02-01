/**
 * PHASE 64: Relevance AI Tool Download
 * 
 * GET /api/onboarding/relevance-tool-download
 * Downloads the LinkedIn Research Tool .rai file
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read the tool file from the cold-email-system directory
    const toolFilePath = path.join(process.cwd(), 'cold-email-system', 'Relevance AI LinkedIn Scraper Tool.rai');
    
    // Check if file exists
    if (!fs.existsSync(toolFilePath)) {
      return NextResponse.json({ error: 'Tool file not found' }, { status: 404 });
    }

    // Read the file
    const fileContent = fs.readFileSync(toolFilePath, 'utf-8');
    
    // Parse and sanitize the JSON (remove any user-specific IDs)
    const toolData = JSON.parse(fileContent);
    
    // Remove user-specific data for export
    const sanitizedTool = {
      ...toolData,
      _id: undefined,
      creator_user_id: undefined,
      machine_user_id: undefined,
      project: undefined,  // User will get their own project ID
      studio_id: undefined, // User will get their own studio ID
      metadata: {
        ...toolData.metadata,
        last_run_date: undefined,
      },
    };

    // Create the response with proper headers for download
    const response = new NextResponse(JSON.stringify(sanitizedTool, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="LinkedIn Research Tool.rai"',
      },
    });

    return response;
  } catch (error) {
    console.error('Tool download error:', error);
    return NextResponse.json({ error: 'Failed to download tool' }, { status: 500 });
  }
}
