#' Generate an output message when a URL is browsed to
#'
#' @description
#' When enabled, the R `viewer` option is set so that a request to display
#' a URL generates a webR output message. The request is forwarded to the main
#' thread to be handled by the application loading webR.
#'
#' This does the equivalent of the base R function `utils::browseURL()`.
#'
#' @export
viewer_install <- function() {
  options(
    viewer = function(url, ...) {
      webr::eval_js(paste0(
        "Module.webr.channel.write({",
        "  type: 'browse',",
        "  data: { url: '", url, "' },",
        "});"
      ))
      invisible(NULL)
    }
  )
}
