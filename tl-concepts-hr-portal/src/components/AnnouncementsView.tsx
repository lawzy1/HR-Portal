import * as Dialog from '@radix-ui/react-dialog';
import {
  CalendarDays,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  LoaderCircle,
  Megaphone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHR } from '../context/HRContext';
import {
  ANNOUNCEMENT_CATEGORIES,
  useAnnouncementPdfUrl,
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementCategory,
  type DbAnnouncement,
} from '../hooks/useAnnouncements';
import { getUserFacingError } from '../lib/userFacingError';
import { ConfirmationDialog } from './ConfirmationDialog';

const CATEGORY_META = {
  announcement: { label: 'Thông báo chung', icon: Megaphone, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  holiday: { label: 'Nghỉ lễ, nghỉ Tết', icon: CalendarDays, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  policy: { label: 'Chính sách', icon: ShieldCheck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  authorization: { label: 'Ủy quyền', icon: FileCheck2, className: 'bg-violet-50 text-violet-700 border-violet-200' },
  discipline: { label: 'Kỷ luật', icon: Gavel, className: 'bg-rose-50 text-rose-700 border-rose-200' },
} satisfies Record<AnnouncementCategory, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }>;

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });
const shortMonthFormatter = new Intl.DateTimeFormat('vi-VN', { month: 'short' });

const formatFileSize = (bytes: number | null) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '';

