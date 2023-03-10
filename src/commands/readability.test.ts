import MagicString from "magic-string";
import restructured from "../restructured";
import { getText as getText } from "./readability";
import { replaceSourceConstants } from "../replaceSourceConstants";

describe("getText", () => {
  it("inserts periods at the end of titles", async () => {
    const source = `===============================
Delete a Realm File - Swift SDK
===============================

Some body text.

Delete a Realm File
-------------------

Some more body text.

Delete a Realm File During a Client Reset
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Body text right after a title line because?
`;
    const inputPath = "/some/path";
    const document = new MagicString(source);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    const scorableText = getText({
      inputPath,
      document,
      rst,
    });
    expect(scorableText).toStrictEqual([
      "Delete a Realm File - Swift SDK.\n",
      "Some body text.\n",
      "Delete a Realm File.\n",
      "Some more body text.\n",
      "Delete a Realm File During a Client Reset.\n",
      "Body text right after a title line because?\n",
    ]);
  });
  it("throws out option lines in directives", async () => {
    const source = `===============================
Delete a Realm File - Swift SDK
===============================

.. default-domain:: mongodb

.. contents:: On this page
    :local:
    :backlinks: none
    :depth: 2
    :class: singlecol

In some cases, you may want to completely delete a realm file from disk.
`;
    const inputPath = "/some/path";
    const document = new MagicString(source);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    const scorableText = getText({
      inputPath,
      document,
      rst,
    });
    expect(scorableText).toStrictEqual([
      "Delete a Realm File - Swift SDK.\n",
      "In some cases, you may want to completely delete a realm file from disk.\n",
    ]);
  });
  it("throws out ref links in text", async () => {
    const source = `Use Swift to idiomatically :ref:\`define an object schema <ios-define-a-realm-object-schema>\`.
`;
    const inputPath = "/some/path";
    const document = new MagicString(source);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    const scorableText = getText({
      inputPath,
      document,
      rst,
    });
    expect(scorableText).toStrictEqual([
      "Use Swift to idiomatically define an object schema .\n",
    ]);
  });
  it("adds punctuation to bullets", async () => {
    const source = `Before you can safely delete the file, you must ensure the deallocation of these objects:
    
- All objects read from or added to the realm
- All List and Results objects
- All ThreadSafeReference objects
- The realm itself
`;
    const inputPath = "/some/path";
    const document = new MagicString(source);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    const scorableText = getText({
      inputPath,
      document,
      rst,
    });
    expect(scorableText).toStrictEqual([
      "Before you can safely delete the file, you must ensure the deallocation of these objects:\n",
      "All objects read from or added to the realm.\n",
      "All List and Results objects.\n",
      "All ThreadSafeReference objects.\n",
      "The realm itself.\n",
    ]);
  });
  // This test isn't directly testing readability.ts, but instead using the
  // same logic as in readability.ts replacing source constants.
  it("replaces source constants", async () => {
    const source = `This is a source constant: {+java-sdk-version+}.`;
    const inputPath = "/some/path";
    const sourceConstant: Record<string, string> = {
      "java-sdk-version": "10.11.1",
    };
    const expandedText = replaceSourceConstants(source, sourceConstant);
    const document = new MagicString(expandedText);
    const rst = restructured.parse(document.original, {
      blanklines: true,
      indent: true,
      position: true,
    });
    const scorableText = getText({
      inputPath,
      document,
      rst,
    });
    expect(scorableText).toStrictEqual([
      "This is a source constant: 10.\n11.1.",
    ]);
  });
});
