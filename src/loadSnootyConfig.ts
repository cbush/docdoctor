import { promises as fs } from "fs";
import toml from "toml";

export type SnootyConfig = {
  constants: Record<string, string>;
};

export const loadSnootyConfig = async (
  snootyTomlPath?: string
): Promise<SnootyConfig> => {
  const defaults: SnootyConfig = {
    constants: {},
  };
  if (snootyTomlPath === undefined) {
    return { ...defaults };
  }
  const text = await fs.readFile(snootyTomlPath, "utf8");
  const data = toml.parse(text);
  return { ...defaults, ...data } as SnootyConfig;
};