function PdfPreview({ announcement, onClose }: { announcement: DbAnnouncement | null; onClose: () => void }) {
  const { data: url, isLoading, isError } = useAnnouncementPdfUrl(announcement?.attachment_path);

  return (
    <Dialog.Root open={!!announcement} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:inset-5 focus:outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-bold sm:text-base">{announcement?.attachment_name}</Dialog.Title>
              <Dialog.Description className="mt-0.5 truncate text-xs text-slate-400">{announcement?.title}</Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Mở bản gốc</span>
                </a>
              )}
              <Dialog.Close asChild>
                <button type="button" aria-label="Đóng bản xem trước" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-800 p-2 sm:p-4">
            {isLoading && <LoaderCircle className="h-8 w-8 animate-spin text-primary-400" />}
            {isError && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-rose-700">Không thể tải bản xem trước. Vui lòng thử lại.</p>}
            {url && <iframe src={url} title={announcement?.attachment_name || 'Tài liệu PDF'} className="h-full w-full rounded-lg bg-white" />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const AnnouncementsView: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useHR();
  const { data: announcements = [], isLoading, isError } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const isAdmin = profile?.role === 'admin';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | AnnouncementCategory>('all');
  const [year, setYear] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<DbAnnouncement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<DbAnnouncement | null>(null);
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const years = useMemo(
    () => [...new Set(announcements.map((item) => new Date(item.created_at).getFullYear()))].sort((a, b) => b - a),
    [announcements],
  );
  const filteredAnnouncements = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return announcements.filter((item) => {
      const matchesText = !needle || `${item.title} ${item.content} ${item.attachment_name || ''}`.toLocaleLowerCase('vi').includes(needle);
      const matchesCategory = category === 'all' || item.category === category;
      const matchesYear = year === 'all' || new Date(item.created_at).getFullYear() === Number(year);
      return matchesText && matchesCategory && matchesYear;
    });
  }, [announcements, category, search, year]);

  const resetComposer = () => {
    setFormCategory('announcement');
    setTitle('');
    setContent('');
    setFile(null);
    setFormError('');
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.companyId || !title.trim() || !content.trim()) return;
    setFormError('');
    try {
      await createAnnouncement.mutateAsync({
        companyId: profile.companyId,
        authorProfileId: profile.id,
        category: formCategory,
        title,
        content,
        file,
      });
      setComposerOpen(false);
      resetComposer();
      showToast('Đã đăng thông báo.');
    } catch (error) {
      setFormError(await getUserFacingError(error, 'Không thể đăng thông báo. Vui lòng thử lại.'));
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    try {
      const { cleanupFailed } = await deleteAnnouncement.mutateAsync(announcementToDelete);
      setAnnouncementToDelete(null);
      showToast(cleanupFailed ? 'Đã xóa thông báo, nhưng chưa thể dọn file đính kèm.' : 'Đã xóa thông báo.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xóa thông báo.'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.28),transparent_68%)]" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-300">
              <Sparkles className="h-4 w-4" /> Bảng tin nội bộ
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Thông báo & Chính sách Công ty</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Nơi lưu lại các thông báo quan trọng, lịch nghỉ, chính sách và văn bản nội bộ để mọi người có thể tìm lại bất cứ lúc nào.</p>
          </div>
          {isAdmin && (
            <button type="button" onClick={() => setComposerOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-950/30 transition hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300">
              <Plus className="h-4 w-4" /> Đăng thông báo
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px_130px]">
        <label className="relative block">
          <span className="sr-only">Tìm thông báo</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề, nội dung hoặc tên file..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label="Lọc theo loại" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
          <option value="all">Tất cả loại</option>
          {ANNOUNCEMENT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Lọc theo năm" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
          <option value="all">Tất cả năm</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      {isLoading && <div className="flex justify-center py-16"><LoaderCircle className="h-7 w-7 animate-spin text-primary-600" /></div>}
      {isError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">Không thể tải bảng tin. Vui lòng thử lại.</div>}
      {!isLoading && !isError && filteredAnnouncements.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Megaphone className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">Chưa có thông báo phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thử đổi từ khóa hoặc bộ lọc để xem lại các bài đã đăng.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => {
          const meta = CATEGORY_META[announcement.category as AnnouncementCategory] || CATEGORY_META.announcement;
          const Icon = meta.icon;
          const createdAt = new Date(announcement.created_at);
          return (
            <article key={announcement.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 260px' }} className="grid gap-3 sm:grid-cols-[74px_minmax(0,1fr)]">
              <div className="hidden flex-col items-center sm:flex" aria-hidden="true">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <strong className="text-lg leading-none text-slate-900">{String(createdAt.getDate()).padStart(2, '0')}</strong>
                  <span className="mt-1 text-[10px] font-bold uppercase text-primary-600">{shortMonthFormatter.format(createdAt)}</span>
                </div>
                <span className="mt-2 h-full w-px bg-slate-200" />
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                <div className="absolute left-0 top-0 h-full w-1 bg-primary-500 opacity-0 transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.className}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>
                      <time className="text-xs font-medium text-slate-400 sm:hidden">{dateFormatter.format(createdAt)}</time>
                    </div>
                    <h2 className="mt-3 text-lg font-black leading-snug text-slate-900 sm:text-xl">{announcement.title}</h2>
                  </div>
                  {isAdmin && (
                    <button type="button" onClick={() => setAnnouncementToDelete(announcement)} aria-label={`Xóa ${announcement.title}`} className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.content}</p>
                {announcement.attachment_path && (
                  <button type="button" onClick={() => setPreviewAnnouncement(announcement)} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/70 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200 sm:w-auto sm:min-w-80">
                    <span className="rounded-lg bg-white p-2 text-primary-600 shadow-sm"><FileText className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">{announcement.attachment_name}</span>
                      <span className="mt-0.5 block text-xs font-medium text-slate-500">PDF · {formatFileSize(announcement.attachment_size)} · Nhấn để xem trước</span>
                    </span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Dialog.Root open={composerOpen} onOpenChange={(open) => { if (!createAnnouncement.isPending) { setComposerOpen(open); if (!open) resetComposer(); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black text-slate-900">Đăng thông báo mới</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">Có thể đăng nội dung ngắn ngay hoặc đính kèm thêm một văn bản PDF.</Dialog.Description>
              </div>
              <Dialog.Close asChild><button type="button" aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></Dialog.Close>
            </div>
            <form onSubmit={handlePublish} className="mt-6 space-y-5">
              <label className="block text-sm font-bold text-slate-700">Loại thông báo
                <select value={formCategory} onChange={(event) => setFormCategory(event.target.value as AnnouncementCategory)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-medium outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
                  {ANNOUNCEMENT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">Tiêu đề
                <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="Ví dụ: Lịch nghỉ Tết Nguyên Đán 2027" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-medium outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
              </label>
              <label className="block text-sm font-bold text-slate-700">Nội dung thông báo
                <textarea value={content} onChange={(event) => setContent(event.target.value)} required maxLength={5000} rows={7} placeholder="Nhập phần thông tin mọi người cần đọc ngay..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-medium leading-6 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
                <span className="mt-1 block text-right text-xs font-medium text-slate-400">{content.length}/5000</span>
              </label>
              <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-primary-300 hover:bg-primary-50/40">
                <UploadCloud className="mx-auto h-7 w-7 text-primary-500" />
                <span className="mt-2 block text-sm font-bold text-slate-700">{file ? file.name : 'Đính kèm văn bản PDF (tùy chọn)'}</span>
                <span className="mt-1 block text-xs text-slate-500">Tối đa 6 MB · PDF scan hoặc PDF có chữ</span>
                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <Dialog.Close asChild><button type="button" disabled={createAnnouncement.isPending} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button></Dialog.Close>
                <button type="submit" disabled={createAnnouncement.isPending || !title.trim() || !content.trim()} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {createAnnouncement.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Đăng thông báo
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <PdfPreview announcement={previewAnnouncement} onClose={() => setPreviewAnnouncement(null)} />
      <ConfirmationDialog
        open={!!announcementToDelete}
        onOpenChange={(open) => !open && setAnnouncementToDelete(null)}
        title="Xóa thông báo?"
        description={`Thông báo “${announcementToDelete?.title || ''}” và file PDF đính kèm sẽ bị xóa. Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa thông báo"
        onConfirm={handleDelete}
        isPending={deleteAnnouncement.isPending}
        variant="danger"
      />
    </div>
  );
};
