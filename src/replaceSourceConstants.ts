export const replaceSourceConstants = (
  s: string,
  constants: Record<string, string>
): string => {
  return Object.keys(constants).reduce(
    (acc, cur) =>
      acc.replace(new RegExp(`\\{\\+${cur}\\+\\}`, "g"), constants[cur]),
    s
  );
};
