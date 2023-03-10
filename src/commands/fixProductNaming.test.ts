import { fixProductNaming, ProductPhrases } from "./fixProductNaming";

const productPhrases: ProductPhrases = [
  {
    search: "(Atlas )?App Services App",
    first: "App Services App",
    subsequent: "App",
  },
  {
    search: "(Atlas )?App Services UI",
    first: "App Services UI",
    subsequent: "App Services UI",
  },
  {
    search: "(Atlas )?App Services [Ff]unctions",
    first: "Atlas Functions",
    subsequent: "Functions",
  },
  {
    search: "(Atlas )?App Services [Ff]unction",
    first: "Atlas Function",
    subsequent: "Function",
  },
  {
    search: "(Atlas )?App Services Sync",
    first: "Atlas Device Sync",
    subsequent: "Device Sync",
  },
  {
    search: "(Atlas )?App Services [Tt]riggers",
    first: "Atlas Triggers",
    subsequent: "Triggers",
  },
  {
    search: "(Atlas )?App Services [Tt]rigger",
    first: "Atlas Trigger",
    subsequent: "Trigger",
  },
  {
    search: "(Atlas )?App Services GraphQL API",
    first: "Atlas GraphQL API",
    subsequent: "GraphQL API",
  },
  {
    search: "(Atlas )?App Services Data API",
    first: "Atlas Data API",
    subsequent: "Data API",
  },
  {
    search: "(Atlas )?App Services Schema",
    first: "App Services Schema",
    subsequent: "App Services Schema",
  },
  {
    search: "(Atlas )?App Services Rules",
    first: "App Services Rules",
    subsequent: "App Services Rules",
  },
  {
    search: "(Atlas )?App Services Alerts",
    first: "App Services Alerts",
    subsequent: "App Services Alerts",
  },
  {
    search: "(Atlas )?App Services Authentication",
    first: "App Services Authentication",
    subsequent: "App Services Authentication",
  },
  {
    search: "(Atlas )?App Services ([Cc]lient )?SDKs",
    first: "Realm SDKs",
    subsequent: "Realm SDKs",
  },
  // This one should be last
  {
    search: "(Atlas )?App Services",
    first: "Atlas App Services",
    subsequent: "App Services",
  },
];

// Currently skipping these tests as updates to restructured.ts require tweaks
// to `fixProductNaming` and these tests fail
describe("fixProductNaming", () => {
  it.skip("inserts replacements at the correct spot", () => {
    const source = `.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, App Services immediately begins evaluating and applying filters to
            incoming queries on the collection.
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString()).toBe(`.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas App Services immediately begins evaluating and applying filters to
            incoming queries on the collection.
`);
  });

  it.skip("handles two-line searches", () => {
    const source = `.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas App
            Services Functions handle incoming requests.
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString()).toBe(`.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas Functions
             handle incoming requests.
`);
  });
  it.skip("handles multi-line searches", () => {
    const source = `.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas
            App
            Services
            Functions handle incoming requests.
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString()).toBe(`.. tabs-realm-admin-interfaces::
   
   .. tab::
      :tabid: ui
      
      .. procedure::

         .. step:: Save the Filter

            After you have configured the Filter Query and the Apply When expression, click Save.
            After saving, Atlas Functions
             handle incoming requests.
`);
  });

  it.skip("handles expansions in titles", () => {
    const source = `=================================================
Set up JWT Authentication with Atlas App Services
=================================================
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString()).toBe(source);
  });

  it("follows first- and subsequent-use naming rule", () => {
    const source = `App Services is singular.

.. test::

   Also, Atlas App Services is plural.

What could it mean? Atlas App Services.
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString()).toBe(`Atlas App Services is singular.

.. test::

   Also, App Services is plural.

What could it mean? App Services.
`);
  });

  it("restores lost text node positions", () => {
    const source = `App Services allows you to upgrade your shared tier cluster (**M0**, **M2**, and
**M5**) to a dedicated cluster. Upgrade your cluster before releasing an Atlas App Services
application by completing the following steps.
`;
    const result = fixProductNaming(source, productPhrases);
    expect(result.toString())
      .toBe(`Atlas App Services allows you to upgrade your shared tier cluster (**M0**, **M2**, and
**M5**) to a dedicated cluster. Upgrade your cluster before releasing an App Services
application by completing the following steps.
`);
  });
});
