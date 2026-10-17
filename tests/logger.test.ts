import { describe, it, expect } from 'vitest';
import { errorMessage } from '../src/shared/lib/logger';

describe('errorMessage', () => {
  it('mengambil message dari Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('mengambil message dari objek biasa', () => {
    expect(errorMessage({ message: 'objek rusak' })).toBe('objek rusak');
  });

  it('fallback untuk null/undefined', () => {
    expect(errorMessage(null)).toBe('');
    expect(errorMessage(undefined)).toBe('');
    expect(errorMessage(null, 'cadangan')).toBe('cadangan');
  });

  it('fallback bila message bukan string', () => {
    expect(errorMessage({ message: 123 })).toBe('');
    expect(errorMessage('string mentah')).toBe('');
    expect(errorMessage({ message: '' }, 'fb')).toBe('fb');
  });
});
