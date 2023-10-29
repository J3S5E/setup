###############
#
#  ZSH Config
#
###############

#-----------------------------
# Source ext files
#-----------------------------
if [[ -f /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
  . /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi
if [[ -f  ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
  . ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh
  bindkey '^ ' autosuggest-accept # accept with <C-Space>
fi


#------------------------------
# History stuff
#------------------------------
HISTFILE=~/.zsh/.histfile
HISTSIZE=1000
SAVEHIST=1000


#------------------------------
# Variables
#------------------------------
export EDITOR="nvim"
typeset -U path PATH
path=(~/.local/bin $path)
export PATH


#------------------------------
# Vi mode
#------------------------------
bindkey -v
export KEYTIMEOUT=5
# Change cursor shape for different vi modes.
function zle-keymap-select {
if [[ ${KEYMAP} == vicmd ]] ||
  [[ $1 = 'block' ]]; then
  echo -ne '\e[1 q'

elif [[ ${KEYMAP} == main ]] ||
  [[ ${KEYMAP} == viins ]] ||
  [[ ${KEYMAP} = '' ]] ||
  [[ $1 = 'beam' ]]; then
  echo -ne '\e[5 q'
fi
}
zle -N zle-keymap-select
# Use beam shape cursor on startup.
echo -ne '\e[5 q'
# Use beam shape cursor for each new prompt.
preexec() {
  echo -ne '\e[5 q'
}


#------------------------------
# Menu tab complete
#------------------------------
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
# use the vi navigation keys in menu completion
bindkey -M menuselect 'h' vi-backward-char
bindkey -M menuselect 'k' vi-up-line-or-history
bindkey -M menuselect 'l' vi-forward-char
bindkey -M menuselect 'j' vi-down-line-or-history
bindkey -v '^?' backward-delete-char


#-----------------------------
# Theme
#-----------------------------
autoload -Uz promptinit && promptinit
prompt clint


#-----------------------------
# Dircolors
#-----------------------------
LS_COLORS='rs=0:di=01;34:ln=01;36:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:su=37;41:sg=30;43:tw=30;42:ow=34;42:st=37;44:ex=01;32:';
export LS_COLORS


#------------------------------
# Alias stuff
#------------------------------
alias ls="ls --color -F"
alias ll="ls --color -lh"


#------------------------------
# Window
#------------------------------
function preexec() {
  echo ""
}
function precmd() {
  echo "\n"
}
