import { TierPrecondition } from '../lib/tier-precondition.js';

export class OwnerOnlyPrecondition extends TierPrecondition {
  protected readonly required = 'owner' as const;
}
