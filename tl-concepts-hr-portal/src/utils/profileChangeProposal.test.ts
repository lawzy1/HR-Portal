import assert from 'node:assert/strict';
import { buildProfileChangeProposal } from './profileChangeProposal.ts';

const current = {
  employee: { phone: '0900000000', dob: null },
  sensitive: { bank_name: 'VCB' },
  relatives: [{ full_name: 'Nguyễn Văn A', relationship: 'Cha', phone: '', address: '', is_emergency_contact: true }],
};

assert.deepEqual(buildProfileChangeProposal(current, current), {});
assert.deepEqual(buildProfileChangeProposal(current, {
  ...current,
  employee: { ...current.employee, phone: '0911111111' },
}), { employee: { phone: '0911111111' } });
