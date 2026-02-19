local debug_mode = true
local recent_list_length = 30

-- Pull in the wezterm API
local wezterm = require("wezterm")
local act = wezterm.action
local io = require("io")
local os = require("os")

local is_windows = wezterm.target_triple:find("windows") ~= nil
local is_mac = wezterm.target_triple:find("darwin") ~= nil

local Home = is_windows and os.getenv("USERPROFILE") or os.getenv("HOME")

local fss = is_windows and "\\" or "/"

local default_programs_windows = {
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
			percent = 30,
		},
		{
			split = "h",
			app = { "cmd" },
			percent = 30,
		},
	},
}

local default_programs_unix = {
	{
		{
			app = { "/bin/zsh", "-i", "-c", "nvim ." },
		},
	},
	{
		{
			app = { "/bin/zsh", "-i", "-c", "lazygit" },
		},
		{
			split = "v",
			percent = 40,
		},
	},
}

local function get_default_programs()
	if is_windows then
		return default_programs_windows
	else
		return default_programs_unix
	end
end

local function ensure_trailing_slash(path)
	if path:sub(-1) ~= fss then
		return path .. fss
	end
	return path
end

local function ensure_no_trailing_slash(path)
	if path:sub(-1) == fss and #path > 1 then
		return path:sub(1, -2)
	end
	return path
end

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
config.window_close_confirmation = "NeverPrompt"

config.colors = {
	compose_cursor = "magenta",
}
config.color_scheme = "tokyonight"

config.font_size = is_mac and 14 or 10

local function set_env_path()
	if is_mac then
		config.set_environment_variables = {
			PATH = os.getenv("PATH") .. ":/opt/homebrew/bin:/opt/homebrew/sbin",
		}
	end
end
set_env_path()

config.background = {
	{
		source = {
			File = Home .. fss .. "Pictures" .. fss .. "terminal_background.png",
		},
		hsb = { brightness = 0.1 },
	},
}

local function get_default_prog()
	if is_windows then
		return { "cmd" }
	else
		return { "/bin/zsh", "-i" }
	end
end

config.default_prog = get_default_prog()

config.inactive_pane_hsb = {
	saturation = 0.3,
	brightness = 0.2,
}

config.font = wezterm.font_with_fallback({
	"Hack Nerd Font",
	"JetBrains Mono",
	"Symbols",
})

config.prefer_to_spawn_tabs = true

for _, gpu in ipairs(wezterm.gui.enumerate_gpus()) do
	if string.find(gpu.backend, "Direct%.") and gpu.device_type == "IntegratedGpu" then
		config.webgpu_preferred_adapter = gpu
		config.front_end = "WebGpu"
		config.webgpu_power_preference = "HighPerformance"
		break
	end
end

---------
---
--- FUNCTIONS
---
---------

