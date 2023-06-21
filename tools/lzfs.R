args <- commandArgs(trailingOnly = TRUE)

usage <- function() {
    message(r"(
Create pre.js file setting up a lazy filesystem for Emscripten.

Usage:
  lzfs [-v] [-u URL] [-d dest] [-o file] -f path1@parent1 [-f path2@parent2] ...

Arguments:
  -d, --dest      If provided, copy source files to destination vfs directory.
  -f path@parent  Add all files under the directory 'path' to the Emscripten
                  filesystem as lazy files, under the directory 'parent'.
  -h, --help      Display this help message.
  -o file         If provided, write output to 'file' rather than stdout.
  -u, --URL       If provided, set a prefix for backing URLs.
  -v, --verbose   Verbose mode. Ouptut directory names as they are handled.
)")
    quit(status = 1)
}

list_files <- function(src_path, full = TRUE, ...) {
    if (dir.exists(src_path)) list.files(src_path, full.names = full, ...)
    else if (full) src_path
    else basename(src_path)
}

list_dirs <- function(src_path, full = TRUE, ...) {
    if (!file.exists(src_path)) character(0)
    else if (dir.exists(src_path)) list.dirs(src_path, full.names = full, ...)
    else if (full) dirname(src_path)
    else ""
}

dest <- ""
out <- stdout()
url <- "."
verbose <- FALSE
path_vec <- character(0)

while (length(args) > 0) {
    switch(args[1],
        `--help` = ,
        `-h` = usage(),
        `--URL` = ,
        `-u` = {
            url <- args[2]
            args <- tail(args, -2)
        },
        `--dest` = ,
        `-d` = {
            dest <- args[2]
            args <- tail(args, -2)
        },
        `--verbose` = ,
        `-v` = {
            verbose <- TRUE
            args <- args[-1]
        },
        `-o` = {
            out <- file(args[2], "w")
            on.exit(close(out))
            args <- tail(args, -2)
        },
        `-f` = {
            path_vec <- append(path_vec, args[2])
            args <- tail(args, -2)
        },
        {
            message(paste("Unrecognised argument:", args[1]))
            usage()
        }
    )
}

# TODO: Check if VFS dir exists without relying on a FS.stat exception
mkdir_tmpl <- "try{FS.stat('%s')}catch{FS.mkdirTree('%s')}\n"
file_tmpl <- "loadFile('/%s','%s','%s');\n"
header_out <- r"(var Module = globalThis.Module;
Module.createLazyFilesystem = function () {
var loadFile = function(dir, file, src) {
  let fn = ENVIRONMENT_IS_NODE ? FS.createPreloadedFile : FS.createLazyFile;
  fn(dir, file, Module.locateFile(src), true, true);
}
)"
dirs_out <- ""
files_out <- ""
footer_out <- "}\n"

for (paths in strsplit(path_vec, "@")) {
    if (!file.exists(paths[1])) {
        next
    }
    if (verbose) message(paste("Adding", paths[1]))

    for (src_path in paths[1]) {
        # Create directory structure
        dest_dir <- gsub("/$", "", paths[2])
        new_dirs <- file.path(dest_dir, list_dirs(src_path, full = FALSE))
        dirs_out <- append(dirs_out, sprintf(mkdir_tmpl, new_dirs, new_dirs))

        # Create lazy files
        files <- file.path(dest_dir,
            list_files(src_path, full = FALSE, recursive = TRUE)
        )
        parents <- gsub("^/", "", dirname(files))
        files <- basename(files)
        files_out <- append(files_out,
            sprintf(file_tmpl, parents, files,
                file.path(gsub("/$", "", url), parents, files)
            )
        )

        # Copy source files to destination
        lapply(file.path(dest, new_dirs),
            dir.create,
            showWarnings = FALSE,
            recursive = TRUE
        )
        file.copy(
            list_files(src_path, full = TRUE, recursive = TRUE),
            file.path(dest, parents, files),
            overwrite = TRUE
        )
    }
}

writeLines(c(header_out, dirs_out, files_out, footer_out), sep = "", con = out)
