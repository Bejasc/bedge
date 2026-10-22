import { TierPrecondition } from '../lib/tier-precondition.js';

export class AdminTierPrecondition extends TierPrecondition {
  protected readonly required = 'admin' as const;
}
