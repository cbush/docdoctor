import { findUnused } from "./findUnused";
import * as Path from "path";

describe("findUnused", () => {
  it("handles nested links", async () => {
    const unusedPaths = await findUnused({
      path: Path.join(
        __dirname,
        "..",
        "..",
        "test",
        "findUnused",
        "nestedDirectives"
      ),
    });
    expect(unusedPaths).toStrictEqual([]);
  });
});
