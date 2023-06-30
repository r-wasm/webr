#' Graphics device for webR HTML canvas element
#'
#' A graphics device that generates HTML canvas API calls and transmits them to
#' the main webR thread for plotting. The resulting messages are of type
#' `canvasExec`.
#'
#' A 2x scaling is used to improve the bitmap output visual quality. As such,
#' the width and height of the HTML canvas element should be twice the width and
#' height of the graphics device.
#'
#' Based on the \href{https://www.rforge.net/canvas/}{R canvas package} by
#' Jeffrey Horner, released under the GPL v2 Licence.
#'
#' @export
#'
#' @param width The width of the device.
#' @param height The height of the device.
#' @param pointsize	The default point size of plotted text.
#' @param bg The initial background colour.
#' @param ... Additional graphics device arguments (ignored).
canvas <- function(width=504, height=504, pointsize=12, bg="white", ...) {
  .Call(ffi_dev_canvas, width, height, pointsize, bg)
}
