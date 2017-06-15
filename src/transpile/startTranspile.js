const startTranspile = options => {
	require('babel-register')({
		...options,
		babelrc: false,
	})
}

export default startTranspile
