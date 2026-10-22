import { TierPrecondition } from '../lib/tier-precondition.js';

export class ModTierPrecondition extends TierPrecondition {
  protected readonly required = 'mod' as const;
}
