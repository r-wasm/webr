#' Graphics device for drawing to a HTML canvas element
#'
#' A graphics device that generates HTML canvas API calls and executes them on
#' the worker thread using a JavaScript `OffscreenCanvas`. Once drawing has
#' finished, a JavaScript `ImageBitmap` object is transmitted to the main webR
#' thread for display.
#'
#' The resulting webR output messages are of type
#' \href{./js/interfaces/WebRChan.CanvasMessage.html}{`CanvasMessage`}, with
#' the \href{./js/interfaces/WebRChan.CanvasMessage.html#type}{`type`}
#' property set as `'canvas'` and the
#' \href{./js/interfaces/WebRChan.CanvasMessage.html#data}{`data`} property
#' populated with further details about the event that triggered the message.
#'
#' When the graphics device creates a new page an output message is emitted with
#' the \href{./js/interfaces/WebRChan.CanvasMessage.html#data}{`data`}
#' property set to `{ event: 'canvasNewPage' }`.
#'
#' When bitmap image data is sent to the main thread for display, a message is
#' emitted with the the bitmap additionally included as part of the
#' \href{./js/interfaces/WebRChan.CanvasMessage.html#data}{`data`} property,
#' `{ event: 'canvasImage', image: ImageBitmap }`.
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
canvas <- function(width = 504,
                   height = 504,
                   pointsize = 12,
                   bg = "transparent",
                   ...) {
  .Call(ffi_dev_canvas, width, height, pointsize, bg)
}

#' Use the webR canvas graphics device
#'
#' Set R options so that the webR canvas graphics device is used as the default
#' graphics device for new plots.
#'
#' @param ... Arguments to be passed to the graphics device.
#' @export
canvas_install <- function(...) {
  options(device = function() {
    webr::canvas(...)
  })
}
