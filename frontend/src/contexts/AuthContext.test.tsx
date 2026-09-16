import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { tokenStorage } from "../services/api";
import { authService } from "../services/auth.service";
import type { User } from "../types/auth";
import { AuthProvider } from "./AuthContext";

vi.mock("../services/auth.service");
vi.mock("../services/api", () => ({
  tokenStorage: {
    getAccess: vi.fn(),
    getRefresh: vi.fn(),
    setTokens: vi.fn(),
    clear: vi.fn(),
  },
}));

const mockedAuthService = vi.mocked(authService);
const mockedTokenStorage = vi.mocked(tokenStorage);

const fakeUser: User = {
  id: 1,
  email: "ana@example.com",
  username: "ana",
  preferred_name: "Ana",
  avatar: null,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  date_joined: "2026-01-01T00:00:00Z",
};

function Probe() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => login("ana@example.com", "senha")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no user and stops loading when there is no stored token", async () => {
    mockedTokenStorage.getAccess.mockReturnValue(null);
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(mockedAuthService.me).not.toHaveBeenCalled();
  });

  it("loads the current user when a token is already stored", async () => {
    mockedTokenStorage.getAccess.mockReturnValue("fake-token");
    mockedAuthService.me.mockResolvedValue(fakeUser);

    renderProbe();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("ana@example.com"));
  });

  it("clears the stored token and stays logged out when refreshing the user fails", async () => {
    mockedTokenStorage.getAccess.mockReturnValue("stale-token");
    mockedAuthService.me.mockRejectedValue(new Error("401"));

    renderProbe();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(mockedTokenStorage.clear).toHaveBeenCalled();
  });

  it("updates the user after a successful login", async () => {
    mockedTokenStorage.getAccess.mockReturnValue(null);
    mockedAuthService.login.mockResolvedValue(fakeUser);
    const user = userEvent.setup();

    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("login"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("ana@example.com"));
    expect(mockedAuthService.login).toHaveBeenCalledWith("ana@example.com", "senha");
  });

  it("clears the user after logout", async () => {
    mockedTokenStorage.getAccess.mockReturnValue("fake-token");
    mockedAuthService.me.mockResolvedValue(fakeUser);
    mockedAuthService.logout.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("ana@example.com"));

    await user.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });
});
