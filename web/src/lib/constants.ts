// Default forfeit beneficiary. Override in the create form per-commitment.
// A public-goods / burn-ish address makes forfeiting sting without enriching a
// specific counterparty. Set NEXT_PUBLIC_DEFAULT_BENEFICIARY to your own.
export const DEFAULT_BENEFICIARY = (process.env.NEXT_PUBLIC_DEFAULT_BENEFICIARY ??
  "0x000000000000000000000000000000000000dEaD") as `0x${string}`;
