#' shim base functions
shim_webr <- function(){
  .e <- new.env()
  .e[["install.packages"]] <- webr::install
  setHook(packageEvent("utils", "attach"), function(...) {
    attach(.e, name = "webr_shims", warn.conflicts = FALSE)
  })
}