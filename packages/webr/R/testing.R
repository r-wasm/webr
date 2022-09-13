# Run a R script within in this instance of R, capturing output to a file.
sink_source_to_file <- function(src_file, out_file) {
  r <- 0L
  con <- file(out_file, open = "wt")
  sink(con)
  sink(con, type = "message")
  tryCatch({
    source(src_file, spaced = FALSE, echo = TRUE, max.deparse.length = Inf)
  }, error = function(con) {
    r <<- 1L
  }, finally = {
    sink(type = "message")
    sink()
  })
  invisible(r)
}

# Remove lines from a file on disk. We use this to remove calls to quit(),
# since we are running examples within the current R session.
remove_lines_in_file <- function(sourcefile, lines) {
    con <- file(sourcefile)
    source <- readLines(con)
    for (line in lines) {
      source <- source[source != line]
    }
    writeLines(source, con)
    close(con)
}

#' Test an installed R package by running the package examples and tests
#'
#' Based on [tools::testInstalledPackage()], with modifications for running
#' tests under WASM, where the [system()] function cannot be used.
#'
#' @export
#'
#' @param pkg Name of the package to test.
#' @returns 0 if the test was successful, otherwise 1.
test_package <- function(pkg) {
    old_wd <- getwd()
    pkgdir <- find.package(pkg)

    message(gettextf("Testing examples for package %s", sQuote(pkg)),
      domain = NA)
    rfile <- tools:::.createExdotR(pkg, pkgdir, silent = TRUE)

    if (length(rfile)) {
      outfile <- paste0(pkg, "-Ex.Rout")
      failfile <- paste0(outfile, ".fail")
      savefile <- paste0(outfile, ".prev")
      if (file.exists(outfile)) file.rename(outfile, savefile)
      unlink(failfile)

      remove_lines_in_file(rfile, c("quit('no')", "q()"))
      res <- sink_source_to_file(rfile, failfile)

      if (res) {
        return(invisible(1L))
      } else {
        file.rename(failfile, outfile)
      }
    } else {
      warning(gettextf("no examples found for package %s", sQuote(pkg)),
        call. = FALSE, domain = NA)
    }

    testdir <- file.path(pkgdir, "tests")
    if (dir.exists(testdir)) {
      this <- paste0(pkg, "-tests")
      unlink(this, recursive = TRUE)
      dir.create(this)

      file.copy(Sys.glob(file.path(testdir, "*")), this, recursive = TRUE)
      setwd(this)
      on.exit(setwd(old_wd), add = TRUE)
      message(gettextf("Running specific tests for package %s",
        sQuote(pkg)), domain = NA)
      rfiles <- dir(".", pattern = "\\.[rR]$")
      for (f in rfiles) {
        remove_lines_in_file(f, c("quit('no')", "q()"))
        message(gettextf("  Running %s", sQuote(f)), domain = NA)
        outfile <- sub("rout$", "Rout", paste0(f, "out"))
        res <- sink_source_to_file(f, outfile)
        if (res) {
          file.rename(outfile, paste0(outfile, ".fail"))
          return(invisible(1L))
        }
      }
    }
    invisible(0L)
}
