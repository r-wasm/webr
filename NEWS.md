# webR (development version)

## New features

* Improve accessibility of xterm.js in the webR REPL app by enabling `screenReaderMode`.

* Issue an output message of type `'closed'` when the webR communication channel closes.

* Build Cairo graphics library and its prerequisites for Wasm as part of the webR build process. This allows the default Cairo-based graphics devices in R, such as `png()`, `bmp()` and `svg()`, to work in webR.

* Build Pango text layout library and its prerequisites for Wasm. This provides modern text rendering features and better support for internationalisation (e.g. font-fallback and RTL scripts) for the Cairo-based bitmap graphics devices.

* Update webR's version of R to 4.3.0.

* Include additional type predicate functions for subclasses of `RObject`, such as `isRDouble()`. These can be used by TypeScript applications to narrow the typing of an `RObject` without assertion using the `as` keyword. The new type predicate functions have also been re-exported through the default `WebR` module.

* Introduce lazy virtual filesystem entries. The webR filesystem is populated at initialisation time with only the files required to startup R. Other files made available (e.g. documentation and HTML pages) are downloaded on demand when the files are opened for reading by some process. The optional lazy filesystem entries can be avoided in entirety by setting `createLazyFilesystem: false` in `WebROptions`.

* Add a `quiet` argument to `webr::install()` and `webR.installPackages()` APIs that allows for silencing webR package downloading messages.

* Add custom `WebRError` classes so that errors from webR can be identified by testing thrown exceptions with `instanceof WebRError`.

* Reimplemented the demo webR REPL app using the React framework, allowing us to drop jQuery as a dependency. The reworked app has various new features and improvements: now includes a tabbed CodeMirror editor with R syntax highlighting and autocomplete, support for text document paging and displaying built-in R help/demos/documentation, expanded UI for virtual filesystem management, improved plot handling including paged multiple plots.

## Breaking changes

 * Removed the legacy `console.mjs` build target. The `Console` class is re-exported on the default `WebR` entrypoint, and so the extra build target is not required. This is technically a breaking change, but the legacy entrypoint was never documented and so we believe the change has only minor effect.

 * The webR HTML `canvas()` graphics device has been moved from the default grDevices package to the webr support package. In addition, it has been reimplemented using the `OffscreenCanvas` API. Users of the Safari web browser will now require at least version 16.4 (the latest stable release at time of writing) to use the canvas graphics device. Users with older browsers not supporting `OffscreenCanvas` will need to use an alternative plotting method, such as bitmap graphics using the `png()` Cairo device.

 * Output messages from the `canvas()` graphics device have been restructured so as to handle more event types in addition to transmitting image bitmap data. For example, an output message is now also emitted when the device creates a new empty plot. WebR apps making use of HTML canvas graphics will need to be updated for the new message structure. See the newly added "Plotting" section in the webR documentation for further details.

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
