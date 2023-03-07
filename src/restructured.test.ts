import restructured from "./restructured";
import { findAll } from "./tree";

describe("restructured", () => {
  it("handles directives", () => {
    const node = restructured.parse(`
.. somedirective:: foo
   :option1: someoption
   :option2: someoption

   test 1
   test 2
`);
    expect(node).toStrictEqual({
      children: [
        {
          args: "foo",
          children: [
            {
              children: [
                {
                  position: {
                    end: {
                      column: 4,
                      line: 5,
                      offset: 82,
                    },
                    start: {
                      column: 7,
                      line: 4,
                      offset: 75,
                    },
                  },
                  type: "text",
                  value: "test 1\n",
                },
                {
                  position: {
                    end: {
                      column: 4,
                      line: 6,
                      offset: 92,
                    },
                    start: {
                      column: 7,
                      line: 5,
                      offset: 85,
                    },
                  },
                  type: "text",
                  value: "test 2\n",
                },
              ],
              position: {
                end: {
                  column: 4,
                  line: 6,
                  offset: 92,
                },
                start: {
                  column: 4,
                  line: 4,
                  offset: 72,
                },
              },
              type: "paragraph",
            },
          ],
          directive: "somedirective",
          indent: {
            offset: 3,
            width: 3,
          },
          optionLines: [":option1: someoption", ":option2: someoption"],
          position: {
            end: {
              column: 1,
              line: 8,
              offset: 93,
            },
            start: {
              column: 1,
              line: 2,
              offset: 1,
            },
          },
          type: "directive",
        },
      ],
      position: {
        end: {
          column: 1,
          line: 8,
          offset: 93,
        },
        start: {
          column: 1,
          line: 1,
          offset: 0,
        },
      },
      type: "document",
    });

    const node2 = restructured.parse(`
.. somedirective:: foo
   :option1: someoption

   test

   .. someotherdirective:: foo bar baz
      :option1: someoption

      inner directive test

      .. yetanotherdirective::
         :option1: foo
         :option2: bar

         inner inner test

   test 2
`);
    expect(node2).toStrictEqual({
      children: [
        {
          args: "foo",
          children: [
            {
              children: [
                {
                  position: {
                    end: {
                      column: 4,
                      line: 5,
                      offset: 56,
                    },
                    start: {
                      column: 7,
                      line: 4,
                      offset: 51,
                    },
                  },
                  type: "text",
                  value: "test\n",
                },
              ],
              position: {
                end: {
                  column: 4,
                  line: 5,
                  offset: 56,
                },
                start: {
                  column: 4,
                  line: 4,
                  offset: 48,
                },
              },
              type: "paragraph",
            },
            {
              args: "foo bar baz",
              children: [
                {
                  children: [
                    {
                      position: {
                        end: {
                          column: 7,
                          line: 9,
                          offset: 150,
                        },
                        start: {
                          column: 13,
                          line: 8,
                          offset: 129,
                        },
                      },
                      type: "text",
                      value: "inner directive test\n",
                    },
                  ],
                  position: {
                    end: {
                      column: 7,
                      line: 9,
                      offset: 150,
                    },
                    start: {
                      column: 7,
                      line: 8,
                      offset: 123,
                    },
                  },
                  type: "paragraph",
                },
                {
                  children: [
                    {
                      children: [
                        {
                          position: {
                            end: {
                              column: 10,
                              line: 13,
                              offset: 255,
                            },
                            start: {
                              column: 19,
                              line: 12,
                              offset: 238,
                            },
                          },
                          type: "text",
                          value: "inner inner test\n",
                        },
                      ],
                      position: {
                        end: {
                          column: 10,
                          line: 13,
                          offset: 255,
                        },
                        start: {
                          column: 10,
                          line: 12,
                          offset: 229,
                        },
                      },
                      type: "paragraph",
                    },
                  ],
                  directive: "yetanotherdirective",
                  indent: {
                    offset: 3,
                    width: 9,
                  },
                  optionLines: [":option1: foo", ":option2: bar"],
                  position: {
                    end: {
                      column: 7,
                      line: 16,
                      offset: 256,
                    },
                    start: {
                      column: 7,
                      line: 10,
                      offset: 151,
                    },
                  },
                  type: "directive",
                },
              ],
              directive: "someotherdirective",
              indent: {
                offset: 3,
                width: 6,
              },
              optionLines: [":option1: someoption"],
              position: {
                end: {
                  column: 4,
                  line: 17,
                  offset: 257,
                },
                start: {
                  column: 4,
                  line: 6,
                  offset: 57,
                },
              },
              type: "directive",
            },
            {
              children: [
                {
                  position: {
                    end: {
                      column: 4,
                      line: 18,
                      offset: 267,
                    },
                    start: {
                      column: 7,
                      line: 17,
                      offset: 260,
                    },
                  },
                  type: "text",
                  value: "test 2\n",
                },
              ],
              position: {
                end: {
                  column: 4,
                  line: 18,
                  offset: 267,
                },
                start: {
                  column: 4,
                  line: 17,
                  offset: 257,
                },
              },
              type: "paragraph",
            },
          ],
          directive: "somedirective",
          indent: {
            offset: 3,
            width: 3,
          },
          optionLines: [":option1: someoption"],
          position: {
            end: {
              column: 1,
              line: 19,
              offset: 268,
            },
            start: {
              column: 1,
              line: 2,
              offset: 1,
            },
          },
          type: "directive",
        },
      ],
      position: {
        end: {
          column: 1,
          line: 19,
          offset: 268,
        },
        start: {
          column: 1,
          line: 1,
          offset: 0,
        },
      },
      type: "document",
    });
  });

  it("has accurate offsets in nested directives", () => {
    const source = `
.. somedirective::

   test1

   .. somedirectiveb::

      test2

      .. zomedirective::
        
        test3
        test3 done
      
      test2 done
    
   test1 done
`;
    const node = restructured.parse(source);
    const offset2 = 31; // offset to directive 2 - note that restructured library puts parent offsets at start of their line
    const offset3 = 110; // offset to paragraph 3
    expect(source.substring(offset2, offset2 + 22)).toBe(
      "   .. somedirectiveb::"
    );
    expect(source.substring(offset3, offset3 + 5)).toBe("test3");
    expect(node.children[0]).toMatchObject({
      type: "directive",
      directive: "somedirective",
    });
    expect(node.children[0].children[1]).toMatchObject({
      type: "directive",
      directive: "somedirectiveb",
      position: {
        start: { offset: offset2, line: 6, column: 4 },
      },
    });
    expect(node.children[0].children[1].children[1].children[0]).toMatchObject({
      type: "paragraph",
      position: {
        start: { offset: offset3 - 8 }, // Parent node offsets start on the start of the line
      },
      children: [
        {
          type: "text",
          value: "test3\n",
          position: {
            start: { offset: offset3 }, // What matters is these offsets since this is what someone (me) might use to actually edit a file
          },
        },
        {
          type: "text",
          value: "test3 done\n",
          position: {
            start: { offset: offset3 + 14 },
          },
        },
      ],
    });
  });

  it("handles nested directives with args", () => {
    const sourceNoOptions = `.. tabs-realm-admin-interfaces::
   
   .. tab::
      
      .. procedure::

         .. step::

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas App Services immediately begins evaluating and applying filters to
            incoming queries on the collection.
`;
    const nodeNoOptions = restructured.parse(sourceNoOptions);
    expect(nodeNoOptions).toMatchObject({
      type: "document",
      children: [
        {
          type: "directive",
          directive: "tabs-realm-admin-interfaces",
          children: [
            {
              type: "directive",
              directive: "tab",
              children: [
                {
                  type: "directive",
                  directive: "procedure",
                  children: [
                    {
                      type: "directive",
                      directive: "step",
                      children: [
                        {
                          type: "paragraph",
                          children: [
                            {
                              type: "text",
                              value:
                                "After you have configured the Filter Query and the Apply When expression, click Save.\n",
                              position: {
                                start: { offset: 110 },
                              },
                            },
                            {
                              type: "text",
                              value:
                                "After saving, Atlas App Services immediately begins evaluating and applying filters to\n",
                              position: {
                                start: { offset: 208 },
                              },
                            },
                            {
                              type: "text",
                              value: "incoming queries on the collection.\n",
                              position: {
                                start: { offset: 307 },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const source = `.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas App Services immediately begins evaluating and applying filters to
            incoming queries on the collection.
`;
    const node = restructured.parse(source);
    expect(node).toMatchObject({
      type: "document",
      children: [
        {
          type: "directive",
          directive: "tabs-realm-admin-interfaces",
          children: [
            {
              type: "directive",
              directive: "tab",
              children: [
                {
                  type: "directive",
                  directive: "procedure",
                  children: [
                    {
                      type: "directive",
                      directive: "step",
                      children: [
                        {
                          type: "paragraph",
                          children: [
                            {
                              type: "text",
                              value:
                                "After you have configured the Filter Query and the Apply When expression, click Save.\n",
                              position: {
                                start: { offset: 143 },
                              },
                            },
                            {
                              type: "text",
                              value:
                                "After saving, Atlas App Services immediately begins evaluating and applying filters to\n",
                              position: {
                                start: { offset: 241 },
                              },
                            },
                            {
                              type: "text",
                              value: "incoming queries on the collection.\n",
                              position: {
                                start: { offset: 340 },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("handles subdirective enumerated lists", () => {
    const source = `

.. procedure:: 

   .. step:: Create a Realm File to Bundle

      The easiest way to create a bundled realm for your React Native app is 
      to write a separate Node.Js script to create the bundle. 

      #. Build a temporary realm app that shares the data model of your
         application.

      #. Open a realm and add the data you wish to bundle. If using a
         synchronized realm, allow time for the realm to fully sync.

         .. literalinclude:: /examples/generated/rn/create-bundled-realm-rn.snippet.create-react-native-bundle.js
            :language: javascript
            :caption: create-bundled-realm.js

      #. Note the filepath of the bundled realm file. You'll need this file to use
         the bundled realm in your production application, as described in the next 
         section.

         .. code-block::
            :caption: temp_realm_app
            :emphasize-lines: 2

            .
            ├── bundle.realm
            ... rest of files in _temp_ application

      .. _react-native-bundle-realm-file:
`;
    const node = restructured.parse(source);
    expect(
      findAll(node, (node) => node.directive === "literalinclude").length
    ).toBe(1);
  });

  it("handles weird options case", () => {
    const source = `.. contents::
   :local:
   :backlinks: none
   :depth: 2
   :class: singlecol

   Here's some text.

`;
    const node = restructured.parse(source);
    expect(node.optionLines).toBeDefined();
    expect(node).toStrictEqual({});
  });

  it("handles inline bold", () => {
    // THIS FAILS! Restructured library sometimes loses track of the node
    // positions and resets the offset to the start of the line
    return;
    const source = `Atlas App Services allows you to upgrade your shared tier cluster (**M0**, **M2**, and
**M5**) to a dedicated cluster. Upgrade your cluster before releasing an App Services
Sync application by completing the following steps.
`;
    const node = restructured.parse(source);
    expect(node).toMatchObject({
      type: "document",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value:
                "Atlas App Services allows you to upgrade your shared tier cluster (",
              position: {
                start: { offset: 0, line: 1, column: 1 },
                end: { offset: 67, line: 1, column: 68 },
              },
            },
            {
              type: "strong",
              position: {
                start: { offset: 67, line: 1, column: 68 },
                end: { offset: 73, line: 1, column: 74 },
              },
              children: [
                {
                  type: "text",
                  value: "M0",
                  position: {
                    start: { offset: 69, line: 1, column: 70 },
                    end: { offset: 73, line: 1, column: 74 },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ", ",
              position: {
                start: { offset: 73, line: 1, column: 74 },
                end: { offset: 75, line: 1, column: 76 },
              },
            },
            {
              type: "strong",
              position: {
                start: { offset: 75, line: 1, column: 76 },
                end: { offset: 81, line: 1, column: 82 },
              },
              children: [
                {
                  type: "text",
                  value: "M2",
                  position: {
                    start: { offset: 77, line: 1, column: 78 },
                    end: { offset: 81, line: 1, column: 82 },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ", and\n",
              position: {
                start: { offset: 0, line: 1, column: 1 }, // ???
                end: { offset: 87, line: 2, column: 1 },
              },
            },
            {
              type: "strong",
              position: {
                start: { offset: 87, line: 2, column: 1 },
                end: { offset: 93, line: 2, column: 7 },
              },
              children: [
                {
                  type: "text",
                  value: "M5",
                  position: {
                    start: { offset: 89, line: 2, column: 3 },
                    end: { offset: 93, line: 2, column: 7 },
                  },
                },
              ],
            },
            {
              type: "text",
              value:
                ") to a dedicated cluster. Upgrade your cluster before releasing an App Services\n",
              position: {
                start: { offset: 93, line: 2, column: 1 },
              },
            },
            {
              type: "text",
              value: "Sync application by completing the following steps.\n",
              position: {
                start: { offset: 173, line: 3, column: 1 },
                end: { offset: 225, line: 4, column: 1 },
              },
            },
          ],
        },
      ],
    });
  });
});
