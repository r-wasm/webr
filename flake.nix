{
  description = "webR development environment";

  # Flake inputs
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-23.05";
    # Use this commit to get Emscripten 3.1.45
    # See https://www.nixhub.io/packages/emscripten
    nixpkgs-emscripten.url =
      "github:NixOS/nixpkgs/75a52265bda7fd25e06e3a67dee3f0354e73243c";
  };

  # Flake outputs
  outputs = { self, nixpkgs, nixpkgs-emscripten }:
    let
      # Systems supported
      allSystems = [
        "x86_64-linux" # 64-bit Intel/AMD Linux
        "aarch64-linux" # 64-bit ARM Linux
        "x86_64-darwin" # 64-bit Intel macOS
        "aarch64-darwin" # 64-bit ARM macOS
      ];

      # Helper to provide system-specific attributes
      forAllSystems = f:
        nixpkgs.lib.genAttrs allSystems (system:
          f {
            pkgs = import nixpkgs { inherit system; };
            pkgs-emscripten = import nixpkgs-emscripten { inherit system; };
          });

    in {
      # Development environment output
      devShells = forAllSystems ({ pkgs, pkgs-emscripten }: {
        default = pkgs.mkShell {
          # The Nix packages provided in the environment
          packages = with pkgs;
            [
              cmake
              gperf
              lzma
              pcre2
              nodejs_18
              quilt
              wget

              libxml2
              git
              python3

              # Inputs for building R borrowed from:
              # https://github.com/NixOS/nixpkgs/blob/85f1ba3e/pkgs/applications/science/math/R/default.nix
              bzip2
              gfortran
              perl
              xz
              zlib
              icu
              bison
              which
              blas
              lapack
              curl
              tzdata

              pkg-config # For fontconfig
              sqlite # For proj
              glib # For pango
              unzip # For extracting font data
            ] ++ [ pkgs-emscripten.emscripten ];

          # This is a workaround for nix emscripten cache directory not being
          # writable. Borrowed from:
          # https://discourse.nixos.org/t/improving-an-emscripten-yarn-dev-shell-flake/33045
          # Issue at https://github.com/NixOS/nixpkgs/issues/139943
          #
          # Also note that `nix develop` must be run in the top-level directory
          # of the project; otherwise this script will create the cache dir
          # inside of the current working dir. Currently there isn't a way to
          # the top-level dir from within this file, but there is an open issue
          # for it. After that issue is fixed and the fixed version of nix is in
          # widespread use, we'll be able to use
          # https://github.com/NixOS/nix/issues/8034
          shellHook = ''
            if [ ! -d $(pwd)/.emscripten_cache-${pkgs-emscripten.emscripten.version} ]; then
              cp -R ${pkgs-emscripten.emscripten}/share/emscripten/cache/ $(pwd)/.emscripten_cache-${pkgs-emscripten.emscripten.version}
              chmod u+rwX -R $(pwd)/.emscripten_cache-${pkgs-emscripten.emscripten.version}
            fi
            export EM_CACHE=$(pwd)/.emscripten_cache-${pkgs-emscripten.emscripten.version}
            echo emscripten cache dir: $EM_CACHE
          '';
        };
      });
    };
}
