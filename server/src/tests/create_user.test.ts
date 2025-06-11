
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs
const testInputWithPassword: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

const testInputWithGoogle: CreateUserInput = {
  email: 'google@example.com',
  google_id: 'google123',
  name: 'Google User'
};

const testInputPasswordOnly: CreateUserInput = {
  email: 'password@example.com',
  password: 'securepass',
  name: 'Password User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with password', async () => {
    const result = await createUser(testInputWithPassword);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.password_hash).toBeTruthy();
    expect(result.google_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with google_id', async () => {
    const result = await createUser(testInputWithGoogle);

    // Basic field validation
    expect(result.email).toEqual('google@example.com');
    expect(result.name).toEqual('Google User');
    expect(result.google_id).toEqual('google123');
    expect(result.password_hash).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInputWithPassword);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeTruthy();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testInputPasswordOnly);

    // Password should be hashed
    expect(result.password_hash).toBeTruthy();
    expect(result.password_hash).not.toEqual('securepass');
    expect(result.password_hash!.length).toBeGreaterThan(10);

    // Verify password can be verified
    const isValid = await Bun.password.verify('securepass', result.password_hash!);
    expect(isValid).toBe(true);

    // Wrong password should fail
    const isInvalid = await Bun.password.verify('wrongpass', result.password_hash!);
    expect(isInvalid).toBe(false);
  });

  it('should handle user without password', async () => {
    const inputWithoutPassword: CreateUserInput = {
      email: 'nopass@example.com',
      name: 'No Password User'
    };

    const result = await createUser(inputWithoutPassword);

    expect(result.email).toEqual('nopass@example.com');
    expect(result.name).toEqual('No Password User');
    expect(result.password_hash).toBeNull();
    expect(result.google_id).toBeNull();
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInputWithPassword);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'different123',
      name: 'Different User'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique|duplicate/i);
  });
});
