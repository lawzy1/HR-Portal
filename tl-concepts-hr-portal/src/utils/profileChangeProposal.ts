export type ProposedRelative = {
  full_name: string;
  relationship: string;
  phone: string;
  address: string;
  is_emergency_contact: boolean;
};

export type ProfileChangeProposal = {
  employee?: Partial<{
    avatar_url: string | null;
    dob: string | null;
    gender: string;
    marital_status: string;
    phone: string;
    permanent_address: string;
    temporary_address: string;
  }>;
  sensitive?: Partial<{
    id_card_number: string;
    id_card_issue_date: string | null;
    id_card_issue_place: string;
    tax_code: string;
    social_insurance_code: string;
    id_card_front_url: string | null;
    id_card_back_url: string | null;
    vneid_residency_url: string | null;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
    bank_branch: string;
  }>;
  relatives?: ProposedRelative[];
};

type ProfileSnapshot = Required<Pick<ProfileChangeProposal, 'employee' | 'sensitive' | 'relatives'>>;

const changedValues = <T extends Record<string, unknown>>(current: T, proposed: T): Partial<T> =>
  Object.fromEntries(Object.entries(proposed).filter(([key, value]) => !Object.is(value, current[key]))) as Partial<T>;

export function buildProfileChangeProposal(current: ProfileSnapshot, proposed: ProfileSnapshot): ProfileChangeProposal {
  const employee = changedValues(current.employee, proposed.employee);
  const sensitive = changedValues(current.sensitive, proposed.sensitive);
  const relativesChanged = JSON.stringify(current.relatives) !== JSON.stringify(proposed.relatives);

  return {
    ...(Object.keys(employee).length ? { employee } : {}),
    ...(Object.keys(sensitive).length ? { sensitive } : {}),
    ...(relativesChanged ? { relatives: proposed.relatives } : {}),
  };
}

export const hasProfileChanges = (proposal: ProfileChangeProposal) => Object.keys(proposal).length > 0;
