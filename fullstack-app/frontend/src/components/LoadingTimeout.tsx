"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface LoadingTimeoutProps {
  message?: string;
  onContinueAsGuest?: () => void;
  onRefresh?: () => void;
}

export function LoadingTimeout({
  message = "The application is taking longer than expected to load.",
  onContinueAsGuest,
  onRefresh = () => window.location.reload(),
}: LoadingTimeoutProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />

        <h2 className="text-2xl font-semibold">Loading Timeout</h2>

        <p className="text-gray-600">{message}</p>

        <div className="space-y-2">
          <Button onClick={onRefresh} className="w-full">
            Refresh Page
          </Button>

          {onContinueAsGuest && (
            <Button
              onClick={onContinueAsGuest}
              variant="outline"
              className="w-full"
            >
              Continue as Guest
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500">
          If this issue persists, please contact support.
        </p>
      </div>
    </div>
  );
}
