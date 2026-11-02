import { test, expect, type Locator, type Page } from "@playwright/test";

async function ready(viewer: Locator) {
  await expect(viewer.locator(".svg-host svg")).toBeVisible();
  await expect(viewer).toHaveAttribute("aria-busy", "false");
}
async function scale(viewer: Locator) {
  return viewer.locator(".react-transform-component").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
}
async function openFirst(page: Page) {
  await page.goto("/blog");
  await page.getByRole("link", { name: /^01/ }).click();
  const sidebar = page.locator("[data-post-sidebar]");
  await ready(sidebar.locator(".mermaid-viewer"));
  return sidebar;
}

test("overview renders, four SVG links open one sidebar, Escape restores focus", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page.locator(".mermaid-viewer"));
  const links = page.locator("svg a[data-post-slug]");
  await expect(links).toHaveCount(4);
  const trigger = page.locator('svg a[data-post-slug="kiem-tra-anh"]');
  await trigger.click();
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(1);
  await ready(page.locator("[data-post-sidebar] .mermaid-viewer"));
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("[data-post-preview]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("sidebar reuses content, follows related links, and opens canonical page", async ({ page }) => {
  const sidebar = await openFirst(page);
  await sidebar.getByRole("link", { name: "Chọn số layer", exact: true }).click();
  await expect(sidebar.getByRole("heading", { name: "Chọn số layer" })).toBeVisible();
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(1);
  await ready(sidebar.locator(".mermaid-viewer"));
  await sidebar.getByRole("link", { name: "Mở trang: Chọn số layer", exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/chon-so-layer$/);
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(0);
  await page.reload();
  await ready(page.locator(".mermaid-viewer"));
  await expect(page.getByRole("heading", { name: "Chọn số layer" })).toBeVisible();
});

test("direct routes, missing article, and icon accessibility", async ({ page }) => {
  for (const slug of ["kiem-tra-anh", "chon-so-layer", "chon-neuron-filter", "chon-ham-kich-hoat"]) {
    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(200);
    await ready(page.locator(".mermaid-viewer"));
    for (const button of await page.getByRole("button").all()) {
      await expect(button).toHaveAttribute("aria-label", /.+/);
      await expect(button).toHaveAttribute("title", /.+/);
      expect((await button.innerText()).trim()).toBe("");
    }
  }
  const response = await page.goto("/blog/khong-ton-tai");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
});

test("playground renders sequence, reports errors and empty input, recovers with latest code", async ({ page }) => {
  await page.goto("/playground");
  const source = page.getByRole("textbox", { name: "Code Mermaid" });
  const viewer = page.getByRole("region", { name: "Kết quả Mermaid" });
  await ready(viewer);
  await source.fill("sequenceDiagram\n Alice->>Bob: Xin chào");
  await ready(viewer);
  await expect(viewer.locator(".svg-host svg")).toContainText("Xin chào");
  await source.fill("this is not a diagram");
  await expect(viewer.getByRole("alert")).toContainText("Không thể hiển thị sơ đồ");
  await expect(page.locator("[data-mermaid-render-host]")).toHaveCount(0);
  await source.fill("");
  await expect(viewer.getByRole("status")).toContainText("Nhập code Mermaid");
  await source.fill("flowchart TD\nA[Old] --> B[First]");
  await page.waitForTimeout(420);
  await source.fill("flowchart LR\nC[Latest] --> D[Result]");
  await expect(viewer.locator(".svg-host svg")).toContainText("Latest");
  await expect(viewer.locator(".svg-host svg")).not.toContainText("Old");
  await page.reload();
  await expect(source).not.toHaveValue(/Latest/);
});

