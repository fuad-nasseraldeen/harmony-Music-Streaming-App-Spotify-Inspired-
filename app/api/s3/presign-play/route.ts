import { NextRequest, NextResponse } from 'next/server';
import { getPresignedReadUrl } from '@/lib/s3';

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
    const { key, expiresIn } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      );
    }

    // Extract S3 key from full URL if provided
    // e.g., "https://bucket.s3.region.amazonaws.com/songs/file.mp3" -> "songs/file.mp3"
    let s3Key = key;
    if (key.startsWith('http')) {
      const url = new URL(key);
      s3Key = url.pathname.substring(1); // Remove leading '/'
    }

    // Generate presigned URL (default 5 minutes, configurable)
    const playUrl = await getPresignedReadUrl(s3Key, expiresIn || 300); // 5 minutes default

    return NextResponse.json({
      playUrl,
      expiresIn: expiresIn || 300,
    });
  } catch (error: any) {
    console.error('Presigned play URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate presigned play URL' },
      { status: 500 }
    );
  }
}
