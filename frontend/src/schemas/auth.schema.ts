import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    preferred_name: z.string().min(1, "Informe seu nome"),
    email: z.string().email("E-mail inválido"),
    username: z.string().min(3, "Mínimo de 3 caracteres"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;
