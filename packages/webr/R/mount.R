#' Mount an Emscripten filesystem object
#'
#' @description
#' Uses the Emscripten filesystem API to mount a filesystem object onto a given
#' directory in the virtual filesystem. The mountpoint will be created if it
#' does not already exist.
#'
#' When mounting an Emscripten "workerfs" type filesystem the `source` should be
#' the URL or path to a filesystem image, as produced by Emscripten's
#' `file_packager` tool or as the result of appending filesystem metadata to an
#' `.tar` archive using [rwasm::add_tar_index()]. The filesystem image may be
#' gzip compressed, indicated by the property `gzip: true` in the associated
#' filesystem metadata. The filesystem metadata and contents will be loaded and
#' mounted onto the directory `mountpoint`.
#'
#' When mounting an Emscripten "nodefs" type filesystem, the `source` should be
#' the path to a physical directory on the host filesystem. The host directory
#' will be mapped into the virtual filesystem and mounted onto the directory
#' `mountpoint`. This filesystem type can only be used when webR is running
#' under Node.
#'
#' When mounting a Jupyterlite "drivefs" type filesystem, the `source` should be
#' the drive name to mount. The default value for `source` is the empty string,
#' which is the initial drive name used by Jupyterlite. This filesystem type can
#' only be used when webR is running in a Jupyterlite notebook session.
#'
#' When mounting an Emscripten "idbfs" type filesystem, files will be persisted
#' to or populated from a browser-based IndexedDB database whenever the
#' JavaScript function `Module.FS.syncfs` is invoked. See the Emscripten `IDBFS`
#' documentation for more information. This filesystem type can only be used
#' when webR is running in a web browser and using the `PostMessage`
#' communication channel.
#'
#' @param mountpoint a character string giving the path to a directory to mount
#'   onto in the Emscripten virtual filesystem.
#' @param source a character string giving the location of the data source to be
#'   mounted.
#' @param type a character string giving the type of Emscripten filesystem to be
#'   mounted: "workerfs", "nodefs", "drivefs", or "idbfs".
#'
#' @export
mount <- function(mountpoint, source, type = "workerfs") {
  # Create the mountpoint if it does not already exist
  dir.create(mountpoint, recursive = TRUE, showWarnings = FALSE)

  # Mount specified Emscripten filesystem type onto the given mountpoint
  if (tolower(type) == "workerfs") {
    invisible(.Call(ffi_mount_workerfs, source, mountpoint))
  } else if (tolower(type) == "nodefs") {
    invisible(.Call(ffi_mount_nodefs, source, mountpoint))
  } else if (tolower(type) == "drivefs") {
    if (missing(source) || is.null(source)) {
      source <- ""
    }
    id <- getOption("webr.drivefs.browsingContextId")
    invisible(.Call(ffi_mount_drivefs, source, id, mountpoint))
  } else if (tolower(type) == "idbfs") {
    invisible(.Call(ffi_mount_idbfs, mountpoint))
  } else {
    stop(paste("Unsupported Emscripten Filesystem type:", type))
  }
}

#' @rdname mount
#' @export
unmount <- function(mountpoint) {
  invisible(.Call(ffi_unmount, mountpoint))
}

#' Synchronise the Emscripten virtual filesystem
#'
#' @description
#' Uses the Emscripten filesystem API to synchronise all mounted virtual
#' filesystems with their backing storage, where it exists. The `populate`
#' argument controls the direction of the synchronisation between Emscripten's
#' internal data and the file system's persistent store.
#'
#' @param populate A boolean. When `true`, initialises the filesystem with data
#'   from persistent storage. When `false`, writes current filesystem data to
#'   the persistent storage.
#' @export
syncfs <- function(populate) {
  invisible(.Call(ffi_syncfs, populate))
}
