import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authService } from "../../services/auth.service";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const COOLDOWN_SECONDS = 60;
const emailSchema = z.string().email();

interface ResendVerificationProps {
  /** When already known (just signed up, or just refused at login) the person isn't asked for it again. */
  email?: string;
}

export function ResendVerification({ email }: ResendVerificationProps) {
  const [typedEmail, setTypedEmail] = useState("");
  const [isSending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const isCoolingDown = secondsLeft > 0;

  useEffect(() => {
    if (!isCoolingDown) return;
    const interval = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [isCoolingDown]);

  const address = email ?? typedEmail.trim();

  const handleResend = async () => {
    setError(null);
    if (!emailSchema.safeParse(address).success) {
      setError("Informe um e-mail válido.");
      return;
    }

    setSending(true);
    try {
      await authService.resendVerification(address);
      setSent(true);
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof AxiosError && err.response?.status === 429
          ? "Muitas tentativas. Aguarde um pouco e tente de novo."
          : "Não foi possível enviar o e-mail agora. Tente de novo em instantes.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {email === undefined && (
        <Input
          label="E-mail"
          name="resend-email"
          type="email"
          autoComplete="email"
          value={typedEmail}
          onChange={(event) => setTypedEmail(event.target.value)}
        />
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleResend}
        isLoading={isSending}
        disabled={isCoolingDown}
      >
        {isCoolingDown ? `Reenviar em ${secondsLeft}s` : "Reenviar e-mail de confirmação"}
      </Button>
      {sent && (
        <p role="status" className="text-sm text-petroleo dark:text-luz">
          Enviamos um novo link. Confira também a caixa de spam.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-despesa">
          {error}
        </p>
      )}
    </div>
  );
}
