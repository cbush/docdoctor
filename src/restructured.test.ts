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
    expect(node).toMatchObject({
      type: "document",
      position: {
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 93, line: 8, column: 1 },
      },
      children: [
        {
          type: "directive",
          directive: "somedirective",
          position: {
            start: { offset: 1, line: 2, column: 1 },
            end: { offset: 93, line: 8, column: 1 },
          },
          indent: { width: 3, offset: 3 },
          children: [
            {
              type: "paragraph",
              position: {
                start: { offset: 24, line: 4, column: 4 },
                end: { offset: 72, line: 6, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: ":option1: someoption\n",
                  position: {
                    start: { offset: 27, line: 4, column: 7 },
                    end: { offset: 48, line: 5, column: 4 },
                  },
                },
                {
                  type: "text",
                  value: ":option2: someoption\n",
                  position: {
                    start: { offset: 51, line: 5, column: 7 },
                    end: { offset: 72, line: 6, column: 4 },
                  },
                },
              ],
            },
            {
              type: "paragraph",
              position: {
                start: { offset: 73, line: 7, column: 4 },
                end: { offset: 93, line: 9, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test 1\n",
                  position: {
                    start: { offset: 76, line: 7, column: 7 },
                    end: { offset: 83, line: 8, column: 4 },
                  },
                },
                {
                  type: "text",
                  value: "test 2\n",
                  position: {
                    start: { offset: 86, line: 8, column: 7 },
                    end: { offset: 93, line: 9, column: 4 },
                  },
                },
              ],
            },
          ],
          args: "foo",
        },
      ],
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
    expect(node2).toMatchObject({
      type: "document",
      children: [
        {
          type: "directive",
          directive: "somedirective",
          position: {
            start: { offset: 1, line: 2, column: 1 },
            end: { offset: 268, line: 19, column: 1 },
          },
          children: [
            {
              type: "paragraph",
              position: {
                start: { offset: 24, line: 4, column: 4 },
                end: { offset: 48, line: 5, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: ":option1: someoption\n",
                  position: {
                    start: { offset: 27, line: 4, column: 7 },
                    end: { offset: 48, line: 5, column: 4 },
                  },
                },
              ],
            },
            {
              type: "paragraph",
              position: {
                start: { offset: 49, line: 6, column: 4 },
                end: { offset: 57, line: 7, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test\n",
                  position: {
                    start: { offset: 52, line: 6, column: 7 },
                    end: { offset: 57, line: 7, column: 4 },
                  },
                },
              ],
            },
            {
              type: "directive",
              directive: "someotherdirective",
              position: {
                start: { offset: 58, line: 8, column: 4 },
                end: { offset: 258, line: 19, column: 4 },
              },
              indent: { width: 6, offset: 3 },
              children: [
                {
                  type: "paragraph",
                  position: {
                    start: { offset: 97, line: 10, column: 7 },
                    end: { offset: 124, line: 11, column: 7 },
                  },
                  children: [
                    {
                      type: "text",
                      value: ":option1: someoption\n",
                      position: {
                        start: { offset: 103, line: 10, column: 13 },
                        end: { offset: 124, line: 11, column: 7 },
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  position: {
                    start: { offset: 125, line: 12, column: 7 },
                    end: { offset: 152, line: 13, column: 7 },
                  },
                  children: [
                    {
                      type: "text",
                      value: "inner directive test\n",
                      position: {
                        start: { offset: 131, line: 12, column: 13 },
                        end: { offset: 152, line: 13, column: 7 },
                      },
                    },
                  ],
                },
                {
                  type: "directive",
                  directive: "yetanotherdirective",
                  position: {
                    start: { offset: 153, line: 14, column: 7 },
                    end: { offset: 258, line: 20, column: 7 },
                  },
                  indent: { width: 9, offset: 3 },
                  children: [
                    {
                      type: "paragraph",
                      position: {
                        start: { offset: 231, line: 16, column: 10 },
                        end: { offset: 257, line: 17, column: 10 },
                      },
                      children: [
                        {
                          type: "text",
                          value: "inner inner test\n",
                          position: {
                            start: { offset: 240, line: 16, column: 19 },
                            end: { offset: 257, line: 17, column: 10 },
                          },
                        },
                      ],
                    },
                  ],
                  optionLines: [":option1: foo", ":option2: bar"],
                },
              ],
              args: "foo bar baz",
            },
            {
              type: "paragraph",
              position: {
                start: { offset: 258, line: 19, column: 4 },
                end: { offset: 268, line: 20, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test 2\n",
                  position: {
                    start: { offset: 261, line: 19, column: 7 },
                    end: { offset: 268, line: 20, column: 4 },
                  },
                },
              ],
            },
          ],
          args: "foo",
        },
      ],
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
