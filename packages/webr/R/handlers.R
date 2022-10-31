#' Prompt user to install missing packages from a webR binary repo
#'
#' @description
#' When enabled, `packageNotFoundError` errors cause a menu prompt
#' to be shown to the user asking if they would like to attempt to
#' download the missing package.
#'
#' If the user replies in the negative, the package error is thrown as
#' it would normally. If the user replies in the affirmative, the package
#' is downloaded using [webr::install()].
#'
#' If it is possible to do so, execution will continue without
#' interrupting the current program.
#'
#' @export
global_prompt_install <- function(show_menu = TRUE) {
  globalCallingHandlers(
    packageNotFoundError = function(cnd) {
      if (!interactive()) {
        return()
      }
      pkg <- cnd$package
      if (!show_menu) {
        download <- 1
      } else {
        download <- utils::menu(
          c("Yes", "No"),
          title = paste0(
            'Failed to load package "', pkg,
            '". Do you want to try downloading it from the webR binary repo?'
          )
        )
      }
      if (download == 1) {
        webr::install(pkg)
        tryInvokeRestart("retry_loadNamespace")
        invokeRestart("abort")
      }
    }
  )
}
