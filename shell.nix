let
  pkgs = import <nixpkgs> { };

  pkgs_old = import (builtins.fetchTarball {
      url = "https://github.com/NixOS/nixpkgs/archive/05bbf675397d5366259409139039af8077d695ce.tar.gz";
  }) {};

  pnpm_8 = pkgs_old.pnpm_8;
in
pkgs.mkShell {
  packages = [
    pkgs.nodejs_20
    pnpm_8
  ];
}
