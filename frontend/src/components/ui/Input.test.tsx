import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a label associated with the input", () => {
    render(<Input label="E-mail" name="email" />);
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("shows an error message when provided", () => {
    render(<Input label="E-mail" name="email" error="E-mail inválido" />);
    expect(screen.getByText("E-mail inválido")).toBeInTheDocument();
  });

  it("does not render an error message when none is given", () => {
    render(<Input label="E-mail" name="email" />);
    expect(screen.queryByText(/inválido/)).not.toBeInTheDocument();
  });

  it("lets the user type into the field", async () => {
    const user = userEvent.setup();
    render(<Input label="Nome" name="name" />);
    const input = screen.getByLabelText("Nome");
    await user.type(input, "Ricardo");
    expect(input).toHaveValue("Ricardo");
  });
});
