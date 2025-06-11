
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleLoginInput } from '../schema';
import { googleLogin } from '../handlers/google_login';
import { eq } from 'drizzle-orm';

const testGoogleInput: GoogleLoginInput = {
  google_id: 'google123456',
  email: 'test@example.com',
  name: 'Test User'
};

describe('googleLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new user when google user does not exist', async () => {
    const result = await googleLogin(testGoogleInput);

    expect(result.email).toEqual('test@example.com');
    expect(result.google_id).toEqual('google123456');
    expect(result.name).toEqual('Test User');
    expect(result.password_hash).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should return existing user when google_id matches', async () => {
    // Create user first
    const firstLogin = await googleLogin(testGoogleInput);

    // Login again with same google_id
    const secondLogin = await googleLogin(testGoogleInput);

    expect(secondLogin.id).toEqual(firstLogin.id);
    expect(secondLogin.email).toEqual('test@example.com');
    expect(secondLogin.google_id).toEqual('google123456');
    expect(secondLogin.name).toEqual('Test User');
  });

  it('should link google account to existing email user', async () => {
    // Create user with password first
    const existingUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Original Name',
        google_id: null
      })
      .returning()
      .execute();

    // Login with Google using same email
    const result = await googleLogin(testGoogleInput);

    expect(result.id).toEqual(existingUser[0].id);
    expect(result.email).toEqual('test@example.com');
    expect(result.google_id).toEqual('google123456');
    expect(result.name).toEqual('Test User'); // Name should be updated
    expect(result.password_hash).toEqual('hashed_password'); // Password should remain
  });

  it('should save user to database correctly', async () => {
    const result = await googleLogin(testGoogleInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].google_id).toEqual('google123456');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeNull();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should update existing user google_id when email matches', async () => {
    // Create user without google_id
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'existing_password',
        name: 'Existing User',
        google_id: null
      })
      .execute();

    // Login with Google
    await googleLogin(testGoogleInput);

    // Verify user was updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].google_id).toEqual('google123456');
    expect(users[0].name).toEqual('Test User'); // Name updated
    expect(users[0].password_hash).toEqual('existing_password'); // Password preserved
  });
});
