import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../services/auth.service";
import { ResendVerification } from "./ResendVerification";

vi.mock("../../services/auth.service");

const mockedAuthService = vi.mocked(authService);

describe("ResendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resends to the known address without asking for it again", async () => {
    mockedAuthService.resendVerification.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResendVerification email="ana@example.com" />);

    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    expect(mockedAuthService.resendVerification).toHaveBeenCalledWith("ana@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent("Enviamos um novo link");
  });

  it("locks the button for a minute after sending, with a countdown", async () => {
    mockedAuthService.resendVerification.mockResolvedValue(undefined);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ResendVerification email="ana@example.com" />);

    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));
    const button = await screen.findByRole("button", { name: "Reenviar em 60s" });
    expect(button).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeEnabled();
  });

  it("asks for the e-mail when it isn't known, and refuses an invalid one", async () => {
    const user = userEvent.setup();
    render(<ResendVerification />);

    await user.type(screen.getByLabelText("E-mail"), "nao-e-email");
    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Informe um e-mail válido.");
    expect(mockedAuthService.resendVerification).not.toHaveBeenCalled();
  });

  it("sends the typed address when it isn't known up front", async () => {
    mockedAuthService.resendVerification.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResendVerification />);

    await user.type(screen.getByLabelText("E-mail"), " ana@example.com ");
    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    expect(mockedAuthService.resendVerification).toHaveBeenCalledWith("ana@example.com");
  });

  it("explains a rate-limit rejection instead of showing a generic failure", async () => {
    mockedAuthService.resendVerification.mockRejectedValue(
      new AxiosError("Too Many Requests", "ERR_BAD_REQUEST", undefined, undefined, { status: 429 } as AxiosResponse),
    );
    const user = userEvent.setup();
    render(<ResendVerification email="ana@example.com" />);

    await user.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
