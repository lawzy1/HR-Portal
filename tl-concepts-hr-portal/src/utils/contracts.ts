const DAY_MS = 86_400_000;

export const CONTRACT_EXPIRING_WINDOW_DAYS = 60;

type ContractLifecycleInput = {
  end_date: string | null;
  status?: string | null;
};

export type ContractLifecycleStatus = 'Đang hiệu lực' | 'Sắp hết hạn' | 'Hết hạn' | 'Đã gia hạn';

/** Derive the lifecycle label from the contract dates instead of stale stored labels. */
export const getContractLifecycleStatus = (
  contract: ContractLifecycleInput,
  today = new Date(),
): ContractLifecycleStatus => {
  if (!contract.end_date) {
    return contract.status === 'Hết hạn' || contract.status === 'Đã gia hạn' ? contract.status : 'Đang hiệu lực';
  }

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endDate = new Date(`${contract.end_date}T00:00:00`).getTime();
  const remainingDays = Math.ceil((endDate - todayStart) / DAY_MS);

  if (remainingDays < 0) return 'Hết hạn';
  if (remainingDays <= CONTRACT_EXPIRING_WINDOW_DAYS) return 'Sắp hết hạn';
  return contract.status === 'Đã gia hạn' ? 'Đã gia hạn' : 'Đang hiệu lực';
};

export const latestContractsByEmployee = <T extends { employee_id: string; start_date: string }>(contracts: T[]) => {
  const latest = new Map<string, T>();
  contracts.forEach((contract) => {
    const existing = latest.get(contract.employee_id);
    if (!existing || contract.start_date > existing.start_date) latest.set(contract.employee_id, contract);
  });
  return [...latest.values()];
};

/** Employee statuses that mean onboarding has been reviewed/approved (not still pending invite/review). */
export const ONBOARDED_EMPLOYEE_STATUSES = ['Mới tiếp nhận', 'Chính thức', 'Thử việc'];

type NeedsContractEmployee = { id: string; status?: string | null };
type NeedsContractContract = { employee_id: string; publish_status?: string | null };

/** Derive "chờ hợp đồng" instead of storing it — an onboarded employee with no published contract yet. */
export const employeeNeedsContract = (employee: NeedsContractEmployee, contracts: NeedsContractContract[]): boolean =>
  !!employee.status &&
  ONBOARDED_EMPLOYEE_STATUSES.includes(employee.status) &&
  !contracts.some((c) => c.employee_id === employee.id && c.publish_status === 'published');

if (import.meta.env.DEV) {
  const today = new Date(2026, 8, 2);
  console.assert(getContractLifecycleStatus({ status: 'Đang hiệu lực', end_date: '2026-12-01' }, today) === 'Đang hiệu lực');
  console.assert(getContractLifecycleStatus({ status: 'Đang hiệu lực', end_date: '2026-09-27' }, today) === 'Sắp hết hạn');
  console.assert(getContractLifecycleStatus({ status: 'Đang hiệu lực', end_date: '2026-09-01' }, today) === 'Hết hạn');
  console.assert(getContractLifecycleStatus({ status: 'Đang hiệu lực', end_date: null }, today) === 'Đang hiệu lực');
  console.assert(employeeNeedsContract({ id: 'e1', status: 'Mới tiếp nhận' }, []) === true);
  console.assert(employeeNeedsContract({ id: 'e1', status: 'Mới tiếp nhận' }, [{ employee_id: 'e1', publish_status: 'published' }]) === false);
  console.assert(employeeNeedsContract({ id: 'e1', status: 'Mới tiếp nhận' }, [{ employee_id: 'e1', publish_status: 'draft' }]) === true);
  console.assert(employeeNeedsContract({ id: 'e1', status: 'Chờ duyệt hồ sơ' }, []) === false);
}
