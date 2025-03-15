-- Pull in the wezterm API
local wezterm = require("wezterm")

local act = wezterm.action

-- This will hold the configuration.
local config = wezterm.config_builder()

config.window_background_opacity = 0.9
config.enable_tab_bar = false
config.window_padding = {
	left = 0,
	right = 0,
	top = 0,
	bottom = 0,
}
config.exit_behavior = "Close"
config.font_size = 10
config.window_close_confirmation = "NeverPrompt"
config.keys = {
	{
		key = "w",
		mods = "CTRL|ALT",
		action = wezterm.action.CloseCurrentPane({ confirm = false }),
	},
	{
		key = "g",
		mods = "CTRL|ALT",
		action = wezterm.action_callback(function(win, pane)
			win:perform_action(wezterm.action.SpawnCommandInNewTab({ args = { "nvim", "." } }), pane)
			win:perform_action(wezterm.action.SpawnCommandInNewTab({ args = { "lazygit" } }), pane)
			win:perform_action(
				wezterm.action.SplitHorizontal({ args = { "C:\\Program Files\\Git\\bin\\bash.exe" } }),
				pane
			)
			win:perform_action(wezterm.action.SplitVertical({ args = { "cmd" } }), pane)
		end),
	},
}
config.mouse_bindings = {
	{
		event = { Down = { streak = 1, button = "Right" } },
		mods = "NONE",
		action = wezterm.action_callback(function(window, pane)
			local has_selection = window:get_selection_text_for_pane(pane) ~= ""
			if has_selection then
				window:perform_action(act.CopyTo("ClipboardAndPrimarySelection"), pane)
				window:perform_action(act.ClearSelection, pane)
			else
				window:perform_action(act({ PasteFrom = "Clipboard" }), pane)
			end
		end),
	},
}

-- Default program
config.default_prog = { "cmd" }

-- Finally, return the configuration to wezterm
return config
