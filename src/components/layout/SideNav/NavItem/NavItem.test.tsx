import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { NavItem as NavItemType } from "./NavItem.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({
    iconName,
    className,
  }: {
    iconName: string;
    className?: string;
    [key: string]: unknown;
  }) => <span data-testid={`icon-${iconName}`} className={className} />,
}));

import NavItem from "./NavItem";

const simpleItem: NavItemType = {
  id: 1,
  label: "jobManagement",
  icon: "briefcase",
  link: "job-management",
};

const itemWithSubNav: NavItemType = {
  id: 2,
  label: "reports",
  icon: "chart",
  link: "reports",
  subNavItems: [
    { id: 21, label: "reportA", link: "reports/a", icon: "" },
    { id: 22, label: "reportB", link: "reports/b", icon: "" },
  ],
};

function renderNavItem(item: NavItemType, selectedNavItem = "", isOpen = true) {
  const setSelectedNavItem = vi.fn();
  const setIsOpen = vi.fn();
  return {
    setSelectedNavItem,
    setIsOpen,
    ...render(
      <MemoryRouter>
        <ul>
          <NavItem
            item={item}
            setSelectedNavItem={setSelectedNavItem}
            selectedNavItem={selectedNavItem}
            setIsOpen={setIsOpen}
            isOpen={isOpen}
          />
        </ul>
      </MemoryRouter>,
    ),
  };
}

describe("NavItem", () => {
  describe("simple nav item (no subnav)", () => {
    it("renders a link with translated label", () => {
      renderNavItem(simpleItem);
      expect(screen.getByRole("link", { name: "jobManagement" })).toBeInTheDocument();
    });

    it("link points to the correct path", () => {
      renderNavItem(simpleItem);
      expect(screen.getByRole("link")).toHaveAttribute("href", "/job-management");
    });

    it("has selected class when selected", () => {
      renderNavItem(simpleItem, "jobManagement");
      expect(screen.getByRole("link")).toHaveClass("selected");
    });

    it("has no selected class when not selected", () => {
      renderNavItem(simpleItem, "other");
      expect(screen.getByRole("link")).not.toHaveClass("selected");
    });

    it("calls setSelectedNavItem on click", () => {
      const { setSelectedNavItem } = renderNavItem(simpleItem);
      fireEvent.click(screen.getByRole("link"));
      expect(setSelectedNavItem).toHaveBeenCalledWith("jobManagement");
    });

    it("calls setIsOpen when nav is closed", () => {
      const { setIsOpen } = renderNavItem(simpleItem, "", false);
      fireEvent.click(screen.getByRole("link"));
      expect(setIsOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("nav item with subNavItems", () => {
    it("renders a button instead of a link", () => {
      renderNavItem(itemWithSubNav);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("does not show subnav initially", () => {
      renderNavItem(itemWithSubNav);
      expect(screen.queryByText("reportA")).not.toBeInTheDocument();
    });

    it("shows subnav on button click", () => {
      renderNavItem(itemWithSubNav);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("reportA")).toBeInTheDocument();
      expect(screen.getByText("reportB")).toBeInTheDocument();
    });

    it("hides subnav on second click", () => {
      renderNavItem(itemWithSubNav);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));
      expect(screen.queryByText("reportA")).not.toBeInTheDocument();
    });

    it("renders down arrow icon when subnav is collapsed", () => {
      renderNavItem(itemWithSubNav);
      expect(screen.getByTestId("icon-down-small")).toBeInTheDocument();
    });

    it("renders up arrow icon when subnav is expanded", () => {
      renderNavItem(itemWithSubNav);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByTestId("icon-up-small")).toBeInTheDocument();
    });
  });
});
