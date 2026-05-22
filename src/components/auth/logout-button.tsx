"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getStateChangingAuthHeaders } from "@/lib/auth/origin";

type LogoutButtonProps = {
  autoSubmit?: boolean;
  className: string;
  idleLabel: string;
  pendingLabel: string;
};

const LOGOUT_ERROR_MESSAGE =
  "We couldn’t sign you out right now. Please try again.";

export function LogoutButton({
  autoSubmit = false,
  className,
  idleLabel,
  pendingLabel,
}: LogoutButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submitInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: getStateChangingAuthHeaders(),
      });

      if (!response.ok) {
        setErrorMessage(LOGOUT_ERROR_MESSAGE);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage(LOGOUT_ERROR_MESSAGE);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!autoSubmit) {
      return;
    }

    queueMicrotask(() => {
      buttonRef.current?.click();
    });
  }, [autoSubmit]);

  return (
    <div className="space-y-3">
      <button
        className={className}
        disabled={isSubmitting}
        onClick={() => void handleSubmit()}
        ref={buttonRef}
        type="button"
      >
        {isSubmitting ? pendingLabel : idleLabel}
      </button>
      {errorMessage ? (
        <p
          aria-live="assertive"
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
