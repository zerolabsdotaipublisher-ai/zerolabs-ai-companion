import { z } from "zod";

export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const emailSchema = z.string().email();

export function normalizeLoginValues(values: LoginFormValues): LoginFormValues {
  return {
    email: values.email.trim(),
    password: values.password,
  };
}

function isValidEmailFormat(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateLoginValues(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const normalizedValues = normalizeLoginValues(values);

  if (!normalizedValues.email) {
    errors.email = "Email is required.";
  } else if (!isValidEmailFormat(normalizedValues.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!normalizedValues.password) {
    errors.password = "Password is required.";
  }

  return errors;
}
