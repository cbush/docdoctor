import restructured from "./restructured";

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
                start: { offset: 70, line: 6, column: 4 },
                end: { offset: 84, line: 8, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test 1\n",
                  position: {
                    start: { offset: 70, line: 6, column: 4 },
                    end: { offset: 77, line: 7, column: 4 },
                  },
                },
                {
                  type: "text",
                  value: "test 2\n",
                  position: {
                    start: { offset: 77, line: 7, column: 4 },
                    end: { offset: 84, line: 8, column: 4 },
                  },
                },
              ],
            },
          ],
          args: "foo",
          optionLines: [":option1: someoption", ":option2: someoption"],
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
    expect(node2).toStrictEqual({
      type: "document",
      position: {
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 268, line: 19, column: 1 },
      },
      children: [
        {
          type: "directive",
          directive: "somedirective",
          position: {
            start: { offset: 1, line: 2, column: 1 },
            end: { offset: 268, line: 19, column: 1 },
          },
          indent: { width: 3, offset: 3 },
          children: [
            {
              type: "paragraph",
              position: {
                start: { offset: 49, line: 5, column: 4 },
                end: { offset: 54, line: 6, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test\n",
                  position: {
                    start: { offset: 49, line: 5, column: 4 },
                    end: { offset: 54, line: 6, column: 4 },
                  },
                },
              ],
            },
            {
              type: "directive",
              directive: "someotherdirective",
              position: {
                start: { offset: 55, line: 7, column: 4 },
                end: { offset: 234, line: 18, column: 4 },
              },
              indent: { width: 3, offset: 6 },
              children: [
                {
                  type: "paragraph",
                  position: {
                    start: { offset: 116, line: 10, column: 7 },
                    end: { offset: 137, line: 11, column: 7 },
                  },
                  children: [
                    {
                      type: "text",
                      value: "inner directive test\n",
                      position: {
                        start: { offset: 116, line: 10, column: 7 },
                        end: { offset: 137, line: 11, column: 7 },
                      },
                    },
                  ],
                },
                {
                  type: "directive",
                  directive: "yetanotherdirective",
                  position: {
                    start: { offset: 138, line: 12, column: 7 },
                    end: { offset: 219, line: 18, column: 7 },
                  },
                  indent: { width: 3, offset: 9 },
                  children: [
                    {
                      type: "paragraph",
                      position: {
                        start: { offset: 195, line: 16, column: 10 },
                        end: { offset: 212, line: 17, column: 10 },
                      },
                      children: [
                        {
                          type: "text",
                          value: "inner inner test\n",
                          position: {
                            start: { offset: 195, line: 16, column: 10 },
                            end: { offset: 212, line: 17, column: 10 },
                          },
                        },
                      ],
                    },
                  ],
                  optionLines: [":option1: foo", ":option2: bar"],
                },
              ],
              args: "foo bar baz",
              optionLines: [":option1: someoption"],
            },
            {
              type: "paragraph",
              position: {
                start: { offset: 234, line: 18, column: 4 },
                end: { offset: 241, line: 19, column: 4 },
              },
              children: [
                {
                  type: "text",
                  value: "test 2\n",
                  position: {
                    start: { offset: 234, line: 18, column: 4 },
                    end: { offset: 241, line: 19, column: 4 },
                  },
                },
              ],
            },
          ],
          args: "foo",
          optionLines: [":option1: someoption"],
        },
      ],
    });
  });
});
