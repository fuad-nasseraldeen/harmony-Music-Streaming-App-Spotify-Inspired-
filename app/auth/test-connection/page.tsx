'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function TestConnection() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...\n');

    try {
      // Check env vars
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      setResult(prev => prev + `Environment Variables:\n`);
      setResult(prev => prev + `- NEXT_PUBLIC_SUPABASE_URL: ${hasUrl ? '✓ Set' : '✗ Missing'}\n`);
      setResult(prev => prev + `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasKey ? '✓ Set' : '✗ Missing'}\n\n`);

      if (!hasUrl || !hasKey) {
        setResult(prev => prev + 'ERROR: Missing environment variables!\n');
        setResult(prev => prev + 'Please check your .env.local file.\n');
        setLoading(false);
        return;
      }

      // Test Supabase connection
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setResult(prev => prev + `Connection Error: ${error.message}\n`);
      } else {
        setResult(prev => prev + `✓ Supabase connection successful!\n`);
        setResult(prev => prev + `Current session: ${data.session ? 'Active' : 'None'}\n`);
      }

      // Try to get auth settings
      const { data: settings } = await supabase.auth.getUser();
      setResult(prev => prev + `\nUser check: ${settings.user ? 'User exists' : 'No user'}\n`);

    } catch (error: any) {
      setResult(prev => prev + `\nUnexpected error: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-8">
      <div className="bg-neutral-800 p-8 rounded-lg w-full max-w-2xl">
        <h1 className="text-white text-2xl font-bold mb-4">Supabase Connection Test</h1>
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md mb-4 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        <pre className="bg-black p-4 rounded text-green-400 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
          {result || 'Click "Test Connection" to check your Supabase setup...'}
        </pre>
        <div className="mt-4 text-white text-sm">
          <p className="font-semibold mb-2">What to check:</p>
          <ul className="list-disc list-inside space-y-1 text-neutral-300">
            <li>Environment variables are set in .env.local</li>
            <li>Supabase URL and keys are correct</li>
            <li>Supabase project is active</li>
            <li>Email auth is enabled in Supabase dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
