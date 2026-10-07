#!/bin/zsh
set -eu
cd "$(dirname "$0")"
# Finder does not necessarily inherit the terminal's Node toolchain.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use --silent 22
fi
exec npm run dev
