"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface VerificationCodeInputProps {
  /** Length of the verification code (4, 6, or 8 digits) */
  length?: number;
  /** Callback when code is complete */
  onComplete: (code: string) => void;
  /** Callback when code changes */
  onChange?: (code: string) => void;
  /** Expiration time (ISO string) */
  expiresAt?: string;
  /** Callback when code expires */
  onExpired?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to show error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function VerificationCodeInput({
  length = 6,
  onComplete,
  onChange,
  expiresAt,
  onExpired,
  disabled = false,
  error = false,
  errorMessage,
  autoFocus = true,
  loading = false,
}: VerificationCodeInputProps) {
  const [code, setCode] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate initial time remaining
  const calculateTimeRemaining = useCallback(() => {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const remaining = Math.max(0, expires - now);
    return Math.floor(remaining / 1000); // Convert to seconds
  }, [expiresAt]);

  // Initialize with lazy state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() =>
    calculateTimeRemaining()
  );

  // Update time remaining on interval
  useEffect(() => {
    if (!expiresAt) return;

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired, calculateTimeRemaining]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Only allow numeric input
      const numericValue = value.replace(/\D/g, "");

      // Limit to specified length
      const truncatedValue = numericValue.slice(0, length);

      setCode(truncatedValue);
      onChange?.(truncatedValue);

      // Call onComplete when code is complete
      if (truncatedValue.length === length) {
        onComplete(truncatedValue);
      }
    },
    [length, onComplete, onChange]
  );

  // Handle paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");
      const numericValue = pastedData.replace(/\D/g, "").slice(0, length);

      setCode(numericValue);
      onChange?.(numericValue);

      if (numericValue.length === length) {
        onComplete(numericValue);
      }
    },
    [length, onComplete, onChange]
  );

  // Handle key down (for backspace, etc.)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (
      [8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: Cmd+A, Cmd+C, Cmd+V, Cmd+X (Mac)
      (e.keyCode === 65 && e.metaKey === true) ||
      (e.keyCode === 67 && e.metaKey === true) ||
      (e.keyCode === 86 && e.metaKey === true) ||
      (e.keyCode === 88 && e.metaKey === true)
    ) {
      return;
    }

    // Prevent non-numeric input
    if (
      (e.keyCode < 48 || e.keyCode > 57) && // 0-9
      (e.keyCode < 96 || e.keyCode > 105) // numpad 0-9
    ) {
      e.preventDefault();
    }
  }, []);

  // Clear code
  const clearCode = useCallback(() => {
    setCode("");
    onChange?.("");
    inputRef.current?.focus();
  }, [onChange]);

  // Check if expired
  const isExpired = timeRemaining !== null && timeRemaining === 0;

  return (
    <div className="verification-code-input">
      {/* Single visible input field */}
      <div className="code-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          value={code}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={disabled || isExpired || loading}
          className={`code-input ${error ? "error" : ""} ${disabled || isExpired ? "disabled" : ""}`}
          autoComplete="one-time-code"
          aria-label="Verification code"
          placeholder={`Enter ${length}-digit code`}
        />
        {loading && (
          <div className="input-loading-spinner" />
        )}
      </div>

      {/* Timer display */}
      {timeRemaining !== null && (
        <div className={`timer ${isExpired ? "expired" : ""}`}>
          {isExpired ? (
            <span className="expired-text">Code expired</span>
          ) : (
            <span>
              Code expires in <strong>{formatTimeRemaining(timeRemaining)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && errorMessage && (
        <div className="error-message" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Clear button */}
      {code.length > 0 && !disabled && !isExpired && (
        <button
          type="button"
          onClick={clearCode}
          className="clear-button"
          aria-label="Clear code"
        >
          Clear
        </button>
      )}

      <style jsx>{`
        .verification-code-input {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .code-input-wrapper {
          position: relative;
          width: 100%;
          max-width: 320px;
        }

        .code-input {
          width: 100%;
          padding: 16px 20px;
          font-size: 24px;
          font-weight: 600;
          font-family: "Courier New", monospace;
          text-align: center;
          letter-spacing: 8px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background-color: #ffffff;
          transition: all 0.2s ease;
        }

        .code-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .code-input.error {
          border-color: #fc8181;
          background-color: #fff5f5;
        }

        .code-input.disabled {
          background-color: #edf2f7;
          border-color: #cbd5e0;
          color: #a0aec0;
          cursor: not-allowed;
        }

        .code-input::placeholder {
          font-size: 16px;
          letter-spacing: normal;
          color: #cbd5e0;
        }

        .input-loading-spinner {
          position: absolute;
          right: 16px;
          top: 50%;
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top-color: #3182ce;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          from {
            transform: translateY(-50%) rotate(0deg);
          }
          to {
            transform: translateY(-50%) rotate(360deg);
          }
        }

        .timer {
          font-size: 14px;
          color: #718096;
          text-align: center;
        }

        .timer.expired {
          color: #c53030;
          font-weight: 600;
        }

        .timer strong {
          color: #2d3748;
          font-weight: 600;
        }

        .error-message {
          color: #c53030;
          font-size: 14px;
          text-align: center;
          padding: 8px 16px;
          background-color: #fff5f5;
          border-radius: 6px;
          border: 1px solid #fc8181;
        }

        .clear-button {
          font-size: 14px;
          color: #4a5568;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .clear-button:hover {
          color: #2d3748;
        }

        .clear-button:active {
          color: #1a202c;
        }

        @media (max-width: 640px) {
          .code-input {
            font-size: 20px;
            padding: 14px 16px;
            letter-spacing: 6px;
          }

          .code-input-wrapper {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
