import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { Tables } from '../lib/database.types';

const BUCKET = 'company-announcements';
const MAX_PDF_SIZE = 6 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type DbAnnouncement = Tables<'announcements'>;
export type AnnouncementCategory = 'announcement' | 'holiday' | 'policy' | 'authorization' | 'discipline';

export const ANNOUNCEMENT_CATEGORIES: { value: AnnouncementCategory; label: string }[] = [
  { value: 'announcement', label: 'Thông báo chung' },
  { value: 'holiday', label: 'Nghỉ lễ, nghỉ Tết' },
  { value: 'policy', label: 'Chính sách' },
  { value: 'authorization', label: 'Ủy quyền' },
  { value: 'discipline', label: 'Kỷ luật' },
];

async function validatePdf(file: File) {
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') throw new Error('Chỉ chấp nhận file PDF hợp lệ.');
  if (file.size > MAX_PDF_SIZE) throw new Error('File PDF không được vượt quá 6 MB.');
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      authorProfileId,
      category,
      title,
      content,
      file,
    }: {
      companyId: string;
      authorProfileId: string;
      category: AnnouncementCategory;
      title: string;
      content: string;
      file: File | null;
    }) => {
      const id = crypto.randomUUID();
      let attachmentPath: string | null = null;

      if (file) {
        await validatePdf(file);
        attachmentPath = `${companyId}/${id}/${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage.from(BUCKET).upload(attachmentPath, file, {
          cacheControl: '31536000',
          contentType: 'application/pdf',
          upsert: false,
        });
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          id,
          company_id: companyId,
          author_profile_id: authorProfileId,
          category,
          title: title.trim(),
          content: content.trim(),
          attachment_path: attachmentPath,
          attachment_name: file?.name ?? null,
          attachment_size: file?.size ?? null,
        })
        .select()
        .single();

      if (error) {
        if (attachmentPath) await supabase.storage.from(BUCKET).remove([attachmentPath]);
        throw error;
      }
      // ponytail: a browser crash between upload and insert can leave one orphan;
      // add scheduled cleanup only if storage growth becomes measurable.
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: DbAnnouncement) => {
      const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
      if (error) throw error;
      if (announcement.attachment_path) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([announcement.attachment_path]);
        return { cleanupFailed: !!cleanupError };
      }
      return { cleanupFailed: false };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useAnnouncementPdfUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['announcement-pdf-url', path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path!, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });
}
