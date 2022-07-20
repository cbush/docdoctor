# typescript-cli-template
Typescript CLI template

## Readability

The `getReadabilityText` command takes an array of paths, the last of which
should be the `snooty.toml`. It parses each file in the array to convert
the rst to plain text. It outputs those files in an `output` directory as a 
same-named file in a directory structure matching the input path. 
