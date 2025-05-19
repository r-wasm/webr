# webR (development version)

## New features

* Updated to R version 4.5.0.

## Breaking changes

* Updated to Emscripten version 4.0.8.

* Updated the base LLVM distribution to LLVM 20, rebasing our Fortran for WebAssembly patches on the latest release of LLVM at time of writing (v20.1.4). The LLVM Fortran compiler binary name is now `flang` and webR's build scripts have been updated to reflect this.

* Errors of type `WebRWorkerError` initially caused by Emscripten filesystem errors are now raised with message `"ErrnoError: n"`, where `n` is the error number, rather than the generic `"FS Error"` message.

# webR 0.4.3

## New features

* Added support for mounting JupyterLite DriveFS filesystems within the webR JupyterLite kernel (#533).

* Updated to R version 4.4.2 (#498).

## Breaking changes

* The `webr::eval_js()` function can now return other types of R object, not just scalar integers. Returned JavaScript objects are converted to R objects using the `RObject` generic constructor, and specific R object types can be returned by invoking the R object constructor directly in the evaluated JavaScript.

* When explicitly creating a list using the `RList` constructor, nested JavaScript objects at a deeper level are also converted into R list objects. This does not affect the generic `RObject` constructor, as the default is for JavaScript objects to map to R `data.frame` objects using the `RDataFrame` constructor.

## Bug Fixes

* Added a workaround for compiling against older FreeType (#485).

* (Regression) Mounting filesystem images using the `WORKERFS` filesystem type now works again in the browser using the JavaScript API from the main thread (#488).

# webR 0.4.2

## New features

* Added support for directly mounting (optionally compressed) `.tar` archives as filesystem images. Archives must be pre-processed using the `rwasm` R package to append filesystem image metadata to `.tar` archive data.

## Breaking changes

* When installing binary R packages, webR will now default to mounting the R package binary `.tgz` file as a filesystem image. If this fails (e.g. the `.tgz` has not been processed to add filesystem image metadata) webR will fall back to a traditional install by extracting the contents of the `.tgz` file.

## Bug Fixes

* Mounting filesystem images using the `WORKERFS` filesystem type now works correctly under Node.js (#328).

# webR 0.4.1

## New features

* When mounting Emscripten VFS images, filesystem `.data` files may be optionally `gzip` compressed. Compressed VFS filesystem data must have the file extension `.data.gz`, and the metadata JSON stored in the `.js.metadata` file must include the property `gzip: true` (#460).

## Breaking changes

* R package dependencies listed only in the `LinkingTo` field are no longer downloaded by `webr::install()`. Such packages are required for building an R package, but not at runtime. This saves time and network resources when installing R packages from a WebAssembly CRAN-like repository (#463).

* Unrecoverable `WebAssembly.RuntimeError` errors are now handled by emitting an error message, closing the communication channel, and terminating the webR worker thread.

* When the communication channel has been closed, reject any attempts to to write to the channel (e.g. `webR.evalR()`, `webR.writeConsole()`) with a relevant error message, rather than not resolving the returned `Promise` at all.

## Bug Fixes

* Partially revert 7c624f7, returning HTML Canvas scaling to the behaviour in webR 0.3.3.

# webR 0.4.0

## New features

* Updated to R version 4.4.1.

* The capturing mechanism of `captureR()` has been updated so that memory reallocation is performed when outputting very long lines. If reallocation is not possible (e.g. the environment does not have enough free memory to hold the entire line), the previous behaviour of truncating the line output is maintained (#434).

* Enabled the Emscripten IDBFS virtual filesystem driver. This filesystem type can be used to persist data in web browser storage across page reloads. This filesystem type must be used with the `PostMessage` communication channel (#56, #442).

* Added resizable panels to the webR application (#396). The `canvas()` graphics device is now resized dynamically to fit to the plotting pane.

* The R `View()` command now invokes a simple data grid viewer in the webR application.

* A function `viewer_install()` is added to the webR support package. The function sets up R so as to generate an output message over the webR communication channel when a URL viewer is invoked (#295).

* Printing a HTML element or HTML widget in the webR application app now shows the HTML content in an embedded viewer `iframe` (#384, #431). With thanks to @timelyportfolio for the basic [implementation method](https://www.jsinr.me/2024/01/10/selfcontained-htmlwidgets/).

* The webR application now allows users to download an archive of a directory and its contents from the virtual filesystem (#388).

## Breaking changes

* The `ServiceWorker` communication channel has been deprecated. Users should use the `SharedArrayBuffer` channel where cross-origin isolation is possible, or otherwise use the `PostMessage` channel. For the moment the `ServiceWorker` channel can still be used, but emits a warning at start up. The channel will be removed entirely in a future version of webR.

* The R session is now set as non-interactive when capturing output using `captureR()` and `evalR()`. After output capture is complete, the status is restored (#426).

## Bug Fixes

* Fix generation of R API documentation (#439).

* The `rwasm` R package is now installed into the system library as part of the webR development Docker container (#443, r-wasm/actions#10).

* `webR.installPackages()` now correctly handles both `string` and `string[]` arguments for package names and binary repositories (#437).

* Resolved several syntax highlighting and code completion issues in the webR application.

# webR 0.3.3

## New features

* A `webR.version` property has been added, containing the current version and build information (#409).

* An `RObject.class()` method has been added, returning an `RCharacter` object with the names of the classes from which the given R object inherits. This has been implemented using R's `class()` function, and so the implicit class is similarly returned when the R object has no `class` attribute.

* WebR now sets the environment variable `WEBR` equal to `"1"` and `WEBR_VERSION` equal to the webR version string in the WebAssembly environment (#414).

* Dev tools: Running `make help` now prints valid targets and their descriptions (#410).

## Bug Fixes

* Fix installing packages via shim with `character.only = TRUE` (#413).

* WebR will now flush incomplete lines when capturing output streams with `Shelter.captureR()` (#412).

* Fix the `types` specification in `package.json` for the webR npm package (#404).

# webR 0.3.2

## New features

* The `captureGraphics` option in `EvalROptions` now allows the caller to set the arguments to be passed to the capturing `webr::canvas()` device (#390).

* A subclass `RDataFrame` is now available for explicit construction of an R object with class `data.frame`. `RDataFrame` extends the `RList` class, and construction must be with data that can be coerced into an R `data.frame`, otherwise an error is thrown.

* The `RList` constructor now takes an optional second argument to define names when constructing a list. The argument should be an array of strings, or `null` for an unnamed list (the default).

## Breaking changes

* When using the generic `RObject` constructor, JavaScript objects and object arrays are now reserved for constructing an R `data.frame`. To create a standard R list, use the `RList` constructor directly (#398).

## Bug Fixes

* When capturing graphics with `captureR()`, clean-up now occurs even when the evaluated R code throws an error. This avoids leaking graphics devices on the device stack.

* Use backticks when reporting an R call as part of an error message (#397).

# webR 0.3.1

Hotfix release to manage incompatible WebAssembly binary R packages due to ABI changes in Emscripten.

# webR 0.3.0

## New features

* Updated to R version 4.3.3.

* Support for building webR and LLVM Flang as Nix packages, using Nix flakes.

* WebR's `./configure` script now detects the presence of a `EMFC` environment variable in the user's environment. If this variable points to an existing `flang-new` binary, and a Fortran runtime library for WebAssembly can also be found, webR will skip building LLVM flang and instead use the version provided by the environment.

* Additional optional Wasm system libraries for linking with R packages: libsodium (#333), webp (#334), imagemagick (#336), libarchive; lz4; zstd (#337), gmp; mpfr; glpk (#339), gsl (#340), libgit2 (#342).

* The webR development Docker container now contains a Rust toolchain configured to produce binaries for the `wasm32-unknown-emscripten` target, enabling the building of R packages containing Rust code for webR.

* The `webr::canvas()` graphics device has a new argument `capture`, defaulting to `FALSE`. When `TRUE`, plots are captured into a canvas cache on the webR worker thread. The cache may be accessed from JavaScript through `Module.webr.canvas`. Entries in the canvas cache are destroyed using `webr::canvas_purge()` or `webr::canvas_destroy(id)`. In this way, the `captureR()` method now captures plots by default (see below).

* The `RCall` and `RFunction` classes now have a `capture(options, ...args)` method that captures output during evaluation.

* Errors re-thrown by `evalR` now include information about the source R call, helping to identify the original location of the error.

* JavaScript objects of type `TypedArray`, `ArrayBuffer`, and `ArrayBufferView` (e.g. `Uint8Array`) may now be used with the `RRaw` R object constructor. The generic `RObject` constructor now converts objects of this type to R raw atomic vectors by default.

* Constructing new R objects using `await new RObject(...)` now supports input objects of the form: `{a: [...], b: [...]}` or D3-style data arrays of the form: `[{a: ..., b: ...}, {a: ..., b: ...}, {a: ..., b: ...}, ... ]`. Where possible, lists are constructed of class `data.frame`. Direct construction with `RList()` does not create a `data.frame`.

* R `data.frame` objects may be converted into D3-style data arrays using the new R list object method `.toD3()`.

## Breaking changes

* The `captureR()` method now captures plots generated by the canvas graphics device by default. Captured plots are returned as an array of `ImageBitmap` objects in the property `images`. The previous behaviour may be restored either by manually starting a non-capturing `webr::canvas()` device during execution, or by including `captureGraphics: false` as part of the `options` argument. The default options for `evalR()` are set so that plotting is not captured, retaining the current behaviour.

* Upgraded the base LLVM distribution from LLVM 14 to LLVM 18, rebasing our Fortran for WebAssembly patches on the latest release of LLVM at time of writing (v18.1.1). The LLVM Fortran compiler binary name is now `flang-new` and webR's build scripts have been updated to reflect this. The `emfc` wrapper script is no longer required, but for the moment the Make variable pointing to the `flang-new` compiler is still named `EMFC` for backwards compatibility.

* The LLVM flang build scripts are now sourced using a git submodule, to simplify management of CI builds. The build scripts are available at https://github.com/r-wasm/flang-wasm and the patched LLVM source at https://github.com/r-wasm/llvm-project. This allows for an independent build of the patched LLVM flang for WebAssembly, including as a separate Nix package.

* `shim_install()` now shims base R `library()` and `require()` commands so that webR packages are downloaded automatically with an optional menu. This extends the functionality of the global package-not-found handler so that the same feature can be used when using `evalR()` (#324). The new shims also ensure that `library()` and `require()` do not need to be called again once the package is downloaded and available.

* It is no longer assumed that an interactive R session will be able to show a `menu()` when offering to download a missing R package. Instead this now defaults to not showing a menu, with `options(webr.show_menu = TRUE)` enabling the menu feature globally.

* The `RObject.toObject()` methods have been refined for R lists and `data.frame` objects. The `.toObject()` method no longer uses recursion by default when converting R lists and environments, due to the possibility of unconvertible nested R objects. However, for symbols, atomic vectors, and R `data.frame` objects `.toObject()` will convert the object to JavaScript in entirety. For a type-stable conversion, serialise the object with the `.toJs()` method instead.

## Bug Fixes

* Fix showing content of lazy loaded files in webR demo app editor component (#320).

* Contents of the code editor in the webR REPL application is now sourced as a temporary file, allowing for input longer than the default R console input buffer length (#326).

* R error conditions raised during evaluation of an `RCall` or `RFunction` object are now re-thrown as JavaScript exceptions.

* Fixed spelling errors in some JavaScript errors thrown by webR.

* Useful POSIX scripts from libraries compiled for Wasm are now copied to `$(HOST)/bin` so that `$(WASM)/bin` does not need to be put on the path when building Wasm R packages (#327).

* The `symbols.rds` make target should now work when building R packages using `rwasm` (r-wasm/rwasm#13).

* Rasters with negative width or height are now drawn mirrored or flipped when using the canvas graphics device (#350).

* Include `cex` parameters when calculating font size in canvas graphics device (#348).

# webR 0.2.2

## New features

* Updated `Dockerfile` to build webR with LLVM flang and setup environment in preparation for building Wasm R packages. The docker image is now built and published by GitHub Actions as part of webR CI deployment from the `main` branch.

* The base R function `install.packages()` is has now been shimmed to use `webr::install()`.

* Expose Emscripten's `FS.mount()` on `webr::mount` in R, and `webR.FS.mount()` in JavaScript. This allows images built using Emscripten's `file_packager` to be mounted on the virtual filesystem and host directory paths to be mounted when running under Node.

* By default, `webr::install()` now uses `webr::mount()` to mount Wasm R packages into the R library, rather than downloading package `.tgz` archives and decompressing the contents to the virtual filesystem. This improves the performance of package installation. If the package repository does not provide `.data` Emscripten filesystem images, `webr::install()` will fallback to downloading `.tgz` packages, as before.

## Breaking changes

* When starting webR using the `ChannelType.Automatic` channel (the default), the `PostMessage` channel is now used as the fallback when the web page is not Cross-Origin Isolated. The `PostMessage` channel has the widest compatibility, but is unable to use functions that block for input (e.g. `readline()`, `menu()`, `browser()`, etc). If blocking for input is required, the `ServiceWorker` channel is still available, but must be requested explicitly.

* Invoking the `system()` function now raises an R error condition.

* Invoking functions that block for input now raises an R error condition when running under the `PostMessage` communication channel.

* Options are now passed to the JavaScript function `webR.installPackages()` in the form of an `options` argument, an object of type `InstallPackagesOptions`.

## Bug fixes

* Certain graphical properties, e.g `lty` & `lwd`, now work correctly in the webR `canvas()` graphics device. (#289, #304).

* Various updates for the webR Demo App to improve accessibility. (#267, #269, #270, #271, #272, #273, #274).

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
