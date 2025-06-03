import { Game } from "../core/game.js"
import { config, constants } from "../constants.js"
import { Resizeable } from "../utils.js"
import { Entity } from "../entities/entity.js"

export class Tileset {
    /**
     * !!! One shouldn't use the constructor to make a tileset, use the static create method instead
     * @param {Game} game - The current game
     * @param {Number} img_tile_size - The size of one tile in the source image (in pixels)
     * @param {Number} screen_tile_size - The size of one tile on the canvas
     * @param {Number} tileset_spacing - The spacing between tiles in the source image (in pixels)
     */
    constructor(game, img_tile_size, screen_tile_size, tileset_spacing) {
        this.img_tile_size = img_tile_size
        this.screen_tile_size = new Resizeable(game, screen_tile_size)
        this.game = game
        this.tileset_spacing = tileset_spacing
        this.img = null // Initialize the image to null
        this.src=""
    }

    /**
     * Creates a Tileset asynchronously.
     * @param {Game} game - The current game
     * @param {String} src - The path to the source image of the tileset
     * @param {Number} img_tile_size - The size of one tile in the source image (in pixels)
     * @param {Number} screen_tile_size - The size of one tile on the canvas
     * @param {Number} tileset_spacing - The spacing between tiles in the source image (in pixels)
     * @returns {Promise<Tileset>} - The created Tileset
     * @throws {Error} - If the image fails to load
     */
    static async create(game, src, img_tile_size, screen_tile_size, tileset_spacing) {
        this.src=src
        const tileset = new Tileset(game, img_tile_size, screen_tile_size, tileset_spacing)
        try {
            await tileset.load(config.IMG_DIR + src)
        } catch (error) {
            console.error(`Couldn't load file "${src}": ${error.message}`)
            throw new Error(`Failed to load tileset image: ${error.message}`)
        }
		tileset.tiles_length = Math.round(tileset.img.width * tileset.img.height / Math.pow(tileset.img_tile_size, 2))
		tileset.tilesPerRow = Math.floor(
			(tileset.img.width + tileset_spacing) / (tileset.img_tile_size + tileset_spacing)
		)
        game.tilesets[src.split(".").slice(0, -1).join(".")] = tileset
        return tileset
    }

    /**
     * Loads the tileset image.
     * @param {String} src - The path to the source image
     * @returns {Promise<void>}
     * @throws {Error} - If the image fails to load
     */
    async load(src) {
        this.src=src
        const img = new Image()
        img.src = src
        this.img = img


        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
        })
    }

    /**
     * Draws a tile from the tileset onto the canvas.
     * @param {Number} tile_num - The tile number to draw (1-based index)
     * @param {Number} screenX - The x-coordinate on the canvas to draw the tile
     * @param {Number} screenY - The y-coordinate on the canvas to draw the tile
     * @throws {Error} - If the tile number is out of bounds or the image is not loaded
     */
	drawTile(tile_num, screenX, screenY) {
		if (!this.img) {
			throw new Error("Tileset image not loaded.")
		}

		// subtract 1 (1-based index to 0-based index)
		tile_num = (tile_num - 1) % this.tiles_length // just in case

		const tile_num_x = tile_num % this.tilesPerRow
		const tile_num_y = Math.floor(tile_num / this.tilesPerRow)

		const tileX = tile_num_x * (this.img_tile_size + this.tileset_spacing)
		const tileY = tile_num_y * (this.img_tile_size + this.tileset_spacing)

		this.game.ctx.drawImage(
			this.img,
			tileX, tileY,
			this.img_tile_size, this.img_tile_size,
			Math.round(screenX), Math.round(screenY),
			Math.round(this.screen_tile_size.get()), Math.round(this.screen_tile_size.get())
		)
	}

    /**
     * 
     * @param {Entity} entity 
     * @param {Number} screenX 
     * @param {Number} screenY 
     */
	drawEntity(entity, screenX, screenY) {
		let offset = 1 + this.tilesPerRow * 4 * (entity.state -
            ((entity.framesPerState[constants.IDLE_STATE] == null && entity.state != constants.IDLE_STATE)?
            1: 0))
		
		const frame = entity.animation_step !== -1 ? entity.animation_step : 0
		const tileNum = offset + this.tilesPerRow * entity.direction + frame

		this.drawTile(tileNum, screenX, screenY)
	}

}

