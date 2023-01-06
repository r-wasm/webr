shelters <- new.env()

shelters$stack_size <- 0L
shelters$child <- NULL
shelters$parent <- NULL
shelters$top <- shelters

shelter_growth_factor <- 2L
shelter_initial_size <- 50L

new_shelter <- function(parent) {
  out <- new.env()

  out$parent <- parent
  out$child <- NULL

  out$size <- 0L
  out$data <- vector("list", length = shelter_initial_size)

  out
}

shelters_push <- function() {
  new <- new_shelter(shelters$top)

  shelters$top$child <- new
  shelters$top <- new

  shelters$stack_size <- shelters$stack_size + 1L

  invisible(shelters$top)
}

shelters_pop <- function() {
  if (!shelters$stack_size) {
    stop("Can't pop an empty shelter stack.")
  }

  shelters$top <- shelters$top$parent
  shelters$top$child <- NULL

  shelters$stack_size <- shelters$stack_size - 1L

  invisible(shelters$top)
}

preserve <- function(x) {
  if (!shelters$stack_size) {
    warning("Pushing a new shelter on the empty stack.")
    shelters_push()
  }

  shelter <- shelters$top

  if (length(shelter$data) == shelter$size) {
    new_size <- shelter$size * shelter_growth_factor
    shelter$data[new_size] <- NULL
  }

  shelter$size <- shelter$size + 1L
  shelter$data[[shelter$size]] <- x

  invisible(x)
}
