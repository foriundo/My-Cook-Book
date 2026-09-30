import { describe, expect, it } from 'vitest';
import { canView } from '../lib/permissions';

describe('recipe visibility permissions', () => {
  it('allows owners to view private recipes', () => {
    expect(canView({ isOwner: true, isLoggedIn: true, isFriend: false, visibility: 'PRIVATE' })).toBe(true);
  });

  it('denies anonymous access to private recipes', () => {
    expect(canView({ isOwner: false, isLoggedIn: false, isFriend: false, visibility: 'PRIVATE' })).toBe(false);
  });

  it('allows public and unlisted recipes to link holders', () => {
    for (const visibility of ['PUBLIC', 'UNLISTED']) {
      expect(canView({ isOwner: false, isLoggedIn: false, isFriend: false, visibility })).toBe(true);
    }
  });

  it('restricts friends recipes to accepted friends or direct shares', () => {
    expect(canView({ isOwner: false, isLoggedIn: true, isFriend: false, visibility: 'FRIENDS' })).toBe(false);
    expect(canView({ isOwner: false, isLoggedIn: true, isFriend: true, visibility: 'FRIENDS' })).toBe(true);
    expect(canView({ isOwner: false, isLoggedIn: true, isFriend: false, isShared: true, visibility: 'FRIENDS' })).toBe(true);
  });
});