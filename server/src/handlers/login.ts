
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

// Simple password hashing function using Node.js crypto
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password: string, hash: string): boolean => {
  const passwordHash = hashPassword(password);
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(Buffer.from(passwordHash), Buffer.from(hash));
};

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user has a password hash (not a Google-only user)
    if (!user.password_hash) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Return user data
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      google_id: user.google_id,
      name: user.name,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
