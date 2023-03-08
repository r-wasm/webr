self_test <- function() {
  dir <- system.file("tests-webr", package = "webr")
  files <- dir(dir, full.names = TRUE, pattern = "\\.R$")

  if (!length(files)) {
    stop("Can't find test files.")
  }

  for (file in files) {
    sandbox({
      source(file, local = TRUE)
    })
  }
}

# Evaluates in a child of the current environment and restores options
# and wd on exit
sandbox <- function(expr, env = parent.frame()) {
  expr <- substitute(expr)
  box <- new.env(parent = env)

  old_opts <- options()
  on.exit(options(old_opts))

  old_wd <- getwd()
  on.exit(setwd(old_wd), add = TRUE, after = FALSE)

  eval(expr, box)
}

# Run a R script within in this instance of R, capturing output to a file.
sink_source_to_file <- function(src_file, out_file) {
  con <- file(out_file, open = "wt")
  sink(con)
  sink(con, type = "message")
  on.exit(
    {
      sink(type = "message")
      sink()
    },
    add = TRUE
  )
  source(src_file, spaced = FALSE, echo = TRUE, max.deparse.length = Inf)
  invisible(0L)
}

# Remove lines from a file on disk. We use this to remove calls to quit(),
# since we are running examples within the current R session.
remove_lines_in_file <- function(src_file, lines) {
  source <- readLines(src_file)
  source <- source[!source %in% lines]
  writeLines(source, src_file)
}

#' Test an installed R package by running the package examples and tests
#'
#' @description
#' This function runs R package examples and tests. The implementation is based
#' on [tools::testInstalledPackage()], with modifications for webR where the
#' [system()] function cannot be used.
#'
#' @export
#'
#' @param pkg Name of the package to test.
#' @returns 0 if the test was successful, otherwise 1.
test_package <- function(pkg) {
  old_wd <- getwd()
  pkgdir <- find.package(pkg)

  message(gettextf("Testing examples for package %s", sQuote(pkg)),
    domain = NA
  )
  rfile <- tools:::.createExdotR(pkg, pkgdir, silent = TRUE)

  if (length(rfile)) {
    outfile <- paste0(pkg, "-Ex.Rout")
    failfile <- paste0(outfile, ".fail")
    savefile <- paste0(outfile, ".prev")
    if (file.exists(outfile)) file.rename(outfile, savefile)
    unlink(failfile)

    remove_lines_in_file(rfile, c("quit('no')", "q()"))
    res <- tryCatch(
      {
        sink_source_to_file(rfile, failfile)
      },
      error = function() {
        invisible(1L)
      }
    )
    if (res) {
      return(invisible(1L))
    }
    file.rename(failfile, outfile)
  } else {
    warning(gettextf("no examples found for package %s", sQuote(pkg)),
      call. = FALSE, domain = NA
    )
  }

  testdir <- file.path(pkgdir, "tests")
  if (dir.exists(testdir)) {
    this <- paste0(pkg, "-tests")
    unlink(this, recursive = TRUE)
    dir.create(this)

    file.copy(Sys.glob(file.path(testdir, "*")), this, recursive = TRUE)
    setwd(this)
    on.exit(setwd(old_wd), add = TRUE)
    message(gettextf(
      "Running specific tests for package %s",
      sQuote(pkg)
    ), domain = NA)
    rfiles <- dir(".", pattern = "\\.[rR]$")
    for (f in rfiles) {
      remove_lines_in_file(f, c("quit('no')", "q()"))
      message(gettextf("  Running %s", sQuote(f)), domain = NA)
      outfile <- sub("rout$", "Rout", paste0(f, "out"))
      res <- tryCatch(
        {
          sink_source_to_file(f, outfile)
        },
        error = function() {
          file.rename(outfile, paste0(outfile, ".fail"))
          invisible(1L)
        }
      )
      if (res) {
        return(invisible(1L))
      }
    }
  }
  invisible(0L)
}
