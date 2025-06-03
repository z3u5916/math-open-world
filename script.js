import { Game } from './src/core/game.js'
import { restore } from './src/save/save.js'
(async () => {
		const game = new Game()
		await game.run()
})()
