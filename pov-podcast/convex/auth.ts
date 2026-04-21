import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Password complexity validator.
 * Enforces: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit.
 * Requirement 11.2
 */
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one digit." };
  }
  return { valid: true };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
      validatePasswordRequirements(password: string) {
        const result = validatePasswordComplexity(password);
        if (!result.valid) {
          throw new Error(result.error);
        }
      },
    }),
  ],
});
