import { promises as fs } from "fs";
import MagicString from "magic-string";
import restructured, { AnyNode } from "./restructured";

export const readRstFile = async (
  path: string
): Promise<{
  rst: AnyNode;
  document: MagicString;
}> => {
  const rawText = await fs.readFile(path, "utf8");
  const document = new MagicString(rawText);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });
  return { rst, document };
};
