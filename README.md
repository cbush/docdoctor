# Docdoctor

A tool for hacking rST

## Build & Run

Clone the repo, then:

```sh
cd docdoctor
npm install
npm run build
node . --help
```

## Commands (Incomplete List)

### Readability

The `getReadabilityText` command takes file paths as arguments, delimited 
by spaces. The last file path in the arguments should be the 
`snooty.toml`. This command parses traverses nodes in each file to convert
the rst to plain text. It outputs the plain text for each file as a new file
 in an `output` directory, using the same name and directory structure as the 
input path. 

For example, an rST file at `test/delete-a-realm.txt` outputs as plain text 
to `output/test/delete-a-realm.txt`.

In addition to converting the rST to plain text, this command removes 
markup and things that would skew readability scores, such as code examples.
It also adds punctuation to titles and makes other small tweaks to things
that would otherwise falsely impact the readability score of the page text.

## Todo
- Currently does not handle any directives, such as info or procedure - just throws out all text in the steps.
