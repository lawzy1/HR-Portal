import type { DbEmployee } from '../hooks/useEmployees';

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Converts an approver ID (UUID or text string) into a human-readable display name.
 * Checks employees list by `id` or `user_id`.
 */
export function getApproverDisplayName(approvedBy: string | null | undefined, employees?: DbEmployee[]): string {
  if (!approvedBy) return '—';
  
  const trimmed = approvedBy.trim();
  if (employees && employees.length > 0) {
    const found = employees.find(e => e.id === trimmed || (e as Record<string, any>).user_id === trimmed);
    if (found) return found.full_name;
  }

  // If it's a raw UUID and not matched to a specific employee name:
  if (isUuid(trimmed)) {
    return 'Ban Giám Đốc (Admin)';
  }

  return trimmed;
}
