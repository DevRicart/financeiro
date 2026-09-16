import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("defaults to the neutral tone", () => {
    render(<Badge>Pendente</Badge>);
    expect(screen.getByText("Pendente")).toHaveClass("bg-slate-100");
  });

  it("applies the danger tone classes", () => {
    render(<Badge tone="danger">Atrasada</Badge>);
    expect(screen.getByText("Atrasada")).toHaveClass("bg-red-100");
  });

  it("applies the success tone classes", () => {
    render(<Badge tone="success">Concluída</Badge>);
    expect(screen.getByText("Concluída")).toHaveClass("bg-green-100");
  });
});
