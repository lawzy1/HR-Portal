import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { useSignedImageUrl } from '../hooks/useFileUpload';

export const ContractDocumentLink: React.FC<{
  path: string | null | undefined;
  name?: string | null;
}> = ({ path, name }) => {
  const { data: url, isLoading } = useSignedImageUrl(path);

  if (!path) return <span className="text-[11px] text-slate-400">Chưa có file hợp đồng</span>;

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:underline"
    >
      <FileText className="w-3.5 h-3.5" />
      <span>{name || 'Xem file hợp đồng'}</span>
      <ExternalLink className="w-3 h-3" />
    </a>
  ) : (
    <span className="text-[11px] text-slate-400">{isLoading ? 'Đang tạo liên kết...' : 'Không thể mở file'}</span>
  );
};
