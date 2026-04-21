"use client";

import React, { useState, FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { validatePassword } from "@/lib/passwordValidation";

type AuthView = "login" | "register" | "forgot-password" | "reset-password";

interface AuthFormsProps {
  initialView?: AuthView;
  onSuccess?: () => void;
}

/**
 * AuthForms component — handles registration, login, forgot-password, and
 * reset-password flows backed by Convex Auth.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.6
 */
export function AuthForms({ initialView = "login", onSuccess }: AuthFormsProps) {
  const { signIn } = useAuthActions();
  const [view, setView] = useState<AuthView>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setPasswordErrors([]);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (view === "register" || view === "reset-password") {
      const result = validatePassword(value);
      setPasswordErrors(result.valid ? [] : result.errors);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      await signIn("password", { email, password, flow: "signIn" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Client-side password validation (Req 11.2)
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordErrors(validation.errors);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await signIn("password", { email, password, name, flow: "signUp" });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      await signIn("password", { email, flow: "reset" });
      setSuccessMessage(
        "If an account exists for this email, a password reset link has been sent."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Validate new password complexity (Req 11.6)
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordErrors(validation.errors);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await signIn("password", { newPassword: password, flow: "reset-verification" });
      setSuccessMessage("Password reset successfully. You can now log in.");
      setView("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    clearMessages();
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setView(newView);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">POV Podcast</h1>
            <p className="text-gray-400 text-sm">
              {view === "login" && "Sign in to your account"}
              {view === "register" && "Create your account"}
              {view === "forgot-password" && "Reset your password"}
              {view === "reset-password" && "Set a new password"}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm"
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm"
            >
              {successMessage}
            </div>
          )}

          {/* Login Form */}
          {view === "login" && (
            <form onSubmit={handleLogin} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="you@example.com"
                    aria-label="Email address"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                    aria-label="Password"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchView("forgot-password")}
                    className="text-sm text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Sign in"
                >
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("register")}
                  className="text-indigo-400 hover:text-indigo-300 font-medium focus:outline-none focus:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {view === "register" && (
            <form onSubmit={handleRegister} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-gray-300 mb-1">
                    Name <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Your name"
                    aria-label="Name"
                  />
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="you@example.com"
                    aria-label="Email address"
                  />
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      passwordErrors.length > 0 ? "border-red-600" : "border-gray-700"
                    }`}
                    placeholder="••••••••"
                    aria-label="Password"
                    aria-describedby={passwordErrors.length > 0 ? "password-requirements" : undefined}
                  />
                  {/* Password requirements hint */}
                  <p className="mt-1 text-xs text-gray-500">
                    Min 8 characters, 1 uppercase, 1 lowercase, 1 digit
                  </p>
                  {passwordErrors.length > 0 && (
                    <ul
                      id="password-requirements"
                      role="alert"
                      aria-live="polite"
                      className="mt-1 space-y-0.5"
                    >
                      {passwordErrors.map((err, i) => (
                        <li key={i} className="text-xs text-red-400">
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm password
                  </label>
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                    aria-label="Confirm password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || passwordErrors.length > 0}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Create account"
                >
                  {isLoading ? "Creating account…" : "Create account"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-indigo-400 hover:text-indigo-300 font-medium focus:outline-none focus:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* Forgot Password Form */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword} noValidate>
              <p className="text-sm text-gray-400 mb-4">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="you@example.com"
                    aria-label="Email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Send reset link"
                >
                  {isLoading ? "Sending…" : "Send reset link"}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-400">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => switchView("login")}
                  className="text-indigo-400 hover:text-indigo-300 font-medium focus:outline-none focus:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* Reset Password Form */}
          {view === "reset-password" && (
            <form onSubmit={handleResetPassword} noValidate>
              <p className="text-sm text-gray-400 mb-4">
                Enter your new password below.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-gray-300 mb-1">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      passwordErrors.length > 0 ? "border-red-600" : "border-gray-700"
                    }`}
                    placeholder="••••••••"
                    aria-label="New password"
                    aria-describedby={passwordErrors.length > 0 ? "reset-password-requirements" : undefined}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Min 8 characters, 1 uppercase, 1 lowercase, 1 digit
                  </p>
                  {passwordErrors.length > 0 && (
                    <ul
                      id="reset-password-requirements"
                      role="alert"
                      aria-live="polite"
                      className="mt-1 space-y-0.5"
                    >
                      {passwordErrors.map((err, i) => (
                        <li key={i} className="text-xs text-red-400">
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                    aria-label="Confirm new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || passwordErrors.length > 0}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Reset password"
                >
                  {isLoading ? "Resetting…" : "Reset password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
