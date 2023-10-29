return {
	{ "nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
	{
		"baliestri/aura-theme",
		lazy = false,
		priority = 1000,
		config = function(plugin)
			vim.opt.rtp:append(plugin.dir .. "/packages/neovim")
			vim.cmd([[colorscheme aura-dark]])
			vim.api.nvim_set_hl(0, "FloatBorder", { bg = "#000000" })
			vim.api.nvim_set_hl(0, "NormalFloat", { bg = "#0c0c10" })
			vim.cmd('hi VertSplit guibg=#262626 guifg=#262626')
		end,
	},
}
