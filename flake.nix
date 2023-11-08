{
  description = "webR development environment";

  # Flake inputs
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  # Flake outputs
  outputs = { self, nixpkgs }:
    let
      # Systems supported
      allSystems = [
        "x86_64-linux" # 64-bit Intel/AMD Linux
        "aarch64-linux" # 64-bit ARM Linux
        "x86_64-darwin" # 64-bit Intel macOS
        "aarch64-darwin" # 64-bit ARM macOS
      ];

      # Helper to provide system-specific attributes
      forAllSystems = f: nixpkgs.lib.genAttrs allSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
      });

    in
    {
      # Development environment output
      devShells = forAllSystems ({ pkgs }: {
        default = pkgs.mkShell {
          # The Nix packages provided in the environment
          packages = with pkgs; [
            emscripten
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

            pkg-config  # For fontconfig
            sqlite  # For proj
          ];

          # This is a workaround for nix emscripten cache directory not being
          # writable. Borrowed from:
          # https://discourse.nixos.org/t/improving-an-emscripten-yarn-dev-shell-flake/33045
          # Issue at https://github.com/NixOS/nixpkgs/issues/139943
          shellHook = ''
            if [ ! -d $(pwd)/.emscripten_cache ]; then
              cp -R ${pkgs.emscripten}/share/emscripten/cache/ $(pwd)/.emscripten_cache
              chmod u+rwX -R $(pwd)/.emscripten_cache
              echo Created $(pwd)/.emscripten_cache
            fi
            export EM_CACHE=$(pwd)/.emscripten_cache
          '';
        };
      });
    };
}
