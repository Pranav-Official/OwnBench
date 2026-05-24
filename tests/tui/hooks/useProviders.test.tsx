import { describe, it, expect, vi } from "vitest";
import React from "react";

const { mockListProviders, mockListModels } = vi.hoisted(() => ({
  mockListProviders: vi.fn(),
  mockListModels: vi.fn(),
}));

vi.mock("../../../src/lib/providers.js", () => ({
  listProviders: mockListProviders,
  listModels: mockListModels,
}));

import { render } from "@testing-library/react";
import { useProviders, useModels } from "../../../src/tui/hooks/useProviders.js";

function ProvidersHarness() {
  const providers = useProviders();
  return React.createElement(
    "text",
    {},
    JSON.stringify(providers),
  );
}

function ModelsHarness({ providerId }: { providerId: string }) {
  const models = useModels(providerId);
  return React.createElement("text", {}, JSON.stringify(models));
}

describe("useProviders", () => {
  it("returns result of listProviders on mount", () => {
    mockListProviders.mockReturnValue([{ id: "openai", label: "OpenAI" }]);
    const { container } = render(<ProvidersHarness />);
    expect(mockListProviders).toHaveBeenCalled();
    expect(container.textContent).toContain("openai");
  });

  it("returns empty array when listProviders returns empty", () => {
    mockListProviders.mockReturnValue([]);
    const { container } = render(<ProvidersHarness />);
    expect(container.textContent).toEqual("[]");
  });
});

describe("useModels", () => {
  it("returns empty array when providerId is empty", () => {
    mockListModels.mockReturnValue([]);
    const { container } = render(<ModelsHarness providerId="" />);
    expect(container.textContent).toEqual("[]");
  });

  it("calls listModels with providerId when non-empty", () => {
    mockListModels.mockReturnValue([{ id: "gpt-4", label: "GPT-4" }]);
    const { container } = render(<ModelsHarness providerId="openai" />);
    expect(mockListModels).toHaveBeenCalledWith("openai");
    expect(container.textContent).toContain("gpt-4");
  });

  it("updates models when providerId changes", () => {
    mockListModels
      .mockReturnValueOnce([{ id: "gpt-4", label: "GPT-4" }])
      .mockReturnValueOnce([{ id: "claude-3", label: "Claude 3" }]);
    const { container, rerender } = render(
      <ModelsHarness providerId="openai" />,
    );
    expect(container.textContent).toContain("gpt-4");
    rerender(<ModelsHarness providerId="anthropic" />);
    expect(container.textContent).toContain("Claude 3");
  });
});