local function debug(message)
	local log_file = Home .. fss .. "_wezterm.log"
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
		for match in (workspace):gmatch("(.-)" .. fss) do
			table.insert(result, match)
		end
		if not string.find(workspace, fss) then
			result = { workspace }
		end
		return zoomed .. index .. pane.title .. "   -   " .. result[#result]
	end

	return zoomed .. index .. pane.title
end

local function change_window_border(window, pane)
	local cwd_uri = pane:get_current_working_dir()
	local cwd = cwd_uri.file_path
	debug("Checking if window border should be changed for cwd: " .. cwd)
	local is_worktree = cwd:find(".worktree") ~= nil
	debug("is worktree: " .. tostring(is_worktree))
	if is_worktree then
		window:set_config_overrides({
			window_frame = {
				border_left_width = "0.5cell",
				border_right_width = "0.5cell",
				border_bottom_height = "0.25cell",
				border_top_height = "0.25cell",
				border_left_color = "green",
				border_right_color = "green",
				border_bottom_color = "green",
				border_top_color = "green",
			},
		})
	else
		window:set_config_overrides({
			window_frame = {},
		})
	end
end

local function get_cwd_string(pane)
	local cwd = tostring(pane:get_current_working_dir())
	local path
	if is_windows then
		path = cwd:gsub("file:///", ""):gsub("/", "\\")
	else
		path = cwd:gsub("file://", "")
		if path:sub(1, 2) == "~" then
			path = Home .. path:sub(2)
		end
		if path:sub(1, 1) ~= "/" then
			path = fss .. path:match("/(.*)")
		end
	end
	return ensure_no_trailing_slash(path)
end

local function is_git_dir(dir)
	dir = ensure_trailing_slash(dir)
	local head = dir .. ".git" .. fss .. "HEAD"
	local f = io.open(head, "a")
	if f then
		f:close()
		return true
	else
		return false
	end
end

local function update_recent(item, list)
	local recents_file = Home .. fss .. "_" .. list .. "_wezterm.recent"
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
	local recents_file = Home .. fss .. "_" .. list .. "_wezterm.recent"
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
	id = ensure_no_trailing_slash(id)
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
	local programs = get_default_programs()
	local wezrc = cwd .. fss .. ".wezrc"
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
			label = dir:match("([^\\/]+)$") or dir:match("([^\\/]+)[\\/]+$") or dir,
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

local function get_wez_nvim_args()
	if is_windows then
		return { "nvim", ".wezterm.lua" }
	else
		return { "/bin/zsh", "-i", "-c", "nvim .wezterm.lua" }
	end
end

local function goto_config(win, pane)
	if does_session_exist("wezterm_config") then
		goto_session(win, pane, "wezterm_config")
	else
		win:perform_action(
			act.SwitchToWorkspace({
				name = "wezterm_config",
				spawn = { cwd = Home, args = get_wez_nvim_args() },
			}),
			pane
		)
	end
end

local function opencode_args()
	if is_windows then
		return { "C:\\Program Files\\Git\\bin\\bash.exe", "-c", "opencode", "&&", "exit" }
	else
		return { "/bin/zsh", "-i", "-c", "opencode" }
	end
end

local function open_agent(win, pane, cwd, agent_workspace)
	win:perform_action(
		act.SwitchToWorkspace({
			name = agent_workspace,
			spawn = {
				cwd = cwd,
				args = opencode_args(),
			},
		}),
		pane
	)
end

local agent_session_suffix = "__agent"

local function switch_agent_workspace_not_git(win, pane, cwd)
	local workspace = win:active_workspace()
	local agent_workspace = workspace .. agent_session_suffix
	if workspace:sub(-#agent_session_suffix) == agent_session_suffix then
		local other_workspace = workspace:sub(1, -(#agent_session_suffix + 1))
		if does_session_exist(other_workspace) then
			goto_session(win, pane, other_workspace)
		end
		return
	end
	if does_session_exist(agent_workspace) then
		goto_session(win, pane, agent_workspace)
	else
		open_agent(win, pane, cwd, agent_workspace)
	end
end

local function make_new_worktree(cwd, window, pane)
	debug("Making new worktree for repo: " .. cwd)
	local default_branch = io.popen("git -C " .. cwd .. " symbolic-ref refs/remotes/origin/HEAD")
		:read("*a")
		:match("refs/remotes/origin/(.*)\n")
	debug("default branch: " .. default_branch)
	local branches_string = io.popen("git -C " .. cwd .. " branch --format=%(refname:short)"):read("*a")
	local branches = {}
	for branch in branches_string:gmatch("(.-)\n") do
		table.insert(branches, branch)
	end
	debug("git branchs output: " .. dump(branches))
	local checked_out = io.popen("git -C " .. cwd .. " rev-parse --abbrev-ref HEAD"):read("*a"):match("(.*)\n")
	debug("checked out branch: " .. checked_out)
	if checked_out == default_branch then
		checked_out = ""
	end
	window:perform_action(
		act.PromptInputLine({
			description = "Enter branch name:",
			initial_value = checked_out,
			action = wezterm.action_callback(function(win2, pane3, name)
				if name and name ~= "cancel" and name ~= default_branch then
					local branch_exists = false
					for _, branch in ipairs(branches) do
						if branch == name then
							branch_exists = true
							debug("branch exists: " .. name)
							break
						end
					end
					cwd = ensure_trailing_slash(cwd)
					local new_worktree_path = cwd .. ".worktrees" .. fss .. name
					if not branch_exists then
						io.popen("git -C " .. cwd .. " checkout -b " .. name)
						io.popen("git -C " .. cwd .. " checkout " .. checked_out)
						io.popen("git -C " .. cwd .. " checkout " .. checked_out)
					end
					if name == checked_out then
						io.popen("git -C " .. cwd .. " checkout " .. default_branch)
						io.popen("git -C " .. cwd .. " checkout " .. default_branch)
					end
					debug("Attempting to create worktree: " .. new_worktree_path)
					os.execute("git -C " .. cwd .. " worktree add " .. new_worktree_path .. " " .. name)
					debug("New worktree created at: " .. new_worktree_path)
					cwd = ensure_no_trailing_slash(cwd)
					open_agent(win2, pane3, new_worktree_path, cwd .. agent_session_suffix .. "__" .. name)
					return
				end
			end),
		}),
		pane
	)
end

local function switch_agent_workspace_git(win, pane, cwd)
	local workspace = win:active_workspace()
	while workspace:sub(-1) == fss do
		workspace = workspace:sub(1, -2)
	end
	while cwd:sub(-1) == fss do
		cwd = cwd:sub(1, -2)
	end
	local is_agent_workspace = workspace:find(agent_session_suffix) ~= nil
	if is_agent_workspace then
		local other_workspace = workspace:sub(1, win:active_workspace():find(agent_session_suffix) - 1)
		if does_session_exist(other_workspace) then
			debug("switching to other workspace: " .. other_workspace)
			goto_session(win, pane, other_workspace)
		end
		return
	end
	local is_worktree_dir = cwd:find(".worktree") ~= nil
	if is_worktree_dir then
		cwd = ensure_no_trailing_slash(cwd)
		debug("current worktree dir: " .. cwd)
		local worktree_name = cwd:match(".worktrees(.*)")
		if worktree_name:sub(1, 1) == fss then
			worktree_name = worktree_name:sub(2)
		end
		worktree_name = worktree_name:gsub("\\", "/")
		debug("worktree name: " .. worktree_name)
		local base_cwd = cwd:match("(.*).worktrees") or cwd:match("(.*).worktree")
		base_cwd = ensure_no_trailing_slash(base_cwd)
		local agent_workspace = base_cwd .. agent_session_suffix .. "__" .. worktree_name
		debug("agent workspace for worktree: " .. agent_workspace)
		debug("checking if agent workspace exists: " .. agent_workspace)
		if does_session_exist(agent_workspace) then
			goto_session(win, pane, agent_workspace)
		else
			open_agent(win, pane, cwd, agent_workspace)
		end
		return
	end
	local output = io.popen("git -C " .. cwd .. " worktree list --porcelain"):read("*a")
	local worktrees = {}
	for path in output:gmatch("worktree (.-)\n") do
		table.insert(worktrees, path)
	end
	local options = {
		{
			label = "NO WORKTREE",
			id = "no_worktree",
		},
	}
	for _, worktree in ipairs(worktrees) do
		if worktree:find(".worktree") ~= nil then
			local label = worktree:match(".worktrees/(.*)")
			table.insert(options, {
				label = label,
				id = worktree,
			})
		end
	end
	local default_branch = io.popen("git -C " .. cwd .. " symbolic-ref refs/remotes/origin/HEAD")
		:read("*a")
		:match("refs/remotes/origin/(.*)\n")
	if default_branch then
		table.insert(options, {
			label = "NEW WORKTREE",
			id = "new_worktree",
		})
	else
		if #worktrees < 2 then
			open_agent(win, pane, cwd, cwd .. agent_session_suffix)
			return
		end
	end
	if #worktrees > 1 then
		table.insert(options, {
			label = "CLEAR WORKTREE",
			id = "clear_worktree",
		})
	end

	local function ask_clear_worktrees(window, clear_pane)
		local clear_options = {}
		for _, worktree in ipairs(worktrees) do
			if worktree:find(".worktree") ~= nil then
				table.insert(clear_options, {
					label = worktree,
					id = worktree,
				})
			end
		end
		if #clear_options == 0 then
			debug("No worktrees to clear")
			return
		end
		table.insert(clear_options, {
			label = "CANCEL",
			id = "cancel",
		})
		window:perform_action(
			act.InputSelector({
				title = "Choose a worktree to remove",
				choices = clear_options,
				action = wezterm.action_callback(function(win2, pane2, id)
					if id and id ~= "cancel" then
						os.execute("echo n | git -C " .. cwd .. " worktree remove --force " .. id)
						if is_windows then
							os.execute('rmdir /S /Q "' .. id .. '"')
						else
							os.execute('rm -rf "' .. id .. '"')
						end
					end
					switch_agent_workspace_git(win2, pane2, cwd)
				end),
			}),
			clear_pane
		)
	end

	win:perform_action(
		act.InputSelector({
			title = "Choose a worktree",
			choices = options,
			action = wezterm.action_callback(function(window, pane2, id, label)
				if id then
					debug("chosen: " .. id)
					if id == "no_worktree" then
						label = ""
						id = cwd
					elseif id == "new_worktree" then
						make_new_worktree(cwd, window, pane2)
						return
					elseif id == "clear_worktree" then
						ask_clear_worktrees(window, pane2)
						return
					else
						label = "__" .. label
					end
					local agent_workspace = cwd .. agent_session_suffix .. label
					if does_session_exist(agent_workspace) then
						goto_session(window, pane2, agent_workspace)
					else
						open_agent(window, pane2, id, agent_workspace)
					end
				end
				return nil
			end),
		}),
		pane
	)
end

local function switch_agent_workspace(win, pane)
	local cwd = get_cwd_string(pane)
	local is_git = is_git_dir(cwd)
	local is_worktree = cwd:find(".worktree") ~= nil
	if is_git or is_worktree then
		switch_agent_workspace_git(win, pane, cwd)
	else
		switch_agent_workspace_not_git(win, pane, cwd)
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
		key = "F11",
		mods = "ALT",
		action = act.ToggleFullScreen,
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
		key = "a",
		mods = "ALT",
		action = wezterm.action_callback(switch_agent_workspace),
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
wezterm.on("update-status", change_window_border)

-- Finally, return the configuration to wezterm
return config
