#!/bin/bash


# update system
sudo pacman-mirrors --country Australia
sudo pacman -Syu --noconfirm --quiet


# install font
sudo pacman ttf-hack-nerd --noconfirm --quiet


# install neofetch
sudo pacman -S neofetch --noconfirm --quiet


# install nvim dependencies
sudo pacman -S nodejs npm ripgrep zip unzip --noconfirm --quiet

# install tmux
sudo pacman -S tmux --noconfirm --quiet

# install zsh
sudo pacman -S zsh --noconfirm --quiet
mkdir ~/.zsh
# install zsh dependencies
sudo pacman -S zsh-syntax-highlighting --noconfirm --quiet
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
# set zsh as default shell
chsh -s /usr/bin/zsh


# copy files from home/
cp -r ./home ~/ -T

# download kicksart.nvim
git clone https://github.com/nvim-lua/kickstart.nvim.git "${XDG_CONFIG_HOME:-$HOME/.config}"/nvim
