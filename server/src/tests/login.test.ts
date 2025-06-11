
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { createHash } from 'crypto';

// Helper function to hash password (same as in handler)
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

// Test input
const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create user with hashed password
    const passwordHash = hashPassword(testLoginInput.password);
    const testUser = await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: passwordHash,
        name: 'Test User'
      })
      .returning()
      .execute();

    const result = await login(testLoginInput);

    expect(result.id).toBe(testUser[0].id);
    expect(result.email).toBe(testLoginInput.email);
    expect(result.name).toBe('Test User');
    expect(result.password_hash).toBe(passwordHash);
    expect(result.google_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    await expect(login(testLoginInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create user with different password
    const passwordHash = hashPassword('differentpassword');
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: passwordHash,
        name: 'Test User'
      })
      .execute();

    await expect(login(testLoginInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for Google-only user (no password hash)', async () => {
    // Create user with Google ID but no password hash
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        google_id: 'google123',
        name: 'Google User'
      })
      .execute();

    await expect(login(testLoginInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should handle null password hash', async () => {
    // Create user with null password hash
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: null,
        name: 'Test User'
      })
      .execute();

    await expect(login(testLoginInput))
      .rejects.toThrow(/invalid email or password/i);
  });
});
