import type { BffError } from "@/lib/types";

export function readErrorMessage(error: BffError): string {
  if (error.code === "FORBIDDEN") {
    return "Your security check expired or your role is no longer allowed. Refresh and try again.";
  }

  if (error.code === "VALIDATION_ERROR") {
    return error.message;
  }

  return error.status >= 500
    ? "The animal editor is temporarily unavailable. Please try again shortly."
    : error.message;
}
