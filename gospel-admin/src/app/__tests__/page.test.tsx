import GospelPresentation from "../page";

describe("src/app/page", () => {
  test("default export is the root redirect client component", () => {
    expect(typeof GospelPresentation).toBe("function");
    expect(GospelPresentation.name).toBe("GospelPresentation");
  });
});
