
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash password if provided
    let password_hash: string | null = null;
    if (input.password) {
      password_hash = await Bun.password.hash(input.password);
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        google_id: input.google_id || null,
        name: input.name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
