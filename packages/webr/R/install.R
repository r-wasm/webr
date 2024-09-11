#' Install one or more packages from a webR binary package repo
#'
#' @export
#'
#' @param packages Character vector containing the names of packages to install.
#' @param repos Character vector containing the URIs of the webR repos to use.
#' @param info A character matrix as from `available.packages()`. Can be used as
#'   an alternative to looking up available packages with the `repos` argument.
#' @param lib The library directory where the packages will be installed.
#' @param mount Logical. If `TRUE`, download and mount packages using Emscripten
#'   filesystem images.
#' @param quiet Logical. If `TRUE`, do not output downloading messages.
install <- function(packages,
                    repos = NULL,
                    info = NULL,
                    lib = NULL,
                    quiet = FALSE,
                    mount = TRUE) {
  if (is.null(lib)) {
    lib <- .libPaths()[[1]]
  }
  if (is.null(repos)) {
    repos <- getOption("webr_pkg_repos")
  }

  ver <- as.character(getRversion())
  ver <- gsub("\\.[^.]+$", "", ver)

  repos <- gsub("/$", "", repos)
  contrib <- sprintf("%s/bin/emscripten/contrib/%s", repos, ver)

  if (is.null(info)) {
    info <- utils::available.packages(contriburl = contrib)
  }

  # Avoid `recursive` here so that deps of broken packages are not downloaded
  deps <- unlist(
    tools::package_dependencies(packages, info, c("Depends", "Imports")),
    use.names = FALSE
  )
  deps <- unique(deps)

  # Search for existing packages in `.libPaths()` and the `lib` argument
  lib_loc <- c(lib, .libPaths())

  for (dep in deps) {
    if (length(find.package(dep, lib.loc = lib_loc, quiet = TRUE))) {
      next
    }
    install(dep, repos, info, lib, quiet, mount)
  }

  for (pkg in packages) {
    if (length(find.package(pkg, lib.loc = lib_loc, quiet = TRUE))) {
      next
    }

    if (!pkg %in% rownames(info)) {
      warning(paste("Requested package", pkg, "not found in webR binary repo."))
      next
    }

    repo <- info[pkg, "Repository"]
    repo <- sub("file:", "", repo, fixed = TRUE)

    pkg_ver <- info[pkg, "Version"]
    if (!quiet) message(paste("Downloading webR package:", pkg))

    if (mount) {
      # Try mounting `.tgz` as v2.0 VFS image, fallback to extracting the .tgz
      tryCatch({
        install_vfs_image(repo, lib, pkg, pkg_ver)
        next
      }, error = function(cnd) {
        warning(paste(cnd$message, "Falling back to traditional `.tgz` extraction."))
      })
    }

    install_tgz(repo, lib, pkg, pkg_ver)
  }
  invisible(NULL)
}

install_tgz <- function(repo, lib, pkg, pkg_ver) {
  tmp <- tempfile()
  on.exit(unlink(tmp, recursive = TRUE))

  path <- file.path(repo, paste0(pkg, "_", pkg_ver, ".tgz"))
  utils::download.file(path, tmp, quiet = TRUE)
  utils::untar(
    tmp,
    exdir = lib,
    tar = "internal",
    extras = "--no-same-permissions"
  )
}

install_vfs_image <- function(repo, lib, pkg, pkg_ver) {
  data_url <- file.path(repo, paste0(pkg, "_", pkg_ver, ".tgz"))
  mountpoint <- file.path(lib, pkg)
  mount(mountpoint, data_url)
}
