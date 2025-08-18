// tests/e2e/board-delete.spec.ts
import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Deletion", () => {
  test("should allow a user to delete a board", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Arrange — create a board owned by the logged-in test user
    const boardName = testContext.getBoardName("Delete Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board created for delete test"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Act — open dashboard, delete the card
    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`).first();
    await expect(boardCard).toBeVisible({ timeout: 10_000 });

    await boardCard.hover();

    const deleteBtn = boardCard.getByRole("button", { name: /delete board/i });
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    const confirmDelete = authenticatedPage.getByRole("button", { name: /^delete$/i });
    await expect(confirmDelete).toBeVisible({ timeout: 5_000 });
    await confirmDelete.click();

    // Assert — card gone in UI
    await expect(boardCard).toHaveCount(0);

    // And row gone in DB
    const dbAfter = await testPrisma.board.findUnique({ where: { id: board.id } });
    expect(dbAfter).toBeNull();
  });

  test("should show error when trying to delete a board without permission", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Arrange — create a board so we have a card
    const boardName = testContext.getBoardName("No-Permission Delete Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board used to simulate 403 on delete"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Simulate backend denying deletion
    await authenticatedPage.route("/api/boards/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "Access denied" }),
        });
      } else {
        await route.continue();
      }
    });

    // Act — attempt delete
    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`).first();
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    await boardCard.hover();

    const deleteBtn = boardCard.getByRole("button", { name: /delete board/i });
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();

    const confirmDelete = authenticatedPage.getByRole("button", { name: /^delete$/i });
    await expect(confirmDelete).toBeVisible({ timeout: 5_000 });
    await confirmDelete.click();

    // Assert — error toast/message appears, DB row still exists
    await expect(authenticatedPage.getByText(/failed to delete board/i)).toBeVisible({
      timeout: 10_000,
    });

    const stillThere = await testPrisma.board.findUnique({ where: { id: board.id } });
    expect(stillThere).not.toBeNull();
  });
});
