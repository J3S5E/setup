local debug_mode = true
local recent_list_length = 30
local default_programs = {
	{
		{
			app = { "nvim", "." },
		},
	},
	{
		{
			app = { "lazygit" },
		},
		{
			split = "v",
			app = { "C:\\Program Files\\Git\\bin\\bash.exe" },
			percent = 10,
		},
		{
			split = "h",
			app = { "cmd" },
			percent = 10,
		},
	},
}

-- Pull in the wezterm API
local wezterm = require("wezterm")
local act = wezterm.action
local io = require("io")
local os = require("os")
local Home = os.getenv("userprofile")

-- This will hold the configuration.
local config = wezterm.config_builder()

config.default_cwd = Home
config.scrollback_lines = 10000
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

config.colors = {
	compose_cursor = "magenta",
}
config.color_scheme = "tokyonight"

config.background = {
	{
		source = {
			File = "https://wallpapers.com/images/hd/black-space-te0qf47nq9l959es.jpg",
		},
		hsb = { brightness = 0.1 },
	},
}

-- Default program
config.default_prog = { "cmd" }

config.inactive_pane_hsb = {
	saturation = 0.3,
	brightness = 0.2,
}

config.font = wezterm.font_with_fallback({
	"Hack Nerd Font",
	"JetBrains Mono",
	"Symbols",
})

config.unix_domains = {
	{
		name = "unix",
	},
}

config.prefer_to_spawn_tabs = true

---------
---
--- FUNCTIONS
---
---------

local function debug(message)
	local log_file = Home .. "\\_wezterm.log"
	if debug_mode then
		local f = io.open(log_file, "a")
		if f then
			f:write(message .. "\n")
			f:close()
		end
	end
end

local function dump(o)
	if type(o) == "table" then
		local s = "{ "
		for k, v in pairs(o) do
			if type(k) ~= "number" then
				k = '"' .. k .. '"'
			end
			s = s .. "[" .. k .. "] = " .. dump(v) .. ","
		end
		return s .. "} "
	else
		return tostring(o)
	end
end

