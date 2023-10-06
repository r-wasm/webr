#' shim base functions
shim_install <- function(){
  .e <- new.env()
  .e[["install.packages"]] <- webr::install
  setHook(packageEvent("utils", "attach"), function(...) {
    attach(.e, name = "webr_shims", warn.conflicts = FALSE)
  })
}
