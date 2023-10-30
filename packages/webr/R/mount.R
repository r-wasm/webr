#' Mount an Emscripten filesystem object
#'
#' @description
#' Uses the Emscripten filesystem API to mount a filesystem object onto a given
#' directory in the virtual filesystem. The mountpoint will be created if it
#' does not already exist.
#'
#' When mounting an Emscripten "workerfs" type filesystem the `source` should
#' be the URL for a filesystem image with filename ending `.data`, as produced
#' by Emscripten's `file_packager` tool. The filesystem image and metadata will
#' be downloaded and mounted onto the directory `mountpoint`.
#'
#' When mounting an Emscripten "nodefs" type filesystem, the `source` should be
#' the path to a physical directory on the host filesystem. The host directory
#' will be mapped into the virtual filesystem and mounted onto the directory
#' `mountpoint`. This filesystem type can only be used when webR is running
#' under Node.
#'
#' @param mountpoint a character string giving the path to a directory to mount
#'   onto in the Emscripten virtual filesystem.
#' @param source a character string giving the location of the data source to be
#'   mounted.
#' @param type a character string giving the type of Emscripten filesystem to be
#'   mounted: "workerfs" or "nodefs".
#'
#' @export
mount <- function(mountpoint, source, type = "workerfs") {
  # Create the mountpoint if it does not already exist
  dir.create(mountpoint, recursive = TRUE, showWarnings = FALSE)

  # Mount specified Emscripten filesystem type onto the given mountpoint
  if (tolower(type) == "workerfs") {
    base_url <- gsub(".data$", "", source)
    invisible(.Call(ffi_mount_workerfs, base_url, mountpoint))
  } else if (tolower(type) == "nodefs") {
    invisible(.Call(ffi_mount_nodefs, source, mountpoint))
  } else {
    stop(paste("Unsupported Emscripten Filesystem type:", type))
  }
}

#' @rdname mount
#' @export
unmount <- function(mountpoint) {
  invisible(.Call(ffi_unmount, mountpoint))
}
