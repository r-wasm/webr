#' Evaluate the provided R code, call, or expression for webR
#'
#' @description
#' This function evaluates the provided R code, call, or expression with various
#' settings in place to configure behavior. The function is intended to be used
#' by the webR `evalR` API, rather than invoked directly by the end user.
#'
#' @param expr The R code, call or expression to evaluate.
#' @param conditions If `TRUE`, capture and return conditions raised during
#' execution.
#' @param streams If `TRUE`, capture and return the `stdout` and `stderr`
#' streams.
#' @param autoprint If `TRUE`, automatically print as if the expression was
#' written at an R console.
#' @param handlers If `TRUE`, execute using a [tryCatch] with handlers in place.
#' @param env The environment in which to evaluate.
#'
#' @export
#' @useDynLib webr, .registration = TRUE
eval_r <- function(
  expr,
  conditions = TRUE,
  streams = FALSE,
  autoprint = FALSE,
  handlers = TRUE,
  env = parent.frame()
) {
  res <- NULL

  # The following C routine prepares an output object that is used to capture
  # the standard streams and any raised conditions, when requested. Rather than
  # capturing streams using textConnection(), custom R connections are created
  # for stdout and stderr. Using this method the outputs can be multiplexed
  # with individual events tagged by type.
  out <- .Call(ffi_new_output_connections)
  on_exit({
    # Close connections opened by ffi_new_output_connections
    close(out$stdout)
    close(out$stderr)
  })

  if (streams) {
    # Redirect stdout and stderr streams using sink
    sink(out$stdout)
    on_exit(sink())

    sink(out$stderr, type = "message")
    on_exit(sink(type = "message"))
  }

  # Print warnings as they are raised
  old_opts <- options(warn = 1)
  on_exit({
    # Flush any further warnings and restore original warn option
    warnings()
    options(old_opts)
  })

  # Create a function that evaluates the expression. Wrap in `withAutoprint` if
  # requested, and `parse` and `eval` the code if it is a string.
  efun <- if (autoprint) {
    function(expr) {
      if (is.character(expr)) {
        expr <- parse(text = expr)
      }
      out <- withAutoprint(
        expr,
        local = env,
        echo = FALSE,
        evaluated = TRUE
      )
      out$value
    }
  } else {
    function(expr) {
      if (is.character(expr)) {
        expr <- parse(text = expr)
      }
      eval(expr, env)
    }
  }

  if (handlers) {
    if (conditions) {
      # Capture errors, warnings and messages to be sent back to webR
      # Muffle the conditions so that they are not sent to stderr
      res <- withCallingHandlers(
        tryCatch(
          efun(expr),
          error = function(cnd) {
            out$n <<- out$n + 1L
            out$vec[[out$n]] <<- list(type = "error", data = cnd)
          }
        ),
        warning = function(cnd) {
          out$n <<- out$n + 1L
          out$vec[[out$n]] <<- list(type = "warning", data = cnd)
          tryInvokeRestart("muffleWarning")
        },
        message = function(cnd) {
          out$n <<- out$n + 1L
          out$vec[[out$n]] <<- list(type = "message", data = cnd)
          tryInvokeRestart("muffleMessage")
        }
      )
    } else {
      # Do not capture warnings or messages, but do write errors to stderr.
      # We handle the error here rather than let it propagate up so that webR
      # can recover if there is some error during evaluation.
      res <- tryCatch(
        efun(expr),
        error = function(cnd) message(paste("Error:", cnd$message))
      )
    }
  } else {
    # Do not install any condition handlers. Note that with this behavior
    # webR cannot easily recover from an error, as R will attempt to jump
    # to the top level.
    res <- efun(expr)
  }

  # Ensure incomplete lines are flushed to output vector
  if (isIncomplete(out$stdout)) cat(fill = TRUE, file = out$stdout)
  if (isIncomplete(out$stderr)) cat(fill = TRUE, file = out$stderr)

  # Output vector out$vec expands exponentially, return only the valid subset
  list(result = res, output = utils::head(out$vec, out$n))
}

#' Evaluate JavaScript code
#'
#' @description
#' This function evaluates the given character string as JavaScript code.
#' Returned JavaScript objects are converted to R objects using the `RObject`
#' generic constructor, and specific R object types can be returned by invoking
#' the R object constructor directly in the evaluated JavaScript.
#'
#' @details
#' The JavaScript code is evaluated using `emscripten_run_script_int` from the
#' Emscripten C API. In the event of a JavaScript exception an R error condition
#' will be raised with the exception message.
#'
#' This is an experimental function that may undergo a breaking changes in the
#' future.
#'
#' @param code The JavaScript code to evaluate.
#'
#' @return Result of evaluating the JavaScript code, returned as an R object.
#' @examples
#' \dontrun{
#' eval_js("123 + 456")
#' eval_js("Math.sin(1)")
#' eval_js("true")
#' eval_js("undefined")
#' eval_js("(new Date()).toUTCString()")
#' eval_js("new RList({ foo: 123, bar: 456, baz: ['a', 'b', 'c']})")
#' }
#' @export
#' @useDynLib webr, .registration = TRUE
eval_js <- function(code) {
  .Call(ffi_eval_js, code)
}
