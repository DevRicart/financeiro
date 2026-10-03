import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";
import { LoginPage } from "./LoginPage";

vi.mock("../hooks/useAuth");
vi.mock("../services/auth.service");

const mockedUseAuth = vi.mocked(useAuth);
const mockedAuthService = vi.mocked(authService);

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/dashboard" element={<div>Dashboard carregado</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  const login = vi.fn();

  beforeEach(() => {
    login.mockReset();
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("shows a validation error for an invalid email and never calls login", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("logs in with the typed credentials and navigates to the dashboard", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "SenhaForte123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("ana@example.com", "SenhaForte123"));
    expect(await screen.findByText("Dashboard carregado")).toBeInTheDocument();
  });

  it("shows the server error message and stays on the login page when login rejects", async () => {
    login.mockRejectedValue(new Error("bad credentials"));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "senhaerrada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard carregado")).not.toBeInTheDocument();
  });

  it("offers to resend the confirmation e-mail when the account isn't verified yet", async () => {
    login.mockRejectedValue(
      new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 403,
        data: { detail: "Confirme seu e-mail para entrar.", code: "email_not_verified" },
      } as AxiosResponse),
    );
    mockedAuthService.resendVerification.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "SenhaForte123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Confirme seu e-mail para entrar.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));
    expect(mockedAuthService.resendVerification).toHaveBeenCalledWith("ana@example.com");
  });

  it("doesn't offer a resend for an ordinary wrong password", async () => {
    login.mockRejectedValue(
      new AxiosError("Unauthorized", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 401,
        data: { detail: "E-mail ou senha inválidos." },
      } as AxiosResponse),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenviar e-mail de confirmação" })).not.toBeInTheDocument();
  });

  it("links to the register page", () => {
    renderLoginPage();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/register");
  });
});
