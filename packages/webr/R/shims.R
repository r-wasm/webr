#' Shim functions from base R
#'
#' @description
#' Replace base R functions with implementations
#' that work in the webR environment.
#'
#' @details
#' The shimmed functions are:
#' - install.packages() - replaced by webr::install().
#'
#' @export
shim_install <- function() {
  .e <- new.env()
  .e[["install.packages"]] <- webr::install
  attach(.e, name = "webr_shims", warn.conflicts = FALSE)
}
