#' Install missing packages from the default webR binary repo
#'
#' @description
#' When loading R packages using [library_shim()] or [require_shim()], if a
#' package is missing an attempt will be made to download and install the
#' missing package from the default webR binary repo.
#'
#' Once downloaded, the original [base::library()] or [base::require()] command
#' is invoked to load the package.
#'
#' @details
#' A menu will be shown to the user when the `webr.show_menu` global option is
#' set to `TRUE`. Otherwise, the user will not be prompted.
#'
#' When the menu is enabled, loading a missing package will cause a prompt to be
#' shown to the user asking if they would like to download the missing package.
#' If the user replies in the affirmative, the package is downloaded
#' using [webr::install()].
#'
#' The `webr.show_menu` global option may be overridden by providing the
#' `show_menu` argument. By default, if no global option is set and no argument
#' is provided, the menu will not be shown.
#'
#' @param show_menu Show a menu asking the user if they would like to install
#'   the package if it is missing. Defaults to `getOption("webr.show_menu")`.
#'
#' @export
library_shim <- function(pkg, ..., show_menu = getOption("webr.show_menu")) {
  show_menu <- ifelse(is.null(show_menu), FALSE, show_menu)
  package <- as.character(substitute(pkg))
  if (length(find.package(package, quiet = TRUE)) == 0) {
    if (!prompt_download(package, show_menu)) {
      return(invisible(NULL))
    }
  }
  args <- list(package, character.only = TRUE, ...)
  args <- args[!duplicated(names(args))]
  do.call(base::library, args)
}

#' @rdname library_shim
#' @export
require_shim <- function(pkg, ..., show_menu = getOption("webr.show_menu")) {
  show_menu <- ifelse(is.null(show_menu), FALSE, show_menu)
  package <- as.character(substitute(pkg))
  if (length(find.package(package, quiet = TRUE)) == 0) {
    if (!prompt_download(package, show_menu)) {
      return(invisible(NULL))
    }
  }
  args <- list(package, character.only = TRUE, ...)
  args <- args[!duplicated(names(args))]
  do.call(base::require, args)
}
