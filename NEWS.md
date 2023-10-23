# webR (development version)

## New features

* Updated `Dockerfile` to build webR with LLVM flang and setup environment in preparation for building Wasm R packages. The docker image is now built and published by GitHub Actions as part of webR CI deployment from the `main` branch.

* The base R function `install.packages()` is has now been shimmed to use `webr::install()`.

* Expose Emscripten's `FS.mount()` on `webr::mount` in R, and `webR.FS.mount()` in JavaScript. This allows images built using Emscripten's `file_packager` to be mounted on the virtual filesystem and host directory paths to be mounted when running under Node.

* By default, `webr::install()` now uses `webr::mount()` to mount Wasm R packages into the R library, rather than downloading package `.tgz` archives and decompressing the contents to the virtual filesystem. This improves the performance of package installation. If the package repository does not provide `.data` Emscripten filesystem images, `webr::install()` will fallback to downloading `.tgz` packages, as before.

## Breaking changes

* When starting webR using the `ChannelType.Automatic` channel (the default), the `PostMessage` channel is now used as the fallback when the web page is not Cross-Origin Isolated. The `PostMessage` channel has the widest compatibility, but is unable to use functions that block for input (e.g. `readline()`, `menu()`, `browser()`, etc). If blocking for input is required, the `ServiceWorker` channel is still available, but must be requested explicitly.

* Invoking the `system()` function now raises an R error condition.

* Invoking functions that block for input now raises an R error condition when running under the `PostMessage` communication channel.

## Bug fixes

* Certain graphical properties, e.g `lty` & `lwd`, now work correctly in the webR `canvas()` graphics device. (#289, #304).

# webR 0.2.1

## New features

* Added a new communication channel based on `postMessage`, to be used when both Cross Origin Isolation and Service Workers are unavailable. Nested R REPLs (e.g. `readline()`, `menu()`, `browser()`, etc.) are unsupported when using this channel.

## Bug fixes

* Fix HTML canvas graphics in `Console` class (#256).

* Fix drawing rasters in HTML canvas graphics device (#251).

* Remove no-longer valid references to `repl.mjs` in `package.json` (#250).

* Ensure that the one-time setup required for the `WebR` class occurs only once when calling `webR.init()`.

# webR 0.2.0

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

 * The webR npm package has been renamed from '@r-wasm/webr' to simply 'webr'. An npm depreciation notice will be put in place for the old package name.

 * Removed the legacy `console.mjs` build target. The `Console` class is re-exported on the default `WebR` entrypoint, and so the extra build target is not required. This is technically a breaking change, but the legacy entrypoint was never documented and so we believe the change has only minor effect.

 * The webR HTML `canvas()` graphics device has been moved from the default grDevices package to the webr support package. In addition, it has been reimplemented using the `OffscreenCanvas` API. Users of the Safari web browser will now require at least version 16.4 (the latest stable release at time of writing) to use the canvas graphics device. Users with older browsers not supporting `OffscreenCanvas` will need to use an alternative plotting method, such as bitmap graphics using the `png()` Cairo device.

 * Output messages from the `canvas()` graphics device have been restructured so as to handle more event types in addition to transmitting image bitmap data. For example, an output message is now also emitted when the device creates a new empty plot. WebR apps making use of HTML canvas graphics will need to be updated for the new message structure. See the newly added "Plotting" section in the webR documentation for further details.

 * The version of Emscripten used to build the public webR binaries hosted on r-wasm.org and npm has been set to v3.1.37. R packages built for Wasm should be compiled with this same version of Emscripten to ensure Wasm ABI compatibility.

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
