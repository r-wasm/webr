"System calls are intercepted"
local({
  # Default return value
  stopifnot(
    identical(system("cmd"), c("", "")),
    identical(system2("cmd"), c("", ""))
  )

  # Hooked
  old <- options(webR.hook_system = function(...) "foo")
  stopifnot(
    identical(system("cmd"), "foo"),
    identical(system2("cmd"), "foo")
  )
})
