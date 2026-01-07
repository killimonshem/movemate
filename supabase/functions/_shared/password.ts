// Password utility functions for authentication
// Supports bcrypt for new passwords and SHA-256 for legacy migration

import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 * Supports both bcrypt (new) and SHA-256 (legacy)
 * @param password Plain text password
 * @param hash Stored password hash
 * @returns Object with isValid flag and needsUpgrade flag
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<{ isValid: boolean; needsUpgrade: boolean }> {
  // Check if this is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  const isBcrypt = /^\$2[aby]\$/.test(hash);

  if (isBcrypt) {
    // Verify bcrypt hash
    const isValid = await bcrypt.compare(password, hash);
    return { isValid, needsUpgrade: false };
  } else {
    // Legacy SHA-256 hash - verify and mark for upgrade
    const isValid = await verifyLegacySHA256(password, hash);
    return { isValid, needsUpgrade: isValid }; // Upgrade if valid
  }
}

/**
 * Verify legacy SHA-256 password hash
 * Used for migrating from old super_admins table
 * @param password Plain text password
 * @param hash SHA-256 hash from legacy system
 * @returns True if password matches
 */
async function verifyLegacySHA256(
  password: string,
  hash: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex === hash.toLowerCase();
}

/**
 * Generate a secure random password
 * Used for temporary passwords when creating venue admins
 * @param length Password length (default 16)
 * @returns Random password
 */
export function generateRandomPassword(length: number = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

/**
 * Validate password strength
 * @param password Plain text password
 * @returns Object with isValid flag and error message
 */
export function validatePasswordStrength(
  password: string
): { isValid: boolean; error?: string } {
  if (password.length < 12) {
    return {
      isValid: false,
      error: "Password must be at least 12 characters long",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  return { isValid: true };
}
