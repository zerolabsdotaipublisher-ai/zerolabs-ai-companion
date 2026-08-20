import { z } from "zod";

export type SignupFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>;

export const MIN_PASSWORD_LENGTH = 8;
const emailSchema = z.string().email();

export function normalizeSignupValues(values: SignupFormValues): SignupFormValues {
  return {
    email: values.email.trim(),
    password: values.password,
    confirmPassword: values.confirmPassword,
  };
}

function isValidEmailFormat(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateSignupValues(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};
  const normalizedValues = normalizeSignupValues(values);

  if (!normalizedValues.email) {
    errors.email = "Email is required.";
  } else if (!isValidEmailFormat(normalizedValues.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!normalizedValues.password) {
    errors.password = "Password is required.";
  } else if (normalizedValues.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!normalizedValues.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (normalizedValues.confirmPassword !== normalizedValues.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
