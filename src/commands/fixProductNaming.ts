import { CommandModule } from "yargs";
import { promises as fs } from "fs";
import restructured, { ParentNode, ValueNode } from "../restructured";
import MagicString from "magic-string";
import { visit } from "../tree";
import { SnootyConfig, loadSnootyConfig } from "../loadSnootyConfig";
import { replaceSourceConstants } from "../replaceSourceConstants";
import { strict as assert } from "assert";

export type ProductPhrases = {
  search: string;
  first: string;
  subsequent: string;
}[];
export type FixProductNamingConfig = {
  namesOfConstantsToExpand: string[];
  productPhrases: ProductPhrases;
};

export const fixProductNaming = (
  source: string,
  productPhrases: ProductPhrases,
  info?: { path: string }
): MagicString => {
  const document = new MagicString(source);
  const rst = restructured.parse(document.original, {
    blanklines: true,
    indent: true,
    position: true,
  });

  const usageCounter = Array.from({ length: productPhrases.length }, () => 0);

  // Track what has already been replaced so we don't replace something twice
  const replacedSpans: [number, number][] = [];

  // Visit parent nodes, collate direct child text nodes to search for matches
  // even if they span hard newlines.
  try {
    visit(rst, (node) => {
      if (node.children === undefined) {
        return;
      }

      const parentNode = node as ParentNode;
      const textNodes = parentNode.children.filter(
        (node) => node.type === "text"
      ) as ValueNode[];
      const mergedText = textNodes.reduce(
        (acc, cur) => acc + cur.value.replace(/\n/, " "),
        ""
      );

      productPhrases.forEach(
        ({ search, first, subsequent }, productPhraseIndex) => {
          const matches = [...mergedText.matchAll(new RegExp(search, "g"))];
          matches.forEach((match) => {
            assert(match.index !== undefined);

            // Offset in usageCounter array corresponds to index of productPhrases array
            const replacer =
              usageCounter[productPhraseIndex]++ === 0 ? first : subsequent;

            // Find starting node that contains the match. You can't trust node
            // positions because they skip the indents which are not reflected in
            // the combined text string.
            let startIndex = match.index;
            const startNodeIndex = textNodes.findIndex(({ value }) => {
              if (startIndex < value.length) {
                return true;
              }
              // startIndex becomes the starting index in the target text node
              startIndex -= value.length;
              return false;
            });
            assert(startIndex >= 0, `Invalid startIndex ${startIndex}`);
            assert(startNodeIndex !== -1, "startNode not found!");

            // Now find the node that contains the end of string. This might be a
            // different node if the search string spans multiple lines due to
            // hard formatting.
            let endIndex = match.index + match[0].length;
            const endNodeIndex = textNodes.findIndex(({ value }) => {
              if (endIndex <= value.length) {
                return true;
              }
              // endIndex becomes the starting index in the target text node
              endIndex -= value.length;
              return false;
            });
            assert(endIndex >= 0, `Invalid endIndex ${startIndex}`);
            assert(endNodeIndex !== -1, "endNode not found!");

            const matchContainingNodes = textNodes.slice(
              startNodeIndex,
              endNodeIndex + 1
            );
            assert(matchContainingNodes.length !== 0);

            // There are cases where restructured 'forgets' the position and
            // resets the offset to the first column of the line. Handle that here.
            const firstOffsetInDocument =
              matchContainingNodes[0].position.start.offset + startIndex;
            let firstOffsetCompensation = 0;
            const substringLength = 5;
            while (
              document.original.substring(
                firstOffsetInDocument + firstOffsetCompensation,
                firstOffsetInDocument +
                  firstOffsetCompensation +
                  substringLength
              ) !== match[0].substring(0, substringLength) &&
              firstOffsetInDocument + firstOffsetCompensation <
                matchContainingNodes[0].position.end.offset
            ) {
              ++firstOffsetCompensation;
            }

            const spansToRemove: [number, number][] = [];
            // Delete match from span
            if (matchContainingNodes.length === 1) {
              // Entire match in one node
              assert(startIndex < endIndex);
              const offset =
                matchContainingNodes[0].position.start.offset +
                firstOffsetCompensation;
              if (firstOffsetCompensation !== 0) {
                console.log(
                  `Adjusting offset ${firstOffsetCompensation} for match: ${match[0]}`
                );
              }
              spansToRemove.push([offset + startIndex, offset + endIndex]);
            } else {
              // Spans two or more adjacent nodes
              const first = matchContainingNodes[0];
              const last =
                matchContainingNodes[matchContainingNodes.length - 1];
              const firstOffset =
                first.position.start.offset + firstOffsetCompensation;
              const { offset: lastOffset } = last.position.start;
              spansToRemove.push([
                firstOffset + startIndex,
                first.position.end.offset - 1,
              ]);
              const removedFromFirst =
                first.position.end.offset - (firstOffset + startIndex);
              let leftToRemove = Math.max(
                match[0].length - removedFromFirst,
                0
              );
              if (matchContainingNodes.length > 2) {
                // Delete everything from middle nodes
                const firstEnd = first.position.end.offset;
                const secondLastEnd =
                  matchContainingNodes[matchContainingNodes.length - 2].position
                    .end.offset;
                // Reconstruct indents
                const indentLength = document.original
                  .substring(firstEnd, secondLastEnd)
                  .split("\n")
                  .map((line) => /^\s+/.exec(line))
                  .reduce(
                    (acc, cur) => (cur === null ? acc : acc + cur[0].length),
                    0
                  );

                spansToRemove.push([firstEnd, secondLastEnd]);
                leftToRemove -= secondLastEnd - firstEnd - indentLength;
              }
              if (leftToRemove <= 0) {
                const path = info?.path ?? "<unknown>";
                throw new Error(
                  `Failed to process ${path}: invalid leftToRemove. This is probably due to inaccurate node positioning in the restructured library. Please edit this file manually.`
                );
              }
              spansToRemove.push([lastOffset, lastOffset + leftToRemove]);
            }

            // Check that the match doesn't overlap a previous match.
            const totalSpanStart = spansToRemove[0][0];
            const totalSpanEnd = spansToRemove[spansToRemove.length - 1][1];
            if (
              replacedSpans.find(([start, end]) => {
                return (
                  (start <= totalSpanStart && totalSpanStart < end) ||
                  (start <= totalSpanEnd && totalSpanEnd < end)
                );
              }) !== undefined
            ) {
              return;
            }
            replacedSpans.push([totalSpanStart, totalSpanEnd]);

            spansToRemove.forEach(([start, end]) => {
              document.remove(start, end);
            });
            // Insert replacement into first node
            document.appendRight(
              matchContainingNodes[0].position.start.offset +
                startIndex +
                firstOffsetCompensation,
              replacer
            );
          });
        }
      );
    });
  } catch (error) {
    console.error(error);
    return new MagicString(source); // Return unedited document
  }
  return document;
};

