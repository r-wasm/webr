# webR (development version)

## New features

* Improve accessibility of xterm.js in the webR REPL app by enabling `screenReaderMode`.

* Issue an output message of type `'closed'` when the webR communication channel closes.

* Build Cairo graphics library and its prerequisites for Wasm as part of the webR build process. This allows the default Cairo-based graphics devices in R, such as `png()`, `bmp()` and `svg()`, to work in webR.

* Build Pango text layout library and its prerequisites for Wasm. This provides modern text rendering features and better support for internationalisation (e.g. font-fallback and RTL scripts) for the Cairo-based bitmap graphics devices.

* Update webR's version of R to 4.3.0.

* Include additional type predicate functions for subclasses of `RObject`, such as `isRDouble()`. These can be used by TypeScript applications to narrow the typing of an `RObject`.

* Introduce lazy virtual filesystem entries. The webR filesystem is populated at initialisation time with only the files required to startup R. Other files made available (e.g. documentation and HTML pages) are downloaded on demand when the files are opened for reading by some process.

## Bug fixes

* The `REnv` property of a user provided `WebROptions` is now merged with the default value, rather than replacing it. With this a user need not explicitly include the default `R_HOME` value when adding new environment variables.

# webR 0.1.1

## Breaking changes
 * Rename the properties of `WebROptions` so that they are all in camelCase, consistent with the rest of the webR TypeScript source. We have made the decision to release the above breaking change quickly while there are still a relatively low number of affected users.

## Bug fixes

 * Improve compatibility when running webR under Node (#167 & #171).

 * Fix `chol()` with `pivot=TRUE` by working around a Fortran library issue.

# webR 0.1.0

Initial Release
