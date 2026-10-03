import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { RegisterPage } from "./RegisterPage";

vi.mock("../hooks/useAuth");
vi.mock("../services/auth.service");

const mockedUseAuth = vi.mocked(useAuth);

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome"), "Ana");
  await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
  await user.type(screen.getByLabelText("Senha"), "SenhaForte123");
  await user.type(screen.getByLabelText("Confirmar senha"), "SenhaForte123");
  await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("RegisterPage", () => {
  const register = vi.fn();

  beforeEach(() => {
    register.mockReset();
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it("asks the person to confirm their e-mail instead of sending them into the app", async () => {
    register.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillAndSubmit(user);

    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail" })).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith({
      preferred_name: "Ana",
      email: "ana@example.com",
      password: "SenhaForte123",
    });
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login");
  });

  it("stays on the form and shows the server message when sign-up is rejected", async () => {
    register.mockRejectedValue(new Error("duplicate"));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillAndSubmit(user);

    expect(await screen.findByText("Não foi possível criar a conta.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Confirme seu e-mail" })).not.toBeInTheDocument());
  });
});
