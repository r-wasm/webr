"System calls are intercepted"
webr:::sandbox({
  # Default return value
  stopifnot(
    identical(system("cmd"), c("", "")),
    identical(system2("cmd"), c("", ""))
  )

  # Hooked
  old <- options(webr.hook_system = function(...) "foo")
  stopifnot(
    identical(system("cmd"), "foo"),
    identical(system2("cmd"), "foo")
  )
})