const fixProductNamingInFile = async (args: {
  path: string;
  snootyConfig: SnootyConfig;
  fixProductNamingConfig: FixProductNamingConfig;
}): Promise<void> => {
  const { path, snootyConfig, fixProductNamingConfig } = args;
  const { namesOfConstantsToExpand, productPhrases } = fixProductNamingConfig;
  const constantsToExpand = Object.fromEntries(
    namesOfConstantsToExpand
      .map((name) => [name, snootyConfig.constants[name]])
      .filter(([, v]) => v !== undefined)
  );
  const rawText = await fs.readFile(path, "utf8");
  const expandedText = replaceSourceConstants(rawText, constantsToExpand);

  console.log(`Visiting ${path}`);
  const document = fixProductNaming(expandedText, productPhrases, { path });

  if (!document.hasChanged()) {
    console.log(`Visited ${path} -- no changes made`);
    return;
  }

  console.log(`Updating ${path}`);
  await fs.writeFile(path, document.toString(), "utf8");
};

const loadFixProductNamingConfig = async (
  path?: string
): Promise<FixProductNamingConfig> => {
  const defaults: FixProductNamingConfig = {
    namesOfConstantsToExpand: [],
    productPhrases: [],
  };
  if (path === undefined) {
    return { ...defaults };
  }
  const text = await fs.readFile(path, "utf8");
  const data = JSON.parse(text);
  return { ...defaults, ...data } as FixProductNamingConfig;
};

type FixProductNamingArgs = {
  paths: string[];
  snootyTomlPath?: string;
  fixProductNamingJsonPath?: string;
};

const commandModule: CommandModule<unknown, FixProductNamingArgs> = {
  command: "fixProductNaming <paths..>",
  builder(args) {
    return args
      .positional("paths", { array: true, type: "string", demandOption: true })
      .string("snootyTomlPath")
      .string("fixProductNamingJsonPath");
  },
  handler: async (args) => {
    try {
      const { paths, snootyTomlPath, fixProductNamingJsonPath } = args;
      const snootyConfig = await loadSnootyConfig(snootyTomlPath);
      const fixProductNamingConfig = await loadFixProductNamingConfig(
        fixProductNamingJsonPath
      );
      const promises = paths.map((path) =>
        fixProductNamingInFile({ path, snootyConfig, fixProductNamingConfig })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Fix up rST",
};

export default commandModule;
