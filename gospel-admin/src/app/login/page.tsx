"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import VerificationCodeInput from "@/components/VerificationCodeInput";
import { logger } from "@/lib/logger";

// ============================================================================
// Login Flow Component
// ============================================================================

function LoginCodeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  
  // Code verification state
  const [codeId, setCodeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [code, setCode] = useState("");
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Check for errors from URL parameters
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  // ============================================================================
  // Step 1: Send Verification Code
  // ============================================================================

  const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // First, check if the user exists in the database
      const checkResponse = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!checkResponse.ok) {
        throw new Error("Failed to verify user");
      }

      const { exists } = await checkResponse.json();

      if (!exists) {
        logger.warn("Login attempt for non-existent user:", email);
        setError(
          "This email is not authorized to access the system. Please contact your counselor for access."
        );
        return;
      }

      // User exists, send verification code
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          actionType: "user_login",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      // Store code metadata
      setCodeId(data.codeId);
      setExpiresAt(data.expiresAt);
      
      // Move to code entry step
      setStep("code");
      setSuccess(`Verification code sent to ${email}`);
      
      logger.info("Verification code sent:", email);
    } catch (err) {
      logger.error("Failed to send verification code:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Step 2: Verify Code
  // ============================================================================

  const handleVerifyCode = async (verificationCode: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
          actionType: "user_login",
        }),
      });

      const data = await response.json();

      // Handle invalid codes
      if (!response.ok || !data.valid) {
        const errorMessages: Record<string, string> = {
          INVALID_CODE: "Invalid verification code. Please check and try again.",
          CODE_EXPIRED: "This code has expired. Please request a new one.",
          CODE_USED: "This code has already been used. Please request a new one.",
          USER_NOT_FOUND: "Account not found. Please contact support.",
        };

        setError(errorMessages[data.errorCode] || data.error || "Verification failed");
        setCode(""); // Clear the code input
        return;
      }

      // Check for new user requiring signup
      if (data.newUser) {
        setError("Account setup required. Please contact your administrator.");
        return;
      }

      // Success! Redirect to appropriate page
      logger.info("Login successful:", email);
      setSuccess("Login successful! Redirecting...");
      
      // Redirect after short delay
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (err) {
      logger.error("Verification error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setCode(""); // Clear the code input
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Resend Code
  // ============================================================================

  const handleResendCode = async () => {
    setError(null);
    setSuccess(null);
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          actionType: "user_login",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      // Update code metadata
      setCodeId(data.codeId);
      setExpiresAt(data.expiresAt);
      setCode(""); // Clear the code input
      
      setSuccess("New verification code sent!");
      logger.info("Verification code resent:", email);
    } catch (err) {
      logger.error("Failed to resend code:", err);
      setError(
        err instanceof Error ? err.message : "Failed to resend code"
      );
    } finally {
      setIsResending(false);
    }
  };

  // ============================================================================
  // Handle Code Expiration
  // ============================================================================

  const handleCodeExpired = () => {
    setError("Your verification code has expired. Please request a new one.");
    setCode("");
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Gospel Presentation
          </h1>
          <p className="text-slate-600">
            {step === "email"
              ? "Sign in with a verification code"
              : "Enter the code sent to your email"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 border border-slate-200">
          {/* Success/Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  autoComplete="email username"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border border-slate-600"
              >
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* Step 2: Code Input */}
          {step === "code" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Sending to</span>
                  <span className="text-sm font-medium text-slate-900">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                    setSuccess(null);
                    setCode("");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 text-center">
                  Enter 6-digit code
                </label>
                <VerificationCodeInput
                  length={6}
                  onComplete={handleVerifyCode}
                  onChange={setCode}
                  expiresAt={expiresAt || undefined}
                  onExpired={handleCodeExpired}
                  disabled={isLoading}
                  error={!!error}
                  errorMessage={error || undefined}
                  loading={isLoading}
                  autoFocus={true}
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-3">
                <p className="text-sm text-slate-500">Didn&apos;t receive the code?</p>
                <button
                  onClick={handleResendCode}
                  disabled={isResending || isLoading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {isResending ? "Resending..." : "Resend Code"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Gospel Presentation
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-slate-600">
          <p>Need access? Contact your counselor.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Component (with Suspense boundary)
// ============================================================================

export default function LoginCodePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginCodeForm />
    </Suspense>
  );
}
