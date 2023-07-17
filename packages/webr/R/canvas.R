#' Graphics device for webR HTML canvas element
#'
#' A graphics device that generates HTML canvas API calls and executes them on
#' the worker thread using a JavaScript `OffscreenCanvas`. Once drawing has
#' finished, a JavaScript `ImageBitmap` object is transmitted to the main webR
#' thread for display. The resulting webR output messages are of type `Message`
#' with the `type` property set to `'canvasImage'` and the `data` property set
#' to an object containing the image data, `{ image: ImageBitmap }`.
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
canvas <- function(width=504, height=504, pointsize=12, bg="transparent", ...) {
  .Call(ffi_dev_canvas, width, height, pointsize, bg)
}
