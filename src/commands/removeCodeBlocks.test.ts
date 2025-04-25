import { removeCodeBlocks } from "./removeCodeBlocks";

describe("removeCodeBlocks", () => {
  it("should remove the code blocks from the given rST", () => {
    const source = `
    Copy and paste the following into the search/input box.

       .. code-block:: sh

          https://github.com/realm/realm-swift.git
    `;
    const result = removeCodeBlocks(source);
    expect(result.toString()).toBe(
      "This test should fail but I want to print to the console"
    );
  });
});
