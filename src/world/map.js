import { Game } from "../core/game.js"
import { Tileset } from "./tileset.js"
import { Hitbox } from "../entities/hitbox.js"
import { collisions, constants, config, blockDepthOrder } from "../constants.js"
import { Resizeable } from "../utils.js"

export class Map {
	/**
	 * !!! One shouldn't use the constructor to make a map, use the static create method instead
	 * @param {Game} game - The current game
	 * @param {Tileset} tileset - The tileset used to render the map
	 * @param {String} background - The color of the tileless background
	 * @param {{x: Number, y: Number}} player_pos - The position of the player on this specific map
	 */
	constructor(game, tileset, background, player_pos) {
		this.game = game
		this.tileset = tileset
		this.ground = []
		this.blocks = []
		this.perspective = []
		this.src=""
		this.world = {}
		this.background = background
		this.player_pos = {
			x: new Resizeable(game, player_pos.x),
			y: new Resizeable(game, player_pos.y)
		}
	}

	/**
	 * A scenery on which are put other objects (entities, hitboxes, ...). This method is async and static
	 * @param {Game} game - The current game
	 * @param {String} src - The path to the json file used as a reference to layout the map
	 * @param {Tileset} tileset - The tileset used to render the map
	 * @param {String} background - The color of the tileless background
	 * @param {{x: Number, y: Number}} player_pos - The position of the player on this specific map
	 * @returns {Promise<Map>}
	 */
	static async create(game, src, tileset, background, player_pos) {
		this.src=src
		const map = new Map(game, tileset, background, player_pos)
		await map.load(src)
		//try {
			//await map.load(src)
		//} catch (error) {
		//	console.error(`Failed to load map "${src}": ${error.message}`)
		//}
		game.maps[src.slice(0, src.length - 5)] = map
		return map
	}

