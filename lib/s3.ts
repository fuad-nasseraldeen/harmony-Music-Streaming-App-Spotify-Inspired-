import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'spotify-harmoney-music-streaming';

// Get S3 client with correct region
function getS3Client(region?: string): S3Client {
  return new S3Client({
    region: region || process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Use virtual-hosted style (recommended)
    forcePathStyle: false,
  });
}

// Get bucket region automatically
async function getBucketRegion(): Promise<string> {
  const defaultRegion = process.env.AWS_REGION || 'us-east-1';
  
  try {
    const client = getS3Client(defaultRegion);
    const command = new GetBucketLocationCommand({ Bucket: BUCKET_NAME });
    const response = await client.send(command);
    
    // If LocationConstraint is null or undefined, it's us-east-1
    const location = response.LocationConstraint;
    if (!location || location === null || location === undefined) {
      return 'us-east-1';
    }
    return String(location);
  } catch (error: any) {
    // If we can't detect, use default region
    console.warn('Could not detect bucket region, using default:', defaultRegion);
    return defaultRegion;
  }
}

// Extract region from error endpoint
function extractRegionFromError(error: any): string | null {
  const errorMessage = error.message || '';
  const endpointMatch = errorMessage.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/i);
  if (endpointMatch && endpointMatch[1]) {
    return endpointMatch[1];
  }
  
  // Check error headers for Location header (contains correct endpoint)
  const locationHeader = error.$response?.headers?.location || error.$metadata?.httpHeaders?.location;
  if (locationHeader) {
    const locationMatch = locationHeader.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/i);
    if (locationMatch && locationMatch[1]) {
      return locationMatch[1];
    }
  }
  
  return null;
}

// Upload file to S3 with automatic region detection
export async function uploadToS3(
  file: Buffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {

  let region = process.env.AWS_REGION
  let client = getS3Client(region);
  let retryWithCorrectRegion = false;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: contentType,
  });

  try {
    await client.send(command);
  } catch (error: any) {
    // If region is wrong (301 redirect), try to extract correct region
    if (error.$metadata?.httpStatusCode === 301 || error.message?.includes('endpoint') || error.name === 'PermanentRedirect') {
      const correctRegion = extractRegionFromError(error);
      
      if (correctRegion && correctRegion !== region) {
        // Retry with correct region
        console.log(`S3 region mismatch detected. Switching from ${region} to ${correctRegion}`);
        region = correctRegion;
        client = getS3Client(region);
        
        try {
          await client.send(command);
          retryWithCorrectRegion = true;
        } catch (retryError: any) {
          throw new Error(
            `S3 Region Error: Your bucket is in region "${correctRegion}", but AWS_REGION is set to "${process.env.AWS_REGION || 'not set'}". ` +
            `Please set AWS_REGION=${correctRegion} in your .env.local file and restart the server. ` +
            `Original error: ${error.message}`
          );
        }
      } else {
        // Couldn't extract region, provide helpful error
        throw new Error(
          `S3 Region mismatch. Your bucket region doesn't match AWS_REGION="${process.env.AWS_REGION || 'not set'}". ` +
          `Please check your bucket's region in AWS Console (Properties → Bucket region) and set AWS_REGION in .env.local to match it. ` +
          `Common regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1. ` +
          `Original error: ${error.message}`
        );
      }
    } else {
      // Other errors - just throw as-is
      throw error;
    }
  }

  // Construct the S3 URL using virtual-hosted style
  const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
  
  return url;
}

// Get file from S3 (if needed)
export async function getFileFromS3(fileName: string): Promise<Buffer> {
  const region = await getBucketRegion();
  const client = getS3Client(region);
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
  });

  const response = await client.send(command);
  const arrayBuffer = await response.Body?.transformToByteArray();
  
  if (!arrayBuffer) {
    throw new Error('Failed to get file from S3');
  }
  
  return Buffer.from(arrayBuffer);
}

// Generate presigned URL for direct client-side upload
export async function getPresignedUploadUrl(
  s3Key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const region = process.env.AWS_REGION || await getBucketRegion();
  const client = getS3Client(region);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  });

  // Generate presigned URL (valid for upload)
  const presignedUrl = await getSignedUrl(client, command, { expiresIn });
  
  return presignedUrl;
}

// Generate presigned URL for reading files (if bucket is private)
export async function getPresignedReadUrl(
  s3Key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const region = process.env.AWS_REGION || await getBucketRegion();
  const client = getS3Client(region);

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  // Generate presigned URL (valid for download/read)
  const presignedUrl = await getSignedUrl(client, command, { expiresIn });
  
  return presignedUrl;
}
