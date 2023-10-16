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

"timezone is set"
webr:::sandbox({
  tz <- Sys.timezone()

  # Used to be NA
  stopifnot(
    is.character(tz) && length(tz) == 1 && !is.na(tz)
  )
})

"POSIXlt supports time zones"
webr:::sandbox({
  out <- as.POSIXlt("2013-06-17 22:33:44", tz = "Australia/Darwin")

  stopifnot(
    identical(
      unclass(out)$zone,
      "ACST"
    )
  )
})

"Emscripten mount and unmount without error"
webr:::sandbox({
  webr::mount("/mnt", ".", type = "nodefs")
  webr::unmount("/mnt")
})
