import { z } from "zod";
import { normalizeStateCode } from "./us-state-taxes";

export const billingStateSchema = z
  .string()
  .trim()
  .length(2, "Select a valid US billing state.")
  .transform((value) => value.toUpperCase())
  .refine((value) => normalizeStateCode(value) != null, {
    message: "Select a valid US billing state.",
  });

export const optionalBillingStateSchema = billingStateSchema.optional();