	/**
	 * 
	 * @param {String} src 
	 */
	async load(src) {
		this.src = src
		// extract json
		const response = await fetch(config.MAP_DIR + src)
		if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`)
		}
		const body = await response.json()
		this.width = body.width
		this.height = body.height
		this.world.width = new Resizeable(this.game, this.width * constants.TILE_SIZE)
		this.world.height = new Resizeable(this.game, this.height * constants.TILE_SIZE)

		this.animated_tiles = body.animated || {}
		this.framerate = null
		if(body.map_framerate)
			this.framerate = body.map_framerate
		this.last_frame_time = 0
		this.current_frame = 0
		this.animation_tilesets = {}

		for(let tile_num of Object.keys(this.animated_tiles)){
			tile_num = parseInt(tile_num)
			if(this.animated_tiles[tile_num].tileset.path == "current")
				this.animation_tilesets[tile_num] = this.tileset
			else if(!isNaN(this.animated_tiles[tile_num].tileset.path))
				this.animation_tilesets[tile_num] = this.animation_tilesets[parseInt(this.animated_tiles[tile_num].tileset.path)]
			else
				this.animation_tilesets[tile_num] = await Tileset.create(this.game,
					this.animated_tiles[tile_num].tileset.path,
					this.animated_tiles[tile_num].tileset.tilesize,
					constants.TILE_SIZE, this.animated_tiles[tile_num].tileset.spacing)
		}

		for (let layer of body.layers) {
			if (layer.type !== "tilelayer") continue

			switch (layer.name) {
				case "Ground":
					this.ground.push(layer)
					break
				case "Blocks":
					this.blocks.push(layer)
					break
				case "Perspective":
					this.perspective.push(layer)
					break
			}

			if (layer.name !== "Blocks")
				continue

			// create hitboxes for blocks tiles
			for (let i = 0; i < layer.data.length; i++) {
				const tileId = layer.data[i]
				if (!tileId) continue

				const tileX = (i % layer.width) * constants.TILE_SIZE
				const tileY = Math.floor(i / layer.width) * constants.TILE_SIZE

				let [x, y, width, height] = [0, 0, constants.TILE_SIZE, constants.TILE_SIZE]

				if (this.src in collisions && tileId in collisions[this.src]) {
					const col = collisions[this.src][tileId]
					const scale = constants.TILE_SIZE / 128

					x = (col.x || 0) * scale
					y = (col.y || 0) * scale
					width = col.width !== undefined ? col.width * scale : constants.TILE_SIZE - x
					height = col.height !== undefined ? col.height * scale : constants.TILE_SIZE - y
				}

				new Hitbox(this.game, this, tileX + x, tileY + y, width, height, true, false)
			}
		}

		// create a border around the map to prevent glitches
		new Hitbox(this.game, this, 0, 0, this.world.width.get(), this.world.height.get())

	}

	/**
	 * 
	 * @param {Number} current_time 
	 */
	update(current_time){
		if(!this.framerate) return
		if(current_time - this.last_frame_time >= this.framerate){
			this.current_frame++
			this.last_frame_time = current_time
		}
	}

	/**
	 * 
	 * @param {{x: Number, y: Number}} new_player_pos 
	 */
	set_player_pos(new_player_pos){
		this.player_pos.x.set_value(new_player_pos.x)
		this.player_pos.y.set_value(new_player_pos.y)
	}

	render() {
		this.game.ctx.fillStyle = this.background
		this.game.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height)

		const camera_x = this.game.camera.x.get()
		const camera_y = this.game.camera.y.get()

		const startTileX = Math.max(0, Math.floor(camera_x / constants.TILE_SIZE))
		const startTileY = Math.max(0, Math.floor(camera_y / constants.TILE_SIZE))
		const endTileX = Math.min(this.width, Math.ceil((camera_x + this.game.canvas.width) / constants.TILE_SIZE))
		const endTileY = Math.min(this.height, Math.ceil((camera_y + this.game.canvas.height) / constants.TILE_SIZE))

		// reset entities rendered flags
		this.game.entities.forEach(entity => entity.rendered = false)

		for (let y = startTileY; y < endTileY; y++) {
			const screenY = y * constants.TILE_SIZE - camera_y

			// render background first
			for (let x = startTileX; x < endTileX; x++) {
				const screenX = x * constants.TILE_SIZE - camera_x
				for (const layer of this.ground) {
					const tileNum = layer.data[y * this.width + x]
					this.renderTile(tileNum, screenX, screenY)
				}
			}

			// render depth sorted blocks & entities
			const depthBlocks = blockDepthOrder[this.src]
			for (const block of depthBlocks) {
				const hb = collisions[this.src]?.[block] || {}
				let bottom_y = y * constants.TILE_SIZE
				if (!hb.height)
					bottom_y += constants.TILE_SIZE
				else
					bottom_y += constants.TILE_SIZE / 128 * (hb.y || 0 + hb.height)

				// render entities above the depth block 
				this.game.entities
					.filter(entity =>
						entity.collision_hitbox && 
						entity.bottom_y.get() + entity.combat_hitbox.y2.get() < bottom_y && 
						!entity.rendered
					)
					.sort((a, b) => a.bottom_y.get() + a.combat_hitbox.y2.get() - b.combat_hitbox.y2.get() - b.bottom_y.get())
					.forEach(entity => entity.render())

				// render the depth block
				for (let x = startTileX; x < endTileX; x++) {
					const screenX = x * constants.TILE_SIZE - camera_x
					for (const layer of this.blocks) {
						if (layer.data[y * this.width + x] === block) {
							this.renderTile(block, screenX, screenY)
						}
					}
				}
			}

			// render remain entities in this row
			this.game.entities
				.filter(entity =>
					entity.collision_hitbox &&
					entity.bottom_y.get() + entity.combat_hitbox.y2.get() <= (y + 1) * constants.TILE_SIZE &&
					!entity.rendered
				)
				.sort((a,b) => a.bottom_y.get() + a.combat_hitbox.y2.get() - b.bottom_y.get() - b.combat_hitbox.y2.get())
				.forEach(entity => entity.render())

			// render the rest of blocks in the row
			for (let x = startTileX; x < endTileX; x++) {
				const screenX = x * constants.TILE_SIZE - camera_x

				for (const layer of this.blocks) {
					const tileNum = layer.data[y * this.width + x]
					if (tileNum && !(this.src in collisions && tileNum in collisions[this.src])) {
						this.tileset.drawTile(tileNum, screenX, screenY)
					}
				}
			}
		}

		this.game.entities
			.filter(entity => !entity.rendered)
			.sort((a,b) => a.bottom_y.get() + a.combat_hitbox.y2.get() - b.bottom_y.get() - b.combat_hitbox.y2.get())
			.forEach(entity => entity.render())

		// render perspective layers
		for (let y = startTileY; y < endTileY; y++) {
			const screenY = y * constants.TILE_SIZE - camera_y
			for (let x = startTileX; x < endTileX; x++) {
				const screenX = x * constants.TILE_SIZE - camera_x
				for (const layer of this.perspective) {
					const tileNum = layer.data[y * this.width + x]
					if (tileNum) {
						this.tileset.drawTile(tileNum, screenX, screenY)
					}
				}
			}
		}

		this.game.attacks.forEach(attack => attack.render())
	}

	renderTile(tileNum, screenX, screenY) {
		if (!tileNum) {
				return
			}

		if (this.animated_tiles?.[tileNum]) {
			const frameIndex = this.current_frame % this.animated_tiles[tileNum].frameorder.length
			const frame = this.animated_tiles[tileNum].frameorder[frameIndex]
			this.animation_tilesets[tileNum]?.drawTile(frame, screenX, screenY)
		} else {
			this.tileset.drawTile(tileNum, screenX, screenY)
		}
	}

	renderGrid() {
		const camera_x = this.game.camera.x.get()
		const camera_y = this.game.camera.y.get()
		const tileSize = constants.TILE_SIZE
		
		const startTileX = Math.max(0, Math.floor(camera_x / tileSize))
		const startTileY = Math.max(0, Math.floor(camera_y / tileSize))
		const endTileX = Math.min(this.width, Math.ceil((camera_x + this.game.canvas.width) / tileSize))
		const endTileY = Math.min(this.height, Math.ceil((camera_y + this.game.canvas.height) / tileSize))

		this.game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)' // semi-transparent white
		this.game.ctx.lineWidth = 1
		this.game.ctx.beginPath()

		for (let x = startTileX; x <= endTileX; x++) {
			const screenX = x * tileSize - camera_x
			this.game.ctx.moveTo(screenX, startTileY * tileSize - camera_y)
			this.game.ctx.lineTo(screenX, endTileY * tileSize - camera_y)
		}

		for (let y = startTileY; y <= endTileY; y++) {
			const screenY = y * tileSize - camera_y
			this.game.ctx.moveTo(startTileX * tileSize - camera_x, screenY)
			this.game.ctx.lineTo(endTileX * tileSize - camera_x, screenY)
		}

		this.game.ctx.stroke()
	}
}
