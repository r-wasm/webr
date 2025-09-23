#' Shim functions from base R
#'
#' @description
#' Replace base R functions with implementations
#' that work in the webR environment.
#'
#' @details
#' The shimmed functions are:
#' - install.packages() - replaced by webr::install().
#' - library() - replaced by webr::library_shim().
#' - require() - replaced by webr::require_shim().
#' - requireNamespace() - replaced by webr::requireNamespace_shim(). 
#'
#' @export
shim_install <- function() {
  .e <- new.env()
  .e[["install.packages"]] <- webr::install
  .e[["library"]] <- webr::library_shim
  .e[["requireNamespace"]] <- webr::requireNamespace_shim
  .e[["require"]] <- webr::require_shim
  attach(.e, name = "webr_shims", warn.conflicts = FALSE)
}
