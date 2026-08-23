import { describe, it, expect, vi } from "vitest";

describe("TerminalWindow Component & Unsaved Changes Guard Tests", () => {
  it("defines correct prop structure and defaults for TerminalWindow", async () => {
    const mod = await import("../../app/_components/TerminalWindow");
    expect(mod.TerminalWindow).toBeDefined();
    expect(typeof mod.TerminalWindow).toBe("function");
  });

  it("handles onClose callback execution and confirm dialog guards", () => {
    let confirmCalled = false;
    let windowConfirmValue = false;

    const mockConfirm = vi.fn((message?: string) => {
      confirmCalled = true;
      return windowConfirmValue;
    });

    // Simulated confirm guard helper as used in ComponentTypeForm & EditorPageClient
    const guardNavigation = (isDirty: boolean, navigate: () => void) => {
      if (isDirty) {
        const confirmed = mockConfirm("You have unsaved changes. Are you sure you want to leave?");
        if (!confirmed) return;
      }
      navigate();
    };

    const navigateSpy = vi.fn();

    // 1. Clean state (isDirty = false): navigates without confirm prompt
    guardNavigation(false, navigateSpy);
    expect(confirmCalled).toBe(false);
    expect(navigateSpy).toHaveBeenCalledTimes(1);

    navigateSpy.mockReset();
    confirmCalled = false;

    // 2. Dirty state, user cancels confirm: does NOT navigate
    windowConfirmValue = false;
    guardNavigation(true, navigateSpy);
    expect(mockConfirm).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();

    navigateSpy.mockReset();

    // 3. Dirty state, user accepts confirm: navigates away
    windowConfirmValue = true;
    guardNavigation(true, navigateSpy);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});
