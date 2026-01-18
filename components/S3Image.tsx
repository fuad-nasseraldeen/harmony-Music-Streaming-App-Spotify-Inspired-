'use client';

import { useState, useEffect } from 'react';

interface S3ImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}

const S3Image = ({ src, alt, className, fallback }: S3ImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      // Skip if placeholder or local path
      if (!src || error || src.startsWith('/') || !src.includes('s3')) {
        setImageUrl(src);
        return;
      }

      try {
        // Extract S3 key from full URL if needed
        let key = src;
        if (src.startsWith('http')) {
          const url = new URL(src);
          key = url.pathname.substring(1); // Remove leading '/'
        }

        // Get presigned URL for image (same endpoint as songs)
        const response = await fetch('/api/s3/presign-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, expiresIn: 300 }), // 5 minutes
        });

        if (response.ok) {
          const { playUrl } = await response.json();
          setImageUrl(playUrl);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to get presigned image URL:', errorData.error);
          // Fallback to direct URL if presigned fails
          setImageUrl(src);
        }
      } catch (err) {
        console.error('Error fetching presigned image URL:', err);
        // Fallback to direct URL on error
        setImageUrl(src);
      }
    };

    fetchPresignedUrl();
  }, [src, error]);

  const handleError = () => {
    setError(true);
    setImageUrl(fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3EMusic%3C/text%3E%3C/svg%3E');
  };

  if (!imageUrl) {
    return (
      <div className={`bg-neutral-700 animate-pulse ${className || ''}`}>
        {/* Loading placeholder */}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default S3Image;
