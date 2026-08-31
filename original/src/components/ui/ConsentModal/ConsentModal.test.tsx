import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../../hooks/useFocusTrap", () => ({
  useFocusTrap: vi.fn(),
}));

vi.mock("../../../api/services/consent/hooks", () => ({
  useAcceptConsent: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

let capturedOnClose: ((event?: React.SyntheticEvent) => void) | undefined;

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({ children, onClose, ...props }: any) => {
    capturedOnClose = onClose;
    return <div data-testid={props["data-testid"]}>{children}</div>;
  },
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Checkbox: ({ onChange, checked, ...props }: any) => (
    <input type="checkbox" checked={checked} onChange={onChange} {...props} />
  ),
}));

import { useQueryClient } from "@tanstack/react-query";
import { useAcceptConsent } from "../../../api/services/consent/hooks";
import ConsentModal from "./ConsentModal";

const mockUseQueryClient = vi.mocked(useQueryClient);
const mockUseAcceptConsent = vi.mocked(useAcceptConsent);

describe("ConsentModal", () => {
  const acceptConsent = vi.fn();
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    length: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);

    mockUseAcceptConsent.mockReturnValue({
      mutate: acceptConsent,
      isPending: false,
    } as never);

    mockUseQueryClient.mockReturnValue({
      getQueryData: vi.fn((key) => {
        if (key[0] === "user") {
          return {
            locale: "en-TR",
            countryCode: "TR",
            consent: {
              tac: {
                isNewVersionAvailable: true,
                newVersionName: "1.0",
              },
              privacy: {
                isNewVersionAvailable: true,
                newVersionName: "2.0",
              },
            },
          };
        }

        if (key[0] === "countryConfiguration") {
          return {
            links: {
              footer: [
                {
                  name: "privacyLink",
                  value: "https://privacy.com",
                },
                {
                  name: "termsLink",
                  value: "https://terms.com",
                },
              ],
            },
          };
        }

        return undefined;
      }),
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders consent modal with checkboxes", () => {
    render(<ConsentModal isOpen />);

    expect(screen.getByTestId("consent-modal")).toBeInTheDocument();

    expect(screen.getByTestId("consent-privacy-checkbox")).toBeInTheDocument();

    expect(screen.getByTestId("consent-terms-checkbox")).toBeInTheDocument();
  });

  it("accept button is disabled initially", () => {
    render(<ConsentModal isOpen />);

    expect(screen.getByTestId("consent-accept-button")).toBeDisabled();
  });

  it("enables accept button when all consents are checked", () => {
    render(<ConsentModal isOpen />);

    fireEvent.click(screen.getByTestId("consent-privacy-checkbox"));

    fireEvent.click(screen.getByTestId("consent-terms-checkbox"));

    expect(screen.getByTestId("consent-accept-button")).toBeEnabled();
  });

  it("calls acceptConsent with correct payload", () => {
    render(<ConsentModal isOpen />);

    fireEvent.click(screen.getByTestId("consent-privacy-checkbox"));

    fireEvent.click(screen.getByTestId("consent-terms-checkbox"));

    fireEvent.click(screen.getByTestId("consent-accept-button"));

    expect(acceptConsent).toHaveBeenCalledWith({
      acceptedTacVersion: "1.0",
      acceptedPrivacyVersion: "2.0",
      locale: "en-TR",
    });
  });

  it("does not call acceptConsent when button is disabled", () => {
    render(<ConsentModal isOpen />);

    fireEvent.click(screen.getByTestId("consent-accept-button"));

    expect(acceptConsent).not.toHaveBeenCalled();
  });

  it("renders only available consent checkbox", () => {
    mockUseQueryClient.mockReturnValue({
      getQueryData: vi.fn(() => ({
        locale: "en-TR",
        consent: {
          tac: {
            isNewVersionAvailable: false,
          },
          privacy: {
            isNewVersionAvailable: true,
            newVersionName: "2.0",
          },
        },
      })),
    } as never);

    render(<ConsentModal isOpen />);

    expect(screen.getByTestId("consent-privacy-checkbox")).toBeInTheDocument();

    expect(screen.queryByTestId("consent-terms-checkbox")).not.toBeInTheDocument();
  });

  it("removes selectedLanguage and redirects to logout when exit button is clicked", () => {
    vi.useFakeTimers();
    const replaceSpy = vi.fn();
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { replace: replaceSpy },
    });

    render(<ConsentModal isOpen />);
    fireEvent.click(screen.getByTestId("consent-exit-button"));

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("selectedLanguage");
    vi.advanceTimersByTime(100);
    expect(replaceSpy).toHaveBeenCalledWith(expect.stringContaining("/v1/auth/logout"));
    vi.useRealTimers();
  });

  it("logs an error when handleExit throws", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    localStorageMock.removeItem.mockImplementationOnce(() => {
      throw new Error("storage failure");
    });

    render(<ConsentModal isOpen />);
    fireEvent.click(screen.getByTestId("consent-exit-button"));

    expect(consoleErrorSpy).toHaveBeenCalledWith("Logout failed:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("calls handleExit via Dialog onClose", () => {
    vi.useFakeTimers();
    const replaceSpy = vi.fn();
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { replace: replaceSpy },
    });

    render(<ConsentModal isOpen />);
    const fakeEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.SyntheticEvent;
    capturedOnClose?.(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(replaceSpy).toHaveBeenCalled();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("selectedLanguage");
    vi.useRealTimers();
  });

  it("does not call handleExit when Dialog onClose fires without an event", () => {
    render(<ConsentModal isOpen />);
    expect(() => capturedOnClose?.(undefined)).not.toThrow();
  });

  it("sets inert/aria-hidden on the app container while open, and removes them when closed", () => {
    const appContainer = document.createElement("div");
    appContainer.className = "app-container";
    document.body.appendChild(appContainer);

    const { rerender, unmount } = render(<ConsentModal isOpen />);
    expect(appContainer).toHaveAttribute("inert", "");
    expect(appContainer).toHaveAttribute("aria-hidden", "true");

    rerender(<ConsentModal isOpen={false} />);
    expect(appContainer).not.toHaveAttribute("inert");
    expect(appContainer).not.toHaveAttribute("aria-hidden");

    unmount();
    appContainer.remove();
  });

  it("does nothing when there is no app container in the DOM", () => {
    expect(() => render(<ConsentModal isOpen />)).not.toThrow();
  });
});
