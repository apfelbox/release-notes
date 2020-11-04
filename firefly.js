const {Firefly} = require("@21torr/firefly");

module.exports = (new Firefly())
	.js({
		"app": "js/app.ts"
	})
	.disableFileNameHashing();
