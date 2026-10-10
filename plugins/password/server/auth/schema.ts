import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const PasswordSchema = BaseSchema.extend({
  body: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
  }),
});

export type PasswordReq = z.infer<typeof PasswordSchema>;
