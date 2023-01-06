stopifnot(
  shelters$size == 0,
  is.null(shelters$child),
  is.null(shelters$parent),
  identical(shelters$top, shelters)
)

shelters_push()

stopifnot(
  shelters$size == 1,
  is.environment(shelters$top),
  identical(shelters$child, shelters$top),
  identical(shelters$top$parent, shelters)
)

prev <- shelters$top
shelters_push()

stopifnot(
  shelters$size == 2,
  identical(shelters$child, prev),
  identical(shelters$top$parent, prev),
  identical(prev$child, shelters$top),
  is.null(shelters$top$child),
  is.null(shelters$parent)
)

shelters_pop()

stopifnot(
  shelters$size == 1,
  is.environment(shelters$top),
  identical(shelters$child, shelters$top),
  identical(shelters$top$parent, shelters)
)

shelters_pop()

stopifnot(
  shelters$size == 0,
  is.null(shelters$child),
  is.null(shelters$parent),
  identical(shelters$top, shelters)
)

stopifnot(
  identical(
    tryCatch(
      shelters_pop(),
      error = function(cnd) grepl("empty shelter", cnd$message)
    ),
    TRUE
  )
)

# Protection -----------------------------------------------------------

shelters_push()

stopifnot(
  identical(shelters$top$size, 0L)
)

preserve("foo")

stopifnot(
  identical(shelters$top$size, 1L),
  identical(shelters$top$data[[1L]], "foo")
)

shelters$top$size <- length(shelters$top$data)
rm(shelters) # Remove local copy created by `<-`

preserve("bar")

stopifnot(
  identical(shelters$top$size, shelter_initial_size + 1L),
  identical(length(shelters$top$data), shelter_initial_size * shelter_growth_factor),
  identical(shelters$top$data[[1L]], "foo")
)

shelters_pop()
