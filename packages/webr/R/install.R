#' Install one or more packages from a webR binary package repo
#'
#' @export
#'
#' @param packages Character vector containing the names of packages to install.
#' @param repos Character vector containing the URIs of the webR repos to use.
#' @param lib The library directory where the packages will be installed.
install <- function(packages, repos = NULL, lib = NULL) {
  if (is.null(lib)) {
    lib <- .libPaths()[[1]]
  }
  if (is.null(repos)) {
    repos <- getOption("webr_pkg_repos")
  }
  info <- utils::available.packages(repos = repos, type = "source")
  deps <- unlist(tools::package_dependencies(packages, info), use.names = FALSE)
  deps <- unique(deps)

  for (dep in deps) {
    if (length(find.package(dep, quiet = TRUE))) {
      next
    }
    install(dep, repos, lib)
  }

  for (pkg in packages) {
    if (length(find.package(pkg, quiet = TRUE))) {
      next
    }

    if (!pkg %in% info) {
      warning(
        sprintf(
          paste0(
            "Requested package %s not found in webR binary repo.\n",
            "Please run `rownames(available.packages(repos = '%s'))` to get available packages\n"
          ), 
          pkg, 
          repos
        )
      )

      next
    }

    ver <- as.character(getRversion())
    ver <- gsub("\\.[^.]+$", "", ver)
    bin_suffix <- sprintf("bin/emscripten/contrib/%s", ver)

    repo <- info[pkg, "Repository"]
    repo <- sub("src/contrib", bin_suffix, repo, fixed = TRUE)
    repo <- sub("file:", "", repo, fixed = TRUE)

    pkg_ver <- info[pkg, "Version"]
    path <- file.path(repo, paste0(pkg, "_", pkg_ver, ".tgz"))

    tmp <- tempfile()
    message(paste("Downloading webR package:", pkg))
    utils::download.file(path, tmp, quiet = TRUE)

    utils::untar(
      tmp,
      exdir = lib,
      tar = "internal",
      extras = "--no-same-permissions"
    )
  }
  invisible(NULL)
}
