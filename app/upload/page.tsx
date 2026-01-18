'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { graphqlRequest, mutations } from '@/lib/graphql';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [songFile, setSongFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login first');
      router.push('/auth');
      return;
    }

    if (!songFile || !imageFile) {
      toast.error('Please select both song and image files');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URLs from server
      setUploadProgress(10);
      toast.loading('Preparing upload...', { id: 'upload' });

      const [songPresigned, imagePresigned] = await Promise.all([
        fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: songFile.name,
            fileType: songFile.type || 'audio/mpeg',
            fileCategory: 'songs',
          }),
        }).then(res => res.json()),
        fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: imageFile.name,
            fileType: imageFile.type || 'image/jpeg',
            fileCategory: 'images',
          }),
        }).then(res => res.json()),
      ]);

      if (songPresigned.error || imagePresigned.error) {
        throw new Error(songPresigned.error || imagePresigned.error || 'Failed to get presigned URLs');
      }

      // Step 2: Upload files directly to S3 using presigned URLs
      setUploadProgress(30);
      toast.loading('Uploading files to S3...', { id: 'upload' });

      const [songUploadResult, imageUploadResult] = await Promise.all([
        fetch(songPresigned.presignedUrl, {
          method: 'PUT',
          body: songFile,
          headers: {
            'Content-Type': songFile.type || 'audio/mpeg',
          },
        }),
        fetch(imagePresigned.presignedUrl, {
          method: 'PUT',
          body: imageFile,
          headers: {
            'Content-Type': imageFile.type || 'image/jpeg',
          },
        }),
      ]);

      setUploadProgress(70);

      if (!songUploadResult.ok || !imageUploadResult.ok) {
        const songError = await songUploadResult.text();
        const imageError = await imageUploadResult.text();
        throw new Error(`S3 upload failed: ${songError || imageError}`);
      }

      // Step 3: Save song metadata via GraphQL
      setUploadProgress(80);
      toast.loading('Saving song metadata...', { id: 'upload' });

      await graphqlRequest(mutations.uploadSong, {
        title,
        author,
        songPath: songPresigned.url,
        imagePath: imagePresigned.url,
      });

      setUploadProgress(100);
      toast.success('Song uploaded successfully!', { id: 'upload' });
      
      // Reset form
      setTitle('');
      setAuthor('');
      setSongFile(null);
      setImageFile(null);
      setUploadProgress(0);

      // Redirect to home page
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload song', { id: 'upload' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Please login to upload songs</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-purple-900 to-black h-full p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-3xl font-bold mb-8">Upload a Song</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white mb-2">Song Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-white mb-2">Artist</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-white mb-2">Song File (MP3, WAV, etc.)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setSongFile(e.target.files?.[0] || null)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              disabled={loading}
            />
            {songFile && (
              <p className="text-neutral-400 text-sm mt-1">
                Selected: {songFile.name} ({(songFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div>
            <label className="block text-white mb-2">Cover Image (JPG, PNG, etc.)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              required
              className="w-full px-4 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              disabled={loading}
            />
            {imageFile && (
              <p className="text-neutral-400 text-sm mt-1">
                Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-neutral-700 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? `Uploading... ${uploadProgress}%` : 'Upload Song to S3'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-neutral-800 rounded-md text-sm text-neutral-400">
          <p className="font-semibold text-white mb-2">ℹ️ Secure Upload Info:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Files are uploaded directly to S3 using presigned URLs</li>
            <li>Bucket stays private - no public access required</li>
            <li>Upload happens client-side directly to S3 (faster & more secure)</li>
            <li>Presigned URLs expire after 1 hour for security</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
