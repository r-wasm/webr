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
  -i path@parent  Add all files under the directory 'path' to the Emscripten
                  filesystem as lazy filesystem images.
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
image_vec <- character(0)

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
        `-i` = {
            image_vec <- append(image_vec, args[2])
            args <- tail(args, -2)
        },
        {
            message(paste("Unrecognised argument:", args[1]))
            usage()
        }
    )
}

file_tmpl <- "loadFile('/%s','%s','%s');\n"
image_tmpl <- "loadImage('/%s','%s','%s','%s');\n"
header_out <- r"(var Module = globalThis.Module;
Module.createLazyFilesystem = function () {
let fsPathCache = [];

// Load a single file into the VFS. Lazy load in browser, preload in Node
let loadFile = function(dir, file, src) {
  if (fsPathCache.includes(`${dir}/${file}`)) {
    return;
  }
  fsPathCache.push(`${dir}/${file}`);

  let fn = ENVIRONMENT_IS_NODE ? FS.createPreloadedFile : FS.createLazyFile;
  FS.mkdirTree(dir);
  fn(dir, file, Module.locateFile(src), true, true);
}

// Lazy load a file from an Emscripten FS image
let loadImage = function(dir, file, src, mountpoint) {
  if (fsPathCache.includes(`${dir}/${file}`)) {
    return;
  }
  fsPathCache.push(`${dir}/${file}`);

  FS.mkdirTree(dir);
  let node = FS.createFile(dir, file, { isDevice: false } , true, true);

  let forceLoadFile = function(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) {
      return true;
    }

    if (ENVIRONMENT_IS_NODE) {
      Module.mountImagePath(Module.locateFile(src), mountpoint)
    } else {
      Module.mountImageUrl(Module.locateFile(src), mountpoint)
    }

    let mountNode = Module.FS.lookupPath(`${dir}/${file}`).node;
    node.contents = mountNode.contents;
    node.size = mountNode.size;
  }

  Object.defineProperties(node, {
    usedBytes: {
      get: function() {
        forceLoadFile(node);
        return node.size;
      }
    }
  });

  let stream_ops = {};
  Object.keys(node.stream_ops).forEach((key) => {
    let fn = node.stream_ops[key];
    stream_ops[key] = (...args) => {
      forceLoadFile(node);
      return fn(...args);
    };
  });
  node.stream_ops = stream_ops;
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

for (paths in strsplit(image_vec, "@")) {
    if (!file.exists(paths[1])) {
        next
    }
    if (verbose) message(paste("Adding", paths[1], "(as image)"))

    for (src_path in paths[1]) {
        # Create lazy files
        dest_dir <- gsub("/$", "", paths[2])
        files <- file.path(dest_dir,
            list_files(src_path, full = FALSE, recursive = TRUE)
        )
        parents <- gsub("^/", "", dirname(files))
        files <- basename(files)
        data_file <- paste0(gsub("^/", "", dest_dir), '.data')
        js_file <- paste0(gsub("^/", "", dest_dir), '.js')
        data_url <- file.path(gsub("/$", "", url), data_file)

        files_out <- append(files_out,
            sprintf(image_tmpl, parents, files, data_url, paths[2])
        )

        # Build image from source files
        dir.create(file.path(dest, dirname(js_file)),
            showWarnings = FALSE, recursive = TRUE)
        emscripten_root <- dirname(Sys.which("emcc")[[1]])
        file_packager <- file.path(emscripten_root, "tools", "file_packager")
        res <- system2(file_packager,
            args = c(file.path(dest, data_file),
                "--preload", sprintf("'%s@/'", src_path),
                "--separate-metadata",
                sprintf("--js-output='%s'", file.path(dest, js_file))
            ),
            stdout = TRUE,
            stderr = TRUE
        )
        unlink(file.path(dest, js_file))

        # If there is some problem, print the output of `file_packager` and stop
        status <- attr(res, "status")
        if (!is.null(status) && status != 0) {
            stop(
                "An error occurred running `file_packager`:\n",
                paste(res, collapse = "\n")
            )
        }
    }
}

writeLines(c(header_out, files_out, footer_out), sep = "", con = out)
