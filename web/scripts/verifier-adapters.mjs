import { parseGithubSpec } from './verification.mjs';

// The contract's createdAt/deadline are authoritative. Future startTime can
// narrow the interval but can never admit activity preceding activation.
export function parseExternalSpec(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Invalid verification configuration');
  const input = JSON.parse(raw);
  if (input.version !== undefined && input.version !== 1) throw new Error('Unsupported verification version');
  if (input.startTime !== undefined && (!Number.isSafeInteger(input.startTime) || input.startTime < 0)) throw new Error('Invalid verification start');
  if (input.type === 'github') return parseGithubSpec(raw);
  if (input.type === 'onchain' && input.rule === 'contract-call' && /^0x[0-9a-fA-F]{40}$/.test(input.contract) && !/^0x0{40}$/i.test(input.contract) && input.count === 1) return input;
  throw new Error('Unsupported verification method');
}
export function verificationWindow(spec, createdAt, deadline) {
  const start = Math.max(createdAt, spec.startTime ?? createdAt);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(deadline) || start >= deadline) throw new Error('Invalid verification window');
  return { start, deadline };
}
export function requiredProgress(spec) { return spec.type === 'github' ? spec.commits : spec.count; }
export const verifierAdapters = {
  github: { label: 'GitHub activity', execution: 'external' },
  onchain: { label: 'Onchain activity', execution: 'external' },
  balance: { label: 'Wallet balance', execution: 'native' },
  manual: { label: 'Community review', execution: 'community' },
};
