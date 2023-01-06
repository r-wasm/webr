shelters <- new.env()

shelters$size <- 0
shelters$child <- NULL
shelters$parent <- NULL
shelters$top <- shelters

shelters_push <- function() {
  new <- new.env()

  new$parent <- shelters$top
  shelters$top$child <- new
  shelters$top <- new

  shelters$size <- shelters$size + 1L
}

shelters_pop <- function() {
  if (!shelters$size) {
    stop("Can't pop an empty shelter stack.")
  }

  shelters$top <- shelters$top$parent
  shelters$top$child <- NULL

  shelters$size <- shelters$size - 1L
}
