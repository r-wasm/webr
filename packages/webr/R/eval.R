#' Evaluate R code for webR
#'
#' @description
#' This function evaluates the provided R code with various settings in place
#' to configure behavior. The function is intended to be used by the webR
#' `evalRCode` API, rather than invoked directly by the end user.
#'
#' @param code The R code to evaluate.
#' @param conditions If `TRUE`, capture and return conditions raised during
#' execution.
#' @param streams If `TRUE`, capture and return the `stdout` and `stderr`
#' streams.
#' @param autoprint If `TRUE`, code automatically prints as if it were
#' written at an R console.
#' @param handlers If `TRUE`, execute the R code using a [tryCatch], with
#' handlers in place.
#'
evalRCode <- function(code, conditions = TRUE, streams = FALSE,
  autoprint = FALSE, handlers = TRUE
) {
  res <- NULL
  errors <- NULL
  warnings <- NULL
  messages <- NULL
  stderr <- NULL
  stdout <- NULL

  # Print warnings as they are raised
  old_warn <- getOption("warn")
  options(warn = 1)

  if (streams) {
    # Redirect stdout and stderr streams using sink
    out_con <- textConnection(NULL, "w")
    err_con <- textConnection(NULL, "w")
    sink(out_con)
    sink(err_con, type = "message")
  }

  # Create a function that executes the code. Wrap the code in `withAutoprint`
  # if requested, otherwise just `parse` and `eval` the code.
  if (autoprint) {
    efun <- function(code) {
      withAutoprint(parse(text = code), local = parent.frame(2), echo = FALSE,
        evaluated = TRUE)$value
    }
  } else {
    efun <- function(code) eval.parent(parse(text = code), 2)
  }

  if (handlers) {
    if (conditions) {
      # Capture errors, warnings and messages to be sent back to webR
      # Muffle the conditions so that they are not sent to stderr
      res <- withCallingHandlers(
        tryCatch(
          efun(code),
          error = function(cnd) errors <<- append(errors, cnd)
        ),
        warning = function(cnd) {
          warnings <<- append(warnings, cnd)
          tryInvokeRestart("muffleWarning")
        },
        message = function(cnd) {
          messages <<- append(messages, cnd)
          tryInvokeRestart("muffleMessage")
        }
      )
    } else {
      # Do not capture warnings or messages, but do write errors to stderr.
      # We handle the error here rather than let it propagate up so that webR
      # can recover if there is some error during evaluation.
      res <- tryCatch(
        efun(code),
        error = function(cnd) message(paste("Error:", cnd$message))
      )
    }
  } else {
    # Do not install any condition handlers. Note that with this behavior
    # webR cannot easily recover from an error, as R will attempt to jump
    # to the top level.
    res <- efun(code)
  }


  if (streams) {
    # Restore stdout and stderr streams using sink
    sink(type = "message")
    sink()
    stdout <- textConnectionValue(out_con)
    stderr <- textConnectionValue(err_con)
  }

  # Flush any further warnings and restore original warn option
  warnings()
  options(warn = old_warn)

  list(result = res, stdout = stdout, stderr = stderr, messages = messages,
       warnings = warnings, errors = errors)
}