test("sidebar responsive dimensions and keyboard navigation", async ({ page }, testInfo) => {
  const sidebar = await openFirst(page);
  const viewport = page.viewportSize()!;
  const box = (await sidebar.boundingBox())!;
  if (testInfo.project.name === "mobile") {
    expect(box.width).toBeCloseTo(viewport.width, 0);
    expect(box.y).toBe(0);
    await expect(sidebar.getByRole("button", { name: "Đóng sidebar" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await sidebar.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  } else {
    const resize = sidebar.getByRole("separator");
    const handle = (await resize.boundingBox())!;
    await page.mouse.move(handle.x + 5, handle.y + 100);
    await page.mouse.down();
    await page.mouse.move(handle.x - 140, handle.y + 100, { steps: 10 });
    await page.mouse.up();
    expect((await sidebar.boundingBox())!.width).toBeGreaterThan(box.width + 100);
    await resize.focus();
    const width = (await sidebar.boundingBox())!.width;
    await page.keyboard.press("ArrowLeft");
    expect((await sidebar.boundingBox())!.width).toBeGreaterThan(width);
  }
});

test("hover/focus preview, moving into preview, zoom independence and modified links", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Hover is intentionally disabled on touch devices.");
  await page.goto("/blog/kiem-tra-anh");
  const mainViewer = page.locator("main .mermaid-viewer");
  await ready(mainViewer);
  const link = page.getByRole("link", { name: "Chọn số layer", exact: true });
  await link.hover();
  const preview = page.locator("[data-post-preview]");
  await expect(preview).toBeVisible();
  await ready(preview.locator(".mermaid-viewer"));
  await preview.hover();
  await page.waitForTimeout(350);
  await expect(preview).toBeVisible();
  const mainScale = await scale(mainViewer);
  const previewScale = await scale(preview.locator(".mermaid-viewer"));
  await preview.getByRole("button", { name: "Phóng to", exact: true }).click();
  await expect.poll(() => scale(preview.locator(".mermaid-viewer"))).toBeGreaterThan(previewScale);
  expect(await scale(mainViewer)).toBeCloseTo(mainScale);
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(link).toBeFocused();
  await page.getByRole("link", { name: "Danh sách bài viết" }).focus();
  await link.focus();
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  const tab = context.waitForEvent("page");
  await link.click({ modifiers: ["Control"] });
  const opened = await tab;
  await opened.waitForURL("**/blog/chon-so-layer");
  await opened.close();
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(0);
});

test("mouse wheel anchors zoom, buttons fit/reset, node drag does not navigate", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mouse-only gestures.");
  await page.goto("/");
  const viewer = page.locator(".mermaid-viewer");
  await ready(viewer);
  const before = await scale(viewer);
  const box = (await viewer.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
  await page.mouse.wheel(0, -160);
  await expect.poll(() => scale(viewer)).toBeGreaterThan(before);
  await viewer.getByRole("button", { name: "Vừa khung", exact: true }).click();
  await expect.poll(() => scale(viewer)).toBeCloseTo(before, 2);
  await viewer.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect.poll(() => scale(viewer)).toBeCloseTo(1, 2);
  await viewer.getByRole("button", { name: "Vừa khung", exact: true }).click();
  await expect.poll(() => scale(viewer)).toBeCloseTo(before, 2);
  const node = viewer.locator('a[data-post-slug="kiem-tra-anh"]');
  const nodeBox = (await node.boundingBox())!;
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 90, nodeBox.y + nodeBox.height / 2 + 50, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator("[data-post-sidebar]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test("strict Mermaid does not execute inline callbacks or script markup", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.goto("/playground");
  await page.getByRole("textbox").fill('flowchart TD\nA["<img src=x onerror=alert(1)>"] --> B[Safe]\nclick B call alert()');
  const viewer = page.getByRole("region", { name: "Kết quả Mermaid" });
  await expect(viewer.locator(".svg-host svg")).toContainText("Safe");
  expect(await viewer.locator("img, script, [onclick], [onerror]").count()).toBe(0);
  await viewer.locator(".svg-host .node").last().click();
  expect(dialogs).toEqual([]);
});

test("SVG links keep Ctrl-click and middle-click opening a tab", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop modified mouse clicks.");
  await page.goto("/");
  await ready(page.locator(".mermaid-viewer"));
  const link = page.locator('svg a[data-post-slug="kiem-tra-anh"]');
  for (const options of [{ modifiers: ["Control" as const] }, { button: "middle" as const }]) {
    const newPage = context.waitForEvent("page");
    await link.click(options);
    const opened = await newPage;
    await opened.waitForURL("**/blog/kiem-tra-anh");
    await opened.close();
    await expect(page.locator("[data-post-sidebar]")).toHaveCount(0);
  }
});

test("touch pinch zooms the same common viewer", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch gestures on the mobile viewport.");
  await page.goto("/blog/chon-ham-kich-hoat");
  const viewer = page.locator(".mermaid-viewer");
  await ready(viewer);
  const box = (await viewer.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const before = await scale(viewer);
  const cdp = await context.newCDPSession(page);
  const points = (distance: number) => [{ x: x - distance, y, id: 1 }, { x: x + distance, y, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(35) });
  for (let distance = 40; distance <= 85; distance += 5) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(distance) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => scale(viewer)).toBeGreaterThan(before * 1.5);
});


test("fit keeps the full diagram above the floating toolbar", async ({ page }) => {
  await page.goto("/blog/chon-so-layer");
  const viewer = page.locator(".mermaid-viewer");
  await ready(viewer);
  await viewer.getByRole("button", { name: "Vừa khung", exact: true }).click();
  const svg = (await viewer.locator(".svg-host svg").boundingBox())!;
  const toolbar = (await viewer.getByRole("toolbar").boundingBox())!;
  expect(svg.y + svg.height).toBeLessThanOrEqual(toolbar.y - 4);
});


test("hovering a data node after zoom preserves the overview with visible scrollbars", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Regression for desktop scrollbars in the in-app browser.");
  await page.setViewportSize({ width: 633, height: 605 });
  await page.goto("/");
  const main = page.locator("main .mermaid-viewer");
  await ready(main);
  await main.getByRole("button", { name: "Phóng to", exact: true }).click();
  await page.waitForTimeout(300);
  const before = await main.locator(".react-transform-component").getAttribute("style");
  const width = (await main.boundingBox())!.width;
  await main.locator('a[data-post-slug="kiem-tra-anh"]').hover();
  const preview = page.locator("[data-post-preview]");
  await ready(preview.locator(".mermaid-viewer"));
  await expect(page.locator("[data-mermaid-render-host]")).toHaveCount(0);
  await expect(main.locator(".react-transform-component")).toHaveAttribute("style", before!);
  expect((await main.boundingBox())!.width).toBe(width);
  await expect(main.locator("svg a[data-post-slug]")).toHaveCount(4);
  await preview.hover();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(main.locator(".react-transform-component")).toHaveAttribute("style", before!);
});
