#' Generate an output message when file is displayed with the pager
#'
#' @description
#' When enabled, the R pager function is replaced so that a request to display
#' a file's contents instead generates a webR output message. The request is
#' forwarded to the main thread to be handled by the application loading webR.
#'
#' This replaces the default R pager mechanism, which tries to start an external
#' pager binary using the `system()` function.
#'
#' @export
pager_install <- function() {
  options(
    pager = function(files, header, title, delete.file) {
      # fmt: skip
      webr::eval_js(paste0(
        "Module.webr.channel.write({",
        "  type: 'pager',",
        "  data: {",
        "    path: '", files[1], "',",
        "    header: '", header[1], "',",
        "    title: '", title, "',",
        "    deleteFile: ", if (delete.file) "true" else "false", ",",
        "  },",
        "});"
      ))
      invisible(NULL)
    }
  )
}
