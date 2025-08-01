% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/eval.R
\name{eval_js}
\alias{eval_js}
\title{Evaluate JavaScript code}
\usage{
eval_js(code, await = FALSE)
}
\arguments{
\item{code}{The JavaScript code to evaluate.}

\item{await}{Wait for promises to resolve, defaults to \code{FALSE}.}
}
\value{
Result of evaluating the JavaScript code, returned as an R object.
}
\description{
This function evaluates the given character string as JavaScript code.
Returned JavaScript objects are converted to R objects using the \code{RObject}
generic constructor, and specific R object types can be returned by invoking
the R object constructor directly in the evaluated JavaScript.
}
\details{
The JavaScript code is evaluated using \code{emscripten_run_script_int} from the
Emscripten C API. In the event of a JavaScript exception an R error condition
will be raised with the exception message.

If a JavaScript promise is returned, set \code{await = TRUE} to wait for the
promise to resolve. The result of the promise is returned, or an error is
raised if the promise is rejected.

When \code{await = TRUE}, the given JavaScript code is run on the main thread.
Otherwise, the JavaScript code is run in the webR web worker context.

This is an experimental function that may undergo a breaking changes in the
future.
}
\examples{
\dontrun{
eval_js("123 + 456")
eval_js("Math.sin(1)")
eval_js("true")
eval_js("undefined")
eval_js("Promise.resolve(123)")
eval_js("(new Date()).toUTCString()")
eval_js("new RList({ foo: 123, bar: 456, baz: ['a', 'b', 'c']})")
}
}
