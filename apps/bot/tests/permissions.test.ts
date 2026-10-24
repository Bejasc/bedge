import { describe, it, expect } from 'vitest';
import { resolveTier, tierAtLeast, type TierSubject } from '../src/lib/permissions.js';

const OWNER = '1';
const roles = { modRoleId: 'mod-role', adminRoleId: 'admin-role' };

function member(overrides: Partial<TierSubject> = {}): TierSubject {
  return { id: '42', roleIds: [], isAdministrator: false, ...overrides };
}

describe('resolveTier', () => {
  it('returns owner for the owner ID regardless of roles', () => {
    expect(resolveTier(member({ id: OWNER }), roles, OWNER)).toBe('owner');
    expect(resolveTier(member({ id: OWNER }), null, OWNER)).toBe('owner');
  });

  it('returns admin for the admin role and mod for the mod role', () => {
    expect(resolveTier(member({ roleIds: ['admin-role'] }), roles, OWNER)).toBe('admin');
    expect(resolveTier(member({ roleIds: ['mod-role'] }), roles, OWNER)).toBe('mod');
  });

  it('prefers admin when a member has both roles', () => {
    expect(resolveTier(member({ roleIds: ['mod-role', 'admin-role'] }), roles, OWNER)).toBe('admin');
  });

  it('returns none for a member with no tier role', () => {
    expect(resolveTier(member({ roleIds: ['other'] }), roles, OWNER)).toBe('none');
  });

  it('treats Administrator as admin only while no admin role is configured', () => {
    expect(resolveTier(member({ isAdministrator: true }), { modRoleId: 'mod-role' }, OWNER)).toBe('admin');
    expect(resolveTier(member({ isAdministrator: true }), null, OWNER)).toBe('admin');
    expect(resolveTier(member({ isAdministrator: true }), roles, OWNER)).toBe('none');
  });

  it('returns none when no roles are configured and the member is not an Administrator', () => {
    expect(resolveTier(member({ roleIds: ['mod-role'] }), {}, OWNER)).toBe('none');
  });
});

describe('tierAtLeast', () => {
  it('orders owner > admin > mod > none', () => {
    expect(tierAtLeast('owner', 'admin')).toBe(true);
    expect(tierAtLeast('admin', 'mod')).toBe(true);
    expect(tierAtLeast('mod', 'mod')).toBe(true);
    expect(tierAtLeast('mod', 'admin')).toBe(false);
    expect(tierAtLeast('none', 'mod')).toBe(false);
    expect(tierAtLeast('none', 'none')).toBe(true);
  });
});
