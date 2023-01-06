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

