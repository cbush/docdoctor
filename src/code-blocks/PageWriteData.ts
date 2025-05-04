import { CodeBlockWithMetadata } from "./CodeBlockWithMetadata";

export type PageWriteData = {
  inputFilepath: string;
  absFilepathToSource: string;
  codeBlockDirectory: string;
  codeBlocks: CodeBlockWithMetadata[];
};
