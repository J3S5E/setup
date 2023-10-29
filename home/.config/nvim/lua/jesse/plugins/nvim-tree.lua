return {
	"nvim-tree/nvim-tree.lua",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
	},
	config = function()
		local nvimtree = require("nvim-tree")

		vim.g.loaded_netrw = 1
		vim.g.loaded_netrwPlugin = 1

		nvimtree.setup({
			view = {
				width = 40,
			},
			git = {
				ignore = false,
			},
			filters = {
				dotfiles = false,
				custom = { "^.git$" },
			},
			renderer = {
				icons = {
					glyphs = {
						git = {
							staged = "✓",
							deleted = "",
							renamed = "R",
							unstaged = "M",
							unmerged = "UM",
							untracked = "U",
							ignored = "_",
						},
					},
				},
			},
		})

		local keymap = vim.keymap

		keymap.set("n", "<leader>ee", "<cmd>NvimTreeFocus<CR>")
		keymap.set("n", "<C-b>b", "<cmd>NvimTreeToggle<CR>")
		keymap.set("n", "<leader>ef", "<cmd>NvimTreeFindFile<CR>")
		keymap.set("n", "<leader>ec", "<cmd>NvimTreeCollapse<CR>")
		keymap.set("n", "<leader>er", "<cmd>NvimTreeRefresh<CR>")
	end,
}
