import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileName, fileType, fileCategory } = body;

    if (!fileName || !fileType || !fileCategory) {
      return NextResponse.json(
        { error: 'fileName, fileType, and fileCategory are required' },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${fileCategory}/${timestamp}-${sanitizedFileName}`;

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getPresignedUploadUrl(s3Key, fileType);

    // Return both the presigned URL and the final S3 URL
    const region = process.env.AWS_REGION || 'us-east-1';
    const finalUrl = `https://spotify-harmoney-music-streaming.s3.${region}.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      presignedUrl,
      s3Key,
      url: finalUrl, // This will be saved in the database
    });
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
