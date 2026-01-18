import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3, BUCKET_NAME } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const songFile = formData.get('song') as File;
    const imageFile = formData.get('image') as File;

    if (!songFile || !imageFile) {
      return NextResponse.json(
        { error: 'Both song and image files are required' },
        { status: 400 }
      );
    }

    // Generate unique file names
    const timestamp = Date.now();
    const songFileName = `songs/${timestamp}-${songFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const imageFileName = `images/${timestamp}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Convert files to buffers
    const songBuffer = Buffer.from(await songFile.arrayBuffer());
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Upload to S3
    const [songUrl, imageUrl] = await Promise.all([
      uploadToS3(songBuffer, songFileName, songFile.type || 'audio/mpeg'),
      uploadToS3(imageBuffer, imageFileName, imageFile.type || 'image/jpeg'),
    ]);

    return NextResponse.json({
      success: true,
      songUrl,
      imageUrl,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Failed to upload files';
    
    if (error.message?.includes('not authorized') || error.message?.includes('AccessDenied') || error.code === 'AccessDenied') {
      errorMessage = `IAM Permission Error: Your IAM user doesn't have permission to upload files. ` +
        `You need to attach an IAM policy to your IAM user (not just bucket policy) that allows s3:PutObject. ` +
        `See error details below for more info.`;
    } else if (error.message?.includes('Region mismatch') || error.message?.includes('endpoint')) {
      errorMessage = `S3 Configuration Error: ${error.message}. Please check your AWS_REGION in .env.local matches your bucket's region.`;
    } else if (error.code === 'CredentialsError' || error.message?.includes('credentials')) {
      errorMessage = 'AWS credentials are invalid or missing. Please check your .env.local file.';
    } else if (error.code === 'NoSuchBucket' || error.message?.includes('bucket')) {
      errorMessage = `S3 bucket "${BUCKET_NAME}" not found. Please check your bucket name in .env.local.`;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
