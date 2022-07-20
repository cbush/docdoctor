# typescript-cli-template
Typescript CLI template

## Readability

The `getReadabilityText` command takes an array of paths, the last of which
should be the `snooty.toml`. It parses each file in the array to convert
the rst to plain text. It outputs those files in an `output` directory as a 
same-named file in a directory structure matching the input path. 

For example, an rST file at `test/delete-a-realm.txt` outputs as plain text 
to `output/test/delete-a-realm.txt`.

In addition to converting the rST to plain text, this command removes 
markup and things that would skew readability scores, such as code examples.
It also adds punctuation to titles and makes other small tweaks to things
that would otherwise falsely impact the readability score of the page text.

### Todo
- Does not handle any directives, such as info or procedure - just throws out all text in the steps.
