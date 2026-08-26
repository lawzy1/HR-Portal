import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { getUserFacingError } from '../lib/userFacingError';

const BUCKET = 'employee-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function calculateFileSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Replaces the prototype's FileReader->base64->store-on-the-row pattern
// (duplicated in EditProfileModal and AdminEmployeeListView) with a real
// Supabase Storage upload. Path convention enforced by storage RLS — see
// supabase/migrations/20260822111435_phase2_storage.sql — must be
// {company_id}/{employee_id}/{filename}.
//
// Only the storage PATH is ever persisted in the database (employees /
// employee_sensitive_info columns) — never a signed URL. A signed URL is a
// bearer token: baking a long-lived one into a DB column would let anyone
// who ever sees that string view the file forever, bypassing RLS entirely.
// Generating one fresh on each render (getSignedUrl below) means access is
// re-checked against the current RLS policy every time, not just once at
// upload time.
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, companyId: string, employeeId: string, label: string): Promise<string> => {
    setIsUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${companyId}/${employeeId}/${label}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      return path;
    } catch (err) {
      const message = await getUserFacingError(err, 'Tải tệp lên thất bại. Vui lòng thử lại.');
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, error };
}

// Storage path -> short-lived signed URL, re-checked against RLS every call.
export async function getSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

// React Query wrapper so the same path doesn't re-sign on every re-render —
// cached for slightly less than the URL's own TTL.
export function useSignedImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', path],
    queryFn: () => getSignedUrl(path),
    enabled: !!path,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });
}
