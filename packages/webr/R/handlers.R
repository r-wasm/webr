#' Install a global handler to automatically download missing packages
#'
#' @description
#' When enabled, `packageNotFoundError` errors invoke a global handler to
#' download missing R packages from the default webR binary repo.
#'
#' If it is possible to do so, execution will continue without
#' interrupting the current program.
#'
#' @export
global_prompt_install <- function() {
  globalCallingHandlers(
    packageNotFoundError = function(cnd) {
      if (!interactive()) {
        return()
      }
      show_menu <- getOption("webr.show_menu", default = FALSE)
      if (prompt_download(cnd$package, show_menu)) {
        tryInvokeRestart("retry_loadNamespace")
        invokeRestart("abort")
      }
    }
  )
}

prompt_download <- function(package, show_menu) {
  download <- if (show_menu) {
    utils::menu(
      c("Yes", "No"),
      title = paste0(
        'Failed to load package "', package,
        '". Do you want to try downloading it from the webR binary repo?'
      )
    )
  } else {
    1
  }

  if (download == 1) {
    webr::install(package)
    return(invisible(TRUE))
  }

  return(invisible(FALSE))
}
