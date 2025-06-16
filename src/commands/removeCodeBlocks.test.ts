import {
  removeCodeBlocks,
  makeLiteralInclude,
  getFormattedCodeBlockTextFromDirective,
} from "./removeCodeBlocks";
import { CodeBlockWithMetadata } from "../code-blocks/CodeBlockWithMetadata";
import { promises as fs } from "fs";
import path from "path";

describe("removeCodeBlocks", () => {
  const absFilePathToSrcDir = path.join(
    __dirname,
    "test/removeCodeBlocks/source/"
  );
  const pageFilePath = `${absFilePathToSrcDir}arbitrary-dir-name/file.txt`;

  it("should replace a code block in the rST with a literalinclude", async () => {
    const source = `Copy and paste the following into the search/input box.

       .. code-block:: sh

          https://github.com/realm/realm-swift.git

    `;
    const result = await removeCodeBlocks(
      pageFilePath,
      absFilePathToSrcDir,
      source
    );
    expect(result.toString())
      .toBe(`Copy and paste the following into the search/input box.

       .. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
          :language: shell

    `);
  });

  it("should create a valid literalinclude from the code block metadata and filepath", async () => {
    const indentWidth = 0;
    const codeBlockMetadata: CodeBlockWithMetadata = {
      language: "sh",
      writeFilepath: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.sh`,
      literalincludeFilepath: `/code-examples/arbitrary-dir-name/file/1.sh`,
      codeBlockDirectory: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/`,
      content: "https://github.com/realm/realm-swift.git",
      optionLines: [],
    };
    const result = makeLiteralInclude(codeBlockMetadata, indentWidth);
    expect(result)
      .toBe(`.. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
   :language: sh\n\n`);
  });

  it("should handle an arbitrary indent width when constructing a literalinclude", async () => {
    const indentWidth = 7;
    const codeBlockMetadata: CodeBlockWithMetadata = {
      language: "sh",
      writeFilepath: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.sh`,
      literalincludeFilepath: `/code-examples/arbitrary-dir-name/file/1.sh`,
      codeBlockDirectory: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/`,
      content: "https://github.com/realm/realm-swift.git",
      optionLines: [],
    };
    const result = makeLiteralInclude(codeBlockMetadata, indentWidth);
    // The literalinclude line should start at the beginning, but subsequent option lines should be indented with spaces indentWidth number of times
    expect(result)
      .toBe(`.. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
       :language: sh\n\n`);
  });

  it("should handle an arbitrary indent width when constructing a literalinclude with options", async () => {
    const indentWidth = 7;
    const codeBlockMetadata: CodeBlockWithMetadata = {
      language: "sh",
      writeFilepath: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.sh`,
      literalincludeFilepath: `/code-examples/arbitrary-dir-name/file/1.sh`,
      codeBlockDirectory: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/`,
      content: "https://github.com/realm/realm-swift.git",
      optionLines: [":emphasize-lines: 7"],
    };
    const result = makeLiteralInclude(codeBlockMetadata, indentWidth);
    // The literalinclude line should start at the beginning, but subsequent option lines should be indented with spaces indentWidth number of times
    expect(result)
      .toBe(`.. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
       :language: sh
       :emphasize-lines: 7\n\n`);
  });

  it("should handle properly indenting multiple option lines even when no indentWidth is specified", async () => {
    const indentWidth = 0;
    const codeBlockMetadata: CodeBlockWithMetadata = {
      language: "sh",
      writeFilepath: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.sh`,
      literalincludeFilepath: `/code-examples/arbitrary-dir-name/file/1.sh`,
      codeBlockDirectory: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/`,
      content: "https://github.com/realm/realm-swift.git",
      optionLines: [":emphasize-lines: 7", ":copyable: false"],
    };
    const result = makeLiteralInclude(codeBlockMetadata, indentWidth);
    // The literalinclude line should start at the beginning, but subsequent option lines should be indented with 3 spaces if no indentWidth is specified
    expect(result)
      .toBe(`.. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
   :language: sh
   :emphasize-lines: 7
   :copyable: false\n\n`);
  });

  it("should correct the spacing in code blocks nested in bullet lists", async () => {
    const codeBlockMetadata: CodeBlockWithMetadata = {
      language: "sh",
      writeFilepath: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.sh`,
      literalincludeFilepath: `/code-examples/arbitrary-dir-name/file/1.sh`,
      codeBlockDirectory: `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/`,
      content:
        "  .. code-block:: text\n\n     # Uncomment the next line to define a global platform for your project\n     # platform :ios, '9.0'",
      optionLines: [],
    };

    const codeBlockText = getFormattedCodeBlockTextFromDirective(
      codeBlockMetadata.content
    );
    // The literalinclude line should start at the beginning, but subsequent option lines should be indented with spaces indentWidth number of times
    expect(codeBlockText).toBe(
      `# Uncomment the next line to define a global platform for your project\n# platform :ios, '9.0'\n`
    );
  });

  it("should handle a code block where an invalid programming language is specified", async () => {
    const source = `Copy and paste the following into the search/input box.

       .. code-block:: invalidLanguage

          https://github.com/realm/realm-swift.git

`;
    const result = await removeCodeBlocks(
      pageFilePath,
      absFilePathToSrcDir,
      source
    );
    // When an invalid programming language is specified, the mapper outputs 'text' for syntax highlighting purposes and writes the code to a '.txt' file
    expect(result.toString())
      .toBe(`Copy and paste the following into the search/input box.

       .. literalinclude:: /code-examples/arbitrary-dir-name/file/1.txt
          :language: text\n\n`);
  });

  it("should handle a code block where no programming language is specified", async () => {
    const source = `Copy and paste the following into the search/input box.

       .. code-block::

          https://github.com/realm/realm-swift.git

`;
    const result = await removeCodeBlocks(
      pageFilePath,
      absFilePathToSrcDir,
      source
    );
    // When no programming language is specified, the mapper outputs 'text' for syntax highlighting purposes and writes the code to a '.txt' file
    expect(result.toString())
      .toBe(`Copy and paste the following into the search/input box.

       .. literalinclude:: /code-examples/arbitrary-dir-name/file/1.txt
          :language: text\n\n`);
  });

  it("should handle multiple code blocks in the rST", async () => {
    const source = `Copy and paste the following into the search/input box.

       .. code-block:: sh

          https://github.com/realm/realm-swift.git

       Then, do some other stuff.
       
       .. code-block:: shell

          npm install docdoctor

    `;
    const result = await removeCodeBlocks(
      pageFilePath,
      absFilePathToSrcDir,
      source
    );
    expect(result.toString())
      .toBe(`Copy and paste the following into the search/input box.

       .. literalinclude:: /code-examples/arbitrary-dir-name/file/1.sh
          :language: shell

       Then, do some other stuff.
       
       .. literalinclude:: /code-examples/arbitrary-dir-name/file/2.sh
          :language: shell

    `);
  });

  it("should output the code from the code block correctly to the file", async () => {
    const source = `Copy and paste the following into the search/input box.

.. code-block::

   https://github.com/realm/realm-swift.git

`;
    await removeCodeBlocks(pageFilePath, absFilePathToSrcDir, source);
    const fileContents = await fs.readFile(
      `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.txt`,
      "utf8"
    );
    expect(fileContents).toBe(`https://github.com/realm/realm-swift.git\n`);
  });

  it("should output multiline code from the code block correctly to the file", async () => {
    const source = `Copy and paste the following into the search/input box.

.. code-block:: text

   # Uncomment the next line to define a global platform for your project
   # platform :ios, '9.0'

   target 'MyRealmProject' do
   # Comment the next line if you don't want to use dynamic frameworks
   use_frameworks!

   # Pods for MyRealmProject
   pod 'Realm', '~>10'

   target 'MyRealmProjectTests' do
      inherit! :search_paths
      # Pods for testing
      pod 'Realm', '~>10'
   end

   end

`;
    await removeCodeBlocks(pageFilePath, absFilePathToSrcDir, source);
    const fileContents = await fs.readFile(
      `${absFilePathToSrcDir}code-examples/arbitrary-dir-name/file/1.txt`,
      "utf8"
    );
    expect(fileContents).toBe(
      `# Uncomment the next line to define a global platform for your project
# platform :ios, '9.0'

target 'MyRealmProject' do
# Comment the next line if you don't want to use dynamic frameworks
use_frameworks!

# Pods for MyRealmProject
pod 'Realm', '~>10'

target 'MyRealmProjectTests' do
   inherit! :search_paths
   # Pods for testing
   pod 'Realm', '~>10'
end

end\n`
    );
  });
});
