import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../services/auth.service";
import { VerifyEmailPage } from "./VerifyEmailPage";

vi.mock("../services/auth.service");

const mockedAuthService = vi.mocked(authService);

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms the e-mail with the token from the link and offers to sign in", async () => {
    mockedAuthService.verifyEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt("/verify-email?token=abc%3Adef");

    expect(await screen.findByRole("heading", { name: "E-mail confirmado" })).toBeInTheDocument();
    expect(mockedAuthService.verifyEmail).toHaveBeenCalledTimes(1);
    expect(mockedAuthService.verifyEmail).toHaveBeenCalledWith("abc:def");

    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("offers a new link when the token is rejected", async () => {
    mockedAuthService.verifyEmail.mockRejectedValue(new Error("400"));
    renderAt("/verify-email?token=velho");

    expect(await screen.findByRole("heading", { name: "Link inválido ou expirado" })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeInTheDocument();
  });

  it("goes straight to the failure state, without calling the API, when there is no token", () => {
    renderAt("/verify-email");

    expect(screen.getByRole("heading", { name: "Link inválido ou expirado" })).toBeInTheDocument();
    expect(mockedAuthService.verifyEmail).not.toHaveBeenCalled();
  });
});
