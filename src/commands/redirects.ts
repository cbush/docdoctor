import { promises as fs } from "fs";
import { CommandModule } from "yargs";

const redirectsBaseUrl = "https://www.mongodb.com/";

type RedirectsFile = {
  replacements: Record<string, string>;
  redirects: Record<string, string>;
  redirectCount: number;
};

const applyReplacements = (
  replacements: Record<string, string>,
  text: string
) => {
  return Object.entries(replacements).reduce((replacedText, [from, to]) => {
    return replacedText.replace("${" + from + "}", to);
  }, text);
};

const unapplyReplacements = (
  replacements: Record<string, string>,
  text: string
) => {
  return Object.entries(replacements)
    .reverse()
    .reduce((replacedText, [from, to]) => {
      return replacedText.replace(to, "${" + from + "}");
    }, text);
};

const withTrailingSlash = (text: string) => {
  return text.replace(/\/?$/, "/");
};

const parseRedirects = (text: string): RedirectsFile => {
  const result: RedirectsFile = {
    replacements: {},
    redirects: {},
    redirectCount: 0,
  };
  const lines = text.split("\n");
  lines.forEach((line) => {
    if (/^\s*#/.test(line)) {
      // Comment
      return;
    }
    let matches = /^define:\s*([^\s]+)\s+([^\s]+)\s*$/.exec(line);
    if (matches != null) {
      result.replacements[matches[1]] = applyReplacements(
        result.replacements,
        matches[2]
      );
      return;
    }
    matches = /^raw:\s*([^\s]+)\s+->\s+([^\s]+)\s*$/.exec(line);
    if (matches != null) {
      ++result.redirectCount;
      result.redirects[`${redirectsBaseUrl}${matches[1]}`] = matches[2];
    }
  });

  result.redirects = Object.fromEntries(
    Object.entries(result.redirects).map(([from, to]) => {
      return [
        withTrailingSlash(applyReplacements(result.replacements, from)),
        withTrailingSlash(applyReplacements(result.replacements, to)),
      ];
    })
  );

  return result;
};

const getUltimateDestination = (
  redirects: Record<string, string>,
  target: string,
  chain: string[]
): string => {
  // If any entry's destination is another entry's source, then copy that entry's destination.
  const nextTarget = redirects[target];
  if (nextTarget === undefined) {
    return target;
  }
  if (nextTarget === chain[0]) {
    throw new Error(
      `Circular dependency detected: ${chain.join(
        " -> "
      )} -> ${target} -> ${nextTarget}`
    );
  }
  return getUltimateDestination(redirects, nextTarget, [...chain, nextTarget]);
};

const redirects = async (path: string): Promise<void> => {
  const rawText = await fs.readFile(path, "utf8");
  const { redirects, replacements, redirectCount } = parseRedirects(rawText);

  const condensedRedirects = Object.fromEntries(
    Object.entries(redirects).map(([from, to]) => {
      const ultimateDestination = getUltimateDestination(redirects, to, [from]);
      return [
        unapplyReplacements(
          replacements,
          from.substring(redirectsBaseUrl.length)
        ),
        unapplyReplacements(replacements, ultimateDestination),
      ];
    })
  );

  const header = Object.entries(replacements)
    .map(([from, to]) => `define: ${from} ${to}`)
    .join("\n");
  console.log(header);

  const body = Object.entries(condensedRedirects)
    .map(([from, to]) => `raw: ${from} -> ${to}`)
    .join("\n");
  console.log(body);
};

type RedirectsArgs = { path: string };

const commandModule: CommandModule<unknown, RedirectsArgs> = {
  command: "redirects <path>",
  handler: async (args) => {
    try {
      const { path } = args;
      await redirects(path);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  },
  describe: "Fix up rST",
};

export default commandModule;
