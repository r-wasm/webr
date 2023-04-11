# webR (development version)

* Improve accessibility of xterm.js in the webR REPL app by enabling `screenReaderMode`.
* Issue an output message of type `'closed'` when the webR communication channel closes.
* Build Cairo graphics library and its prerequisites for Wasm as part of the webR build process. This allows the default Cairo-based graphics devices in R, such as `png()`, `bmp()` and `svg()`, to work in webR.
* Update webR's version of R to 4.3.0.
* Include additional type predicate functions for subclasses of `RObject`, such as `isRDouble()`. These can be used by TypeScript applications to narrow the typing of an `RObject`.

# webR 0.1.1

## Breaking changes
 * Rename the properties of `WebROptions` so that they are all in camelCase, consistent with the rest of the webR TypeScript source. We have made the decision to release the above breaking change quickly while there are still a relatively low number of affected users.

## Bug fixes

 * Improve compatibility when running webR under Node (#167 & #171).

 * Fix `chol()` with `pivot=TRUE` by working around a Fortran library issue.

# webR 0.1.0

Initial Release
