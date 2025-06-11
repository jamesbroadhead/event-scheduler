
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleLoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const googleLogin = async (input: GoogleLoginInput): Promise<User> => {
  try {
    // First, check if user already exists by google_id
    const existingUserByGoogleId = await db.select()
      .from(usersTable)
      .where(eq(usersTable.google_id, input.google_id))
      .execute();

    if (existingUserByGoogleId.length > 0) {
      return existingUserByGoogleId[0];
    }

    // Check if user exists by email (user might have signed up with password first)
    const existingUserByEmail = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUserByEmail.length > 0) {
      // Update existing user with google_id
      const updatedUser = await db.update(usersTable)
        .set({
          google_id: input.google_id,
          name: input.name // Update name in case it changed
        })
        .where(eq(usersTable.id, existingUserByEmail[0].id))
        .returning()
        .execute();

      return updatedUser[0];
    }

    // Create new user
    const newUser = await db.insert(usersTable)
      .values({
        email: input.email,
        google_id: input.google_id,
        name: input.name,
        password_hash: null // Google users don't have passwords
      })
      .returning()
      .execute();

    return newUser[0];
  } catch (error) {
    console.error('Google login failed:', error);
    throw error;
  }
};
