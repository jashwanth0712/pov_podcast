/**
 * Password complexity validation.
 * Enforces: min 8 chars, ≥1 uppercase ASCII letter, ≥1 lowercase ASCII letter, ≥1 ASCII digit.
 *
 * Requirement 11.2
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns true if the password meets all complexity requirements.
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).valid;
}