local function change_window_title(tab, pane, tabs)
	local zoomed = ""
	if tab.active_pane.is_zoomed then
		zoomed = "[Z] "
	end

	local index = ""
	if #tabs > 1 then
		index = string.format("[%d/%d] ", tab.tab_index + 1, #tabs)
	end

	local workspace = wezterm.mux.get_active_workspace()
	if workspace ~= "default" then
		local result = {}
		for match in (workspace):gmatch("(.-)\\") do
			table.insert(result, match)
		end
		if not string.find(workspace, "\\") then
			result = { workspace }
		end
		return zoomed .. index .. pane.title .. "   -   " .. result[#result]
	end

	return zoomed .. index .. pane.title
end

local function get_cwd_string(pane)
	local cwd = tostring(pane:get_current_working_dir())
	return cwd:gsub("file:///", ""):gsub("/", "\\")
end

local function is_git_dir(dir)
	local head = dir .. ".git\\HEAD"
	local f = io.open(head, "a")
	if f then
		f:close()
		return true
	else
		return false
	end
end

local function update_recent(item, list)
	local recents_file = Home .. "\\_" .. list .. "wezterm.recent"
	debug("updating recent")
	local recents = {}
	-- get existing recent files (besides current)
	local f = io.open(recents_file, "r")
	if f then
		for line in f:lines() do
			if line ~= item and #recents < recent_list_length then
				table.insert(recents, line)
			end
		end
		f:close()
	end
	-- add dir to top
	table.insert(recents, 1, item)
	debug("New recent dirs: " .. table.concat(recents, ", "))
	-- write recent list
	f = io.open(recents_file, "w")
	if f then
		for _, recent in ipairs(recents) do
			f:write(recent .. "\n")
		end
		f:close()
	end
end

local function get_recent(list)
	local recents_file = Home .. "\\_" .. list .. "_wezterm.recent"
	local dirs = {}
	-- get existing recent files (besides current)
	local f = io.open(recents_file, "r")
	if f then
		for line in f:lines() do
			table.insert(dirs, line)
		end
		f:close()
	end
	if #dirs == 0 then
		debug("no recent found")
		dirs = { Home }
	end
	debug("Recent dirs found: " .. table.concat(dirs, ", "))
	return dirs
end

local function does_session_exist(id)
	debug("Attempting to find session - " .. id)
	local workspaces = wezterm.mux.get_workspace_names()
	for _, workspace in ipairs(workspaces) do
		if workspace == id then
			debug("match found")
			return true
		end
		debug("session not match - " .. workspace)
	end
	debug("match not found")
	return false
end

local function goto_session(win, pane, id)
	debug("Attempting to join workspace - " .. id)
	win:perform_action(
		act.SwitchToWorkspace({
			name = id,
		}),
		pane
	)
end

local function open_splits(win, pane, splits)
	debug("Attempting to open splits: " .. dump(splits))
	for i = 2, #splits do
		debug("splits loop iteration: " .. i)
		local program = splits[i]
		local per = 50
		if program.percent ~= nil then
			per = program.percent
		end
		win:perform_action(
			act.SplitPane({
				direction = program.split == "v" and "Right" or "Down",
				command = { args = program.app },
				size = { Percent = per },
			}),
			pane
		)
	end
end

local function start_session(win, pane, cwd)
	debug("Starting session - " .. cwd)
	local programs = default_programs
	local wezrc = cwd .. "\\.wezrc"
	local f = io.open(wezrc, "r")
	if f then
		local line = f:read("*l")
		programs = wezterm.serde.json_decode(line)
	end
	debug("programs to start - " .. wezterm.serde.json_encode(programs))
	local window1apps = programs[1]
	win:perform_action(
		act.SwitchToWorkspace({
			name = cwd,
			spawn = { cwd = cwd, args = window1apps[1].app },
		}),
		pane
	)
	open_splits(win, pane, window1apps)
	win:perform_action(act.ActivatePaneByIndex(0), pane)
	for i = 2, #programs do
		debug("programs loop iteration: " .. i)
		local win_programs = programs[i]
		debug("opening new window for: " .. dump(win_programs))
		win:perform_action(act.SpawnCommandInNewTab({ args = win_programs[1].app }), pane)
		open_splits(win, pane, win_programs)
		win:perform_action(act.ActivatePaneByIndex(0), pane)
	end
	win:perform_action(act.ActivateTab(0), pane)
	win:maximize()
end

local function prompt_then_change(win, pane, sessions, type)
	local options = {}
	for _, dir in ipairs(sessions) do
		table.insert(options, {
			label = dir,
			id = dir,
		})
	end
	win:perform_action(
		act.InputSelector({
			title = "Choose a directory",
			choices = options,
			action = wezterm.action_callback(function(window, pane2, id)
				if id then
					debug("chosen: " .. id)
					update_recent(id, type)
					if does_session_exist(id) then
						goto_session(window, pane2, id)
					else
						start_session(window, pane2, id)
					end
				end
				return nil
			end),
		}),
		pane
	)
end

local function goto_repo(win, pane)
	local cwd = get_cwd_string(pane)
	debug("CWD: " .. cwd)
	if is_git_dir(cwd) then
		debug("Git found")
		update_recent(cwd, "repos")
	end
	local recents = get_recent("repos")
	prompt_then_change(win, pane, recents, "repos")
end

local function goto_config(win, pane)
	if does_session_exist("wezterm_config") then
		goto_session(win, pane, "wezterm_config")
	else
		win:perform_action(
			act.SwitchToWorkspace({
				name = "wezterm_config",
				spawn = { cwd = Home, args = { "nvim", ".wezterm.lua" } },
			}),
			pane
		)
	end
end

---------
---
--- BINDINGS
---
---------
-- mouse behavior
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
-- key behavior
config.disable_default_key_bindings = true
config.leader = { key = "w", mods = "ALT", timeout_milliseconds = 5000 }
config.keys = {
	{
		key = "q",
		mods = "LEADER",
		action = act.CloseCurrentPane({ confirm = false }),
	},
	{
		key = "e",
		mods = "LEADER",
		action = act.PaneSelect({ alphabet = "FJDKSLA;CMRUEIWOQP" }),
	},
	{
		key = "v",
		mods = "LEADER",
		action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }),
	},
	{
		key = "s",
		mods = "LEADER",
		action = act.SplitVertical({ domain = "CurrentPaneDomain" }),
	},
	{
		key = "h",
		mods = "LEADER",
		action = act.ActivatePaneDirection("Left"),
	},
	{
		key = "l",
		mods = "LEADER",
		action = act.ActivatePaneDirection("Right"),
	},
	{
		key = "k",
		mods = "LEADER",
		action = act.ActivatePaneDirection("Up"),
	},
	{
		key = "j",
		mods = "LEADER",
		action = act.ActivatePaneDirection("Down"),
	},
	{
		key = "Tab",
		mods = "CTRL",
		action = act.ActivateTabRelative(1),
	},
	{
		key = "Tab",
		mods = "CTRL|SHIFT",
		action = act.ActivateTabRelative(-1),
	},
	{
		key = "f",
		mods = "ALT",
		action = act.Search({ CaseInSensitiveString = "" }),
	},
	{
		key = "f",
		mods = "ALT|SHIFT",
		action = act.Search({ CaseSensitiveString = "" }),
	},
	{
		key = "v",
		mods = "ALT",
		action = act.ActivateCopyMode,
	},
	{
		key = "]",
		mods = "ALT",
		action = act.ActivateTabRelative(1),
	},
	{
		key = "[",
		mods = "ALT",
		action = act.ActivateTabRelative(-1),
	},
	{
		key = "=",
		mods = "ALT",
		action = act.IncreaseFontSize,
	},
	{
		key = "-",
		mods = "ALT",
		action = act.DecreaseFontSize,
	},
	{
		key = "t",
		mods = "CTRL|SHIFT",
		action = act.SpawnTab("CurrentPaneDomain"),
	},
	{
		key = "v",
		mods = "CTRL|SHIFT",
		action = act.PasteFrom("Clipboard"),
	},
	{
		key = "g",
		mods = "ALT",
		action = wezterm.action_callback(goto_repo),
	},
	{
		key = "c",
		mods = "ALT",
		action = wezterm.action_callback(goto_config),
	},
	{
		key = "s",
		mods = "ALT",
		action = act.ShowLauncherArgs({ flags = "WORKSPACES" }),
	},
}

---------
---
--- ON EVENTS
---
---------
-- window title
wezterm.on("format-window-title", change_window_title)

-- Finally, return the configuration to wezterm
return config
