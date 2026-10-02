import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./CurrencyInput";

function ControlledField({ allowNegative }: { allowNegative?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <CurrencyInput
      label="Valor"
      name="amount"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      allowNegative={allowNegative}
    />
  );
}

function RegisteredField({ onSubmit }: { onSubmit: (value: string) => void }) {
  const { register, handleSubmit } = useForm<{ amount: string }>();
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data.amount))}>
      <CurrencyInput label="Valor" {...register("amount")} />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("CurrencyInput", () => {
  it("asks phones for the decimal keypad", () => {
    render(<ControlledField />);
    expect(screen.getByLabelText("Valor")).toHaveAttribute("inputmode", "decimal");
  });

  it("accepts the comma as the decimal mark", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);
    const input = screen.getByLabelText("Valor");
    await user.type(input, "12,50");
    expect(input).toHaveValue("12,50");
  });

  it("turns a dot typed on a comma-less keypad into a comma", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);
    const input = screen.getByLabelText("Valor");
    await user.type(input, "12.5");
    expect(input).toHaveValue("12,5");
  });

  it("refuses a third decimal place", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);
    const input = screen.getByLabelText("Valor");
    await user.type(input, "12,505");
    expect(input).toHaveValue("12,50");
  });

  it("ignores letters", async () => {
    const user = userEvent.setup();
    render(<ControlledField />);
    const input = screen.getByLabelText("Valor");
    await user.type(input, "a1b2c");
    expect(input).toHaveValue("12");
  });

  it("only lets a minus sign through when negative values are allowed", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ControlledField />);
    await user.type(screen.getByLabelText("Valor"), "-5");
    expect(screen.getByLabelText("Valor")).toHaveValue("5");
    unmount();

    render(<ControlledField allowNegative />);
    await user.type(screen.getByLabelText("Valor"), "-5");
    expect(screen.getByLabelText("Valor")).toHaveValue("-5");
  });

  it("hands react-hook-form the cleaned value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RegisteredField onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Valor"), "1.5x9");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalledWith("1,59");
  });
});
