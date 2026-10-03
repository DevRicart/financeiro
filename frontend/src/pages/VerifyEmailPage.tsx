import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ResendVerification } from "../components/auth/ResendVerification";
import { Button } from "../components/ui/Button";
import { authService } from "../services/auth.service";

type Status = "verifying" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">Confirmando…</h1>
        <p className="text-sm text-cinza dark:text-papel/70">Só um instante, estamos confirmando seu e-mail.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">E-mail confirmado</h1>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-cinza dark:text-papel/70">Pronto! Sua conta está ativa. Agora é só entrar.</p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl font-medium text-tinta dark:text-papel">Link inválido ou expirado</h1>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-cinza dark:text-papel/70">
          Esse link de confirmação não vale mais. Informe seu e-mail para receber um novo.
        </p>
        <ResendVerification />
        <Link to="/login" className="text-center text-sm font-medium text-petroleo underline dark:text-luz">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
