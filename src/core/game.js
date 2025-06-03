import { Map } from '../world/map.js'
import { Tileset } from '../world/tileset.js'
import { Player } from '../entities/player.js'
import { InputHandler } from './inputHandler.js'
import { Entity } from '../entities/entity.js'
import { Hitbox } from '../entities/hitbox.js'
import { Problem, TimedProblem } from '../ui/problem.js'
import { Attack } from '../entities/attack.js'
import { Ui } from '../ui/ui.js'
import { Button, NumberArea, Icon, Label, TextArea } from '../ui/widgets.js'
import { Talkable } from '../entities/talkable.js'
import { constants } from "../constants.js"
import { Transition, UnicoloreTransition } from '../ui/transition.js'
import { Dialogue, QuestionDialogue } from '../ui/dialogue.js'
import { Resizeable, YResizeable } from '../utils.js'
import { Effect } from '../entities/effect.js'
import { Frog } from '../entities/mobs/frog.js'
import { Spider } from '../entities/mobs/spider.js'
import { OptionsMenu } from '../ui/options.js'
import { AudioManager } from './audioManager.js'
import { Inventory } from '../ui/inventory.js'
import { Consumable, Item, ItemStack} from '../ui/items.js'
import { Parser } from '../save/parser.js'
import { save, restore } from '../save/save.js'

export class Game {
	constructor() {
		// setup canvas & context
		// localStorage.clear()
		/** @type {HTMLCanvasElement} */
		this.canvas = document.getElementById('game')
		this.canvas.width = window.innerWidth
		this.canvas.height = window.innerHeight

		constants.TILE_SIZE = this.canvas.width / 10

		/** @type {CanvasRenderingContext2D} */
		this.ctx = this.canvas.getContext('2d')
		this.ctx.imageSmoothingEnabled = false

		this.next_hitbox_id = 0
		this.next_attack_id = 0
		this.next_entity_id = 0
		/**@type {Array} */
		this.resizeables = []

		window.addEventListener('resize', () => {
			this.canvas.width = window.innerWidth
			this.canvas.height = window.innerHeight

			/** @type {CanvasRenderingContext2D} */
			this.ctx = this.canvas.getContext('2d')
			this.ctx.imageSmoothingEnabled = false

			constants.TILE_SIZE = this.canvas.width / 10

			this.resizeables.forEach(resizeable => {
				resizeable.resize(resizeable)
			})
		})
		window.addEventListener('unload', ()=>{
			localStorage.setItem("game", save(this))
		})
		// prevent right-click (as it provokes bugs)
		document.addEventListener('contextmenu', (event) => {
			event.preventDefault()
		})

		// initialize attributes
		/** @type {Array<Hitbox>} */
		this.hitboxes = []
		/** @type {Array<Hitbox>} */
		this.collision_hitboxes = []
		/** @type {Array<Hitbox>} */
		this.combat_hitboxes = []

		/** @type {Array<Entity>} */
		this.entities = []
		/** @type {Array<Attack>} */
		this.attacks = []

		/** @type {Array<Talkable>} */
		this.talkables = []

		/** @type {Item} */
		this.items = {}

		/** @type {Ui | Transition} */
		this.current_ui = null

		/** @type {{String: Map}} */
		this.maps = {}

		/** @type {{String: Tileset}} */
		this.tilesets = {}

		this.camera = { x: new Resizeable(this, -1000), y: new Resizeable(this, -1000)}

		/**@type {OptionsMenu} */
		this.options_menu = null
		
		this.effects = {
			MOTIONLESS: new Effect((entity) => {
				entity.e.fullSpeed = entity.new_fullSpeed
				entity.e.direction = entity.direction
			}, (entity) => {
				entity.direction = entity.e.direction
				entity.fullSpeed = entity.e.fullSpeed
				entity.new_fullSpeed = new Resizeable(this, 0)

				entity.e.fullSpeed = entity.new_fullSpeed
				entity.e.direction = entity.direction
			}, (entity) => {
				entity.e.fullSpeed = entity.fullSpeed
				entity.e.direction = entity.direction
			}, 0),
			ATTACK: new Effect((e) => {}, (entity) => {
				entity.state = entity.e.state
				entity.e.state = constants.ATTACK_STATE
			}, (entity) => {
				entity.e.state = entity.state
			}, 1000),
			BLINK: new Effect((e) => {}, (entity) => {entity.map = entity.e.map, entity.e.map = null}, (entity) => {entity.e.map = entity.map}, 0)
		}
	}

	async run() {
		// create class objects
		this.inputHandler = new InputHandler(this)
		this.audioManager = new AudioManager()
		this.audioManager.setSoundVolume(1)

		this.audioManager.preloadSounds('menu', [
			{path: 'click.mp3', key: 'click'}
		])
		this.audioManager.preloadSounds('game', [
			{path: 'slash.mp3', key: 'slash'}
		])

		await Tileset.create(this, "map.png", 16, constants.TILE_SIZE, 0)
		await Tileset.create(this, "cabane_tileset.png", 16, constants.TILE_SIZE, 0)
		await Tileset.create(this, "frog.png", 16, constants.TILE_SIZE * 0.5, 0)
		await Tileset.create(this, "spider_tileset.png", 100, constants.TILE_SIZE * 4, 0)
		await Tileset.create(this, "book_ui_focus.png", 4, this.canvas.width / 16, 0)
		await Tileset.create(this, "next_page_arrow_tileset.png", 24, this.canvas.width * 0.05, 0)
		await Tileset.create(this, 'Axe.png', 16, constants.TILE_SIZE, 0)
		await Tileset.create(this, "selection_cursor.png", 16, constants.TILE_SIZE / 2, 0)
		await Tileset.create(this, "checkbox_tileset.png", 32, constants.TILE_SIZE / 2, 0)

		await Map.create(this, 'house.json', this.tilesets["cabane_tileset"], "black", {x: constants.TILE_SIZE * 1.5, y: 3 * constants.TILE_SIZE}),
		await Map.create(this, 'map.json', this.tilesets["map"], "grey", {x: 15.5 * constants.TILE_SIZE, y: 14.01 * constants.TILE_SIZE})
		await Map.create(this, 'new_map.json', this.tilesets["map"], "grey", {x: 116.5 * constants.TILE_SIZE, y: 80.5 * constants.TILE_SIZE})

		this.options_menu = await OptionsMenu.create(this)
		
		this.current_map = "house" // "scene"
		this.map = this.maps[this.current_map]


		
		
		// new Frog(this, this.maps["map"], constants.TILE_SIZE * 12, constants.TILE_SIZE * 12, 0.5)
		
		await Tileset.create(this, 'Kanji.png', 16, constants.TILE_SIZE, 0)
		
    	const inventory = await Inventory.create(this, "inventory.png")
		this.player = new Player(this, this.tilesets["Kanji"], inventory)
		if (localStorage.getItem('game') != null ){ 
			restore(this)
			this.player.map = this.map
			this.player.combat_hitbox.map=this.map
			this.player.collision_hitbox.map=this.map
			this.player.raycast_hitbox.map = this.map
		}
		else{
		this.player.set_map(this.get_current_map())
		new Spider(this, this.maps["new_map"], 104 * constants.TILE_SIZE,73 * constants.TILE_SIZE, 100)
		}
		// needed to place the player correctly
		
		this.update()

		const colors_problem_finishing_ui = await Ui.create(this, "opened_book_ui.png", this.canvas.width * 0.6875, this.canvas.width * 0.453125, [
			new Button(this, "button",
				- this.canvas.width / 2, - this.canvas.height / 2, this.canvas.width, this.canvas.height,
				true, (button) => {
					button.ui.is_finished = true
				})
			], (ui) => {}
		)

		const black_transition = new UnicoloreTransition(this, 500, "black")

		const test_consumable = await Consumable.create(this, "Item_71.png", "example_item");

		const test_consumable_stack = new ItemStack(test_consumable, 1,true);
		
		inventory.add_items([test_consumable_stack])
		
		const test_item = await Consumable.create(this, "Item_51.png", "example_item");

		const test_item_stack = new ItemStack(test_item, 1,false);
		
		inventory.add_items([test_item_stack])

		const test_consumable2 = await Consumable.create(this, "Item_Black3.png", "example_item");

		const test_consumable_stack2 = new ItemStack(test_consumable2, 5,true);

		inventory.add_items([test_consumable_stack2])

		const colors_problem = await Problem.create(
			this, "book_ui.png", this.canvas.width * 0.34375, this.canvas.width * 0.453125, "colors",
			[	new Icon(this, "focus-icon", -100, -110, this.tilesets["book_ui_focus"], 1, false, 0),
				new NumberArea(this, "numberarea-pink", -this.canvas.width * 0.078125, -this.canvas.width * 0.0859375,
					this.canvas.width * 0.046875, this.canvas.width / 16,
					1, true, 1, this.canvas.width / 16, "black", "Times New Roman", ""),

				new NumberArea(this, "numberarea-blue", -this.canvas.width * 0.015625, -this.canvas.width * 0.0859375,
					this.canvas.width * 0.046875, this.canvas.width / 16,
					1, true, 1, this.canvas.width / 16, "black", "Times New Roman", ""),

				new NumberArea(this, "numberarea-red", this.canvas.width * 0.046875, -this.canvas.width * 0.0859375,
					this.canvas.width * 0.046875, this.canvas.width / 16,
					1, true, 1, this.canvas.width / 16, "black", "Times New Roman", ""),

				new Button(this, "button-undo-1", this.canvas.width * 0.15625, new YResizeable(this, -(this.canvas.height / 2)),
					this.canvas.width / 2 - this.canvas.width * 0.15625, new YResizeable(this, this.canvas.height), true, (button)=>{
						button.ui.is_finished=true
					}
				),
				new Button(this, "button-undo-2", -(this.canvas.width / 2), new YResizeable(this, -(this.canvas.height / 2)),
					this.canvas.width / 2 - this.canvas.width * 0.15625, new YResizeable(this, this.canvas.height), true, (button)=>{
						button.ui.is_finished=true
					}
				),
				new Button(this, "button-undo-3", -this.canvas.width * 0.15625, this.canvas.width * 0.1796875,
					this.canvas.width * 0.3125, new YResizeable(this, this.canvas.height / 2 - this.canvas.width * 0.1796875, (resizeable) => {
						resizeable.set_value(this.canvas.height / 2 - this.canvas.width * 0.1796875)
					}), true, (button)=>{
						button.ui.is_finished=true
					}
				),
				new Button(this, "button-undo-4", -this.canvas.width * 0.15625, new YResizeable(this, -(this.canvas.height / 2)),
					this.canvas.width * 0.3125, new YResizeable(this, this.canvas.height / 2 - this.canvas.width * 0.2109375, (resizeable) => {
						resizeable.set_value(this.canvas.height / 2 - this.canvas.width * 0.2109375)
					}), true, (button)=>{
						button.ui.is_finished=true
					}
				),
				new Button(this, "open-button", this.canvas.width / 16, this.canvas.height / 16,
					this.tilesets["next_page_arrow_tileset"].screen_tile_size.get(), this.tilesets["next_page_arrow_tileset"].screen_tile_size.get(), false, (button)=>{
						button.game.current_ui = colors_problem_finishing_ui
					}
				),
				new Icon(this, "open-icon", this.canvas.width / 16, this.canvas.height / 16, this.tilesets["next_page_arrow_tileset"], 1, false)
			],
			(problem) => {
				var numberarea_pink = problem.get_widget("numberarea-pink")
				var numberarea_blue = problem.get_widget("numberarea-blue")
				var numberarea_red = problem.get_widget("numberarea-red")
				var focus_icon = problem.get_widget("focus-icon")

				if(!problem.get_widget("open-button").rendered){
					if(numberarea_pink.has_focus){
						focus_icon.update_config(-this.canvas.width * 0.078125, -this.canvas.width * 0.0859375, null, 1, true)
					}else if(numberarea_blue.has_focus){
						focus_icon.update_config(-this.canvas.width * 0.015625, -this.canvas.width * 0.0859375, null, 2, true)
					}else if(numberarea_red.has_focus){
						focus_icon.update_config(this.canvas.width * 0.046875, -this.canvas.width * 0.0859375, null, 3, true)
					} else if(numberarea_pink.is_hovered) {
						focus_icon.update_config(-this.canvas.width * 0.078125, -this.canvas.width * 0.0859375, null, 1, true)
					} else if(numberarea_blue.is_hovered) {
						focus_icon.update_config(-this.canvas.width * 0.015625, -this.canvas.width * 0.0859375, null, 2, true)
					} else if(numberarea_red.is_hovered) {
						focus_icon.update_config(this.canvas.width * 0.046875, -this.canvas.width * 0.0859375, null, 3, true)
					} else {
						focus_icon.rendered = false
					}
				}else{
					focus_icon.rendered = false
				}

				if(problem.get_widget("open-button").is_hovered)
					problem.get_widget("open-icon").tile_nb = 2
				else
					problem.get_widget("open-icon").tile_nb = 1

				if (numberarea_pink.content === "3" && numberarea_blue.content === "4" && numberarea_red.content === "4") {
					problem.source.is_talkable = false
					problem.get_widget("open-button").rendered = true
					problem.get_widget("open-icon").rendered = true
					numberarea_pink.usable = false
					numberarea_blue.usable = false
					numberarea_red.usable = false
					problem.unfocus()
				}	
			}
		)
		const colors_problem_shelf = new Talkable(this, this.get_current_map(),
			new Hitbox(this, this.get_current_map(), constants.TILE_SIZE * 3, constants.TILE_SIZE * 3, constants.TILE_SIZE, constants.TILE_SIZE, false, false, null, (h, c_h, t) => {}),
			colors_problem, null
		)
		colors_problem.set_source(colors_problem_shelf)


		// test dialogue and its hitbox
		var threats_dialogue = await Dialogue.create(this, "dialogue_box.png",
			"Go and die !!!", (dialogue) => {}, constants.TILE_SIZE / 3
		)

		var mqc_dialogue = await QuestionDialogue.create(this, "dialogue_box.png",
			"Press 'Space' to dash, dash has a 10 seconds cooldown. You can also press 'E' when facing an object to interact with it.",
			["Ok", "No"], // anything can be added here and the box will be automatically generated
			this.canvas.width / 4, this.canvas.height / 4, this.canvas.width / 8, this.canvas.height / 16,
			"anwser_box.png", (dialogue, anwser) => {
				if (anwser === "No"){
					dialogue.game.current_ui = threats_dialogue
				}
				dialogue.source.destroy()
			}, constants.TILE_SIZE / 5, "black", "arial"
		)
		var dialogue_test = new Hitbox(this, this.get_current_map(), 0, 4 * constants.TILE_SIZE, constants.TILE_SIZE, constants.TILE_SIZE, false, false, null, (h, c_h, t) => {
			if(!c_h.player) return
			this.current_ui = mqc_dialogue
		})
		mqc_dialogue.set_source(dialogue_test)

		// SWITCH MAP HITBOXES
		// -- from the house (manual)
		new Hitbox(this, this.get_current_map(), 3 * constants.TILE_SIZE, 8 * constants.TILE_SIZE, constants.TILE_SIZE, constants.TILE_SIZE, false, false, null, (h, c_h, time) => {
			if(!c_h.player) return
			if (!this.inputHandler.isKeyPressed(constants.INTERACTION_KEY)) return // one must press INTERACTION_KEY to switch map
			this.maps["house"].set_player_pos({x: this.player.worldX.get(), y: this.player.worldY.get() - constants.TILE_SIZE / 2})
			this.set_map("new_map")

			this.player.set_map(this.maps["new_map"])
			this.player.direction = 0

			// reset dash
			if (this.player.dashing)
				this.player.dash_reset = true
			else
				this.player.last_dash = -constants.PLAYER_DASH_COOLDOWN

			black_transition.start(time)

		})

		// -- from the house (auto)
		new Hitbox(this, this.get_current_map(), 3 * constants.TILE_SIZE, 8.75 * constants.TILE_SIZE, constants.TILE_SIZE, constants.TILE_SIZE / 4, false, false, null, (h, c_h, time) => {
			if(!c_h.player) return
			this.maps["house"].set_player_pos({x: this.player.worldX.get(), y: this.player.worldY.get() - constants.TILE_SIZE / 2})
			this.set_map("new_map")

			this.player.set_map(this.maps["new_map"])
			this.player.direction = 0

			// reset dash
			if (this.player.dashing)
				this.player.dash_reset = true
			else
				this.player.last_dash = -constants.PLAYER_DASH_COOLDOWN

			black_transition.start(time)
		})

		// -- from the outside (manually activated)
		new Hitbox(this,
			this.maps["new_map"],
			116 * constants.TILE_SIZE,
			79 * constants.TILE_SIZE,
			constants.TILE_SIZE,
			constants.TILE_SIZE,
			false,
			false,
			null,
			(h, c_h, time) => {
				if(!c_h.player) return
				if (!this.inputHandler.isKeyPressed(constants.INTERACTION_KEY)) return
				this.maps["new_map"].set_player_pos({x: 116.5 * constants.TILE_SIZE, y: 80.5 * constants.TILE_SIZE})

				this.set_map("house")

				this.player.set_map(this.maps["house"])
				this.player.direction = 1

				this.player.reset_dash_cooldown()

				black_transition.start(time)
			}
		)
		// -- from the outside (automatic)
		new Hitbox(this,
			this.maps["new_map"],
			116 * constants.TILE_SIZE,
			79 * constants.TILE_SIZE,
			constants.TILE_SIZE,
			constants.TILE_SIZE / 4, 
			false, 
			false, 
			null, 
			(h, c_h, time) => {
				if(!c_h.player) return
				this.maps["new_map"].set_player_pos({x: 116.5 * constants.TILE_SIZE, y: 80.5 * constants.TILE_SIZE})

				this.set_map("house")

				this.player.set_map(this.maps["house"])
				this.player.direction = 1

				this.player.reset_dash_cooldown()

				black_transition.start(time)
			}
		)

		// problem 2

		const bridge_blocking_hitbox = new Hitbox(this, this.maps["new_map"], 86 * constants.TILE_SIZE, 76 * constants.TILE_SIZE, constants.TILE_SIZE, constants.TILE_SIZE, true, false);

		const uiWidth = this.canvas.width * 0.6875;
		const uiHeight = this.canvas.width * 0.453125;
		const uiHalfWidth = uiWidth / 2;
		const uiHalfHeight = uiHeight / 2;

		const bridge_problem = await Problem.create(
			this, 
			"opened_book_ui.png", 
			uiWidth, 
			uiHeight,
			"block_destroyer",
			[
				new Label(
					this,
					"hint-text",
					-uiHalfWidth * 0.8,
					-uiHalfHeight * 0.8,
					"La vérité s'éparpille dans les feuillages",
					true,
					1,
					this.canvas.width / 32,
				),
				new Label(
					this,
					"hint-text-1",
					-uiHalfWidth * 0.8,
					-uiHalfHeight * 0.6,
					"... compte bien, et le mot te sera révélé.",
					true,
					1,
					this.canvas.width / 32,
				),
				new TextArea(
					this, 
					"answer-input",
					-uiHalfWidth * 0.3, 
					-uiHalfHeight * 0.3,
					uiHalfWidth * 0.6,
					uiHalfHeight * 0.2,
					7, 
					true,
					1,
					this.canvas.width / 20,
					"black",
					"Times New Roman",
					""
				),
				new Button(
					this, 
					"submit-button",
					uiHalfWidth * 0.3, 
					-uiHalfHeight * 0.3,
					uiHalfWidth * 0.3,
					uiHalfHeight * 0.2,
					false,
					(button) => {
						const answerInput = button.ui.get_widget("answer-input");
						if (answerInput.content.toLowerCase() === "passage") {
							bridge_blocking_hitbox.destroy();
							button.ui.is_finished = true;
							bridge_problem_box.destructor();
						}
					}
				),
				new Button(
					this,
					"button-undo-left",
					-this.canvas.width/2,
					-this.canvas.height/2,
					this.canvas.width/2 - uiHalfWidth,
					this.canvas.height,
					true,
					(button) => { button.ui.is_finished = true; }
				),
				new Button(
					this,
					"button-undo-right",
					uiHalfWidth,
					-this.canvas.height/2,
					this.canvas.width/2 - uiHalfWidth,
					this.canvas.height,
					true,
					(button) => { button.ui.is_finished = true; }
				),
				new Button(
					this,
					"button-undo-top",
					-uiHalfWidth,
					-this.canvas.height/2,
					uiWidth,
					this.canvas.height/2 - uiHalfHeight,
					true,
					(button) => { button.ui.is_finished = true; }
				),
				new Button(
					this,
					"button-undo-bottom",
					-uiHalfWidth,
					uiHalfHeight,
					uiWidth,
					this.canvas.height/2 - uiHalfHeight,
					true,
					(button) => { button.ui.is_finished = true; }
				)
			],
			(problem) => {
				const answerInput = problem.get_widget("answer-input");
				const submitButton = problem.get_widget("submit-button");
				submitButton.rendered = answerInput.content.length > 0;
			}
		);
		var bridge_problem_box = new Talkable(
			this,
			this.maps["new_map"],
			new Hitbox(
				this,
				this.maps["new_map"],
				86 * constants.TILE_SIZE - constants.TILE_SIZE,
				76 * constants.TILE_SIZE - constants.TILE_SIZE,
				constants.TILE_SIZE * 3,
				constants.TILE_SIZE * 3,
				false,
				false,
				null,
				(h, c_h, t) => { }
			),
			bridge_problem
		)

		const bridge_dialogues = [
			await Dialogue.create(this, "dialogue_box.png", "11", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "12", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "22", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "25", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "32", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "33", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "34", (d) => {}, constants.TILE_SIZE / 3),
			await Dialogue.create(this, "dialogue_box.png", "35", (d) => {}, constants.TILE_SIZE / 3),
		]

		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 100 * constants.TILE_SIZE, 74 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[0])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 103 * constants.TILE_SIZE, 68 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[1])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 108 * constants.TILE_SIZE, 75 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[2])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 115 * constants.TILE_SIZE, 67 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[3])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 118 * constants.TILE_SIZE, 72 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[4])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 125 * constants.TILE_SIZE, 70 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[5])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 129 * constants.TILE_SIZE, 76 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[6])
		new Talkable(this, this.maps["new_map"], new Hitbox(this, this.maps["new_map"], 129 * constants.TILE_SIZE, 73 * constants.TILE_SIZE, constants.TILE_SIZE * 2, constants.TILE_SIZE * 2), bridge_dialogues[7])


		requestAnimationFrame(this.loop.bind(this))
	}

	/**
	 * 
	 * @param {Number} current_time 
	 * @returns 
	 */
	update(current_time) {
		// console.log(this.player.worldX.get(), this.player.worldY.get())
		// console.log(this.entities)
		// console.log(this.spider.worldX.get(), this.spider.worldY.get())
		this.collision_hitboxes = this.collision_hitboxes.filter(h => h.active)
		this.combat_hitboxes = this.combat_hitboxes.filter(h => h.active)
		this.hitboxes = this.hitboxes.filter(h => h.active)
		this.entities = this.entities.filter(e => e.active)

		if(this.current_ui) {
			if(this.current_ui.is_finished){
				this.current_ui.is_finished = false
				this.current_ui = null
			} else {
				if((this.current_ui instanceof Transition
					|| this.current_ui instanceof TimedProblem)
					&& !this.current_ui.start_time)

					this.current_ui.start_time = current_time
				this.current_ui.update(current_time)
				return
			}
		}else if(this.inputHandler.isKeyPressed("escape")){
			this.current_ui = this.options_menu
		}

		this.get_current_map().update(current_time)

		this.entities.forEach(entity => entity.update(current_time))

		this.camera.x.set_value(this.player.worldX.get() - this.canvas.width / 2)
		this.camera.y.set_value(this.player.worldY.get() - this.canvas.height / 2)

		if (this.get_current_map().world.width.get() <= this.canvas.width) {
			this.camera.x.set_value((this.get_current_map().world.width.get() - this.canvas.width) / 2)
		} else {
			this.camera.x.set_value(Math.max(0, Math.min(this.camera.x.get(), this.get_current_map().world.width.get() - this.canvas.width)))
		}

		if (this.get_current_map().world.height.get() <= this.canvas.height) {
			this.camera.y.set_value((this.get_current_map().world.height.get() - this.canvas.height) / 2)
		} else {
			this.camera.y.set_value(Math.max(0, Math.min(this.camera.y.get(), this.get_current_map().world.height.get() - this.canvas.height)))
		}

		this.attacks.forEach(attack => attack.update(current_time))

		Object.values(this.effects).forEach(effect => effect.update(current_time))

		this.talkables.forEach(talkable => {talkable.update()})

		this.player.inventory.update(current_time)
	}

	render() {
		/*
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		this.get_current_map().render_ground_blocks()

		this.entities.forEach(entity => entity.render())
		this.attacks.forEach(attack => attack.render())

		this.get_current_map().render_perspective()
		*/

		this.get_current_map().render()
		
		if(this.options_menu.debug) {
			this.hitboxes.forEach(hitbox => {hitbox.render()})
			this.talkables.forEach(talkable => {talkable.render()})
			this.get_current_map().renderGrid()
		}

		if(this.current_ui){
			this.current_ui.render()
		}
	}

	/**
	 * 
	 * @param {Number} current_time 
	 */
	loop(current_time) {
		this.update(current_time)
		this.render()
		requestAnimationFrame(this.loop.bind(this))
	}

	/**
	 * 
	 * @param {String} new_map_name 
	 */
	set_map(new_map_name){
		this.current_map = new_map_name
		this.map = this.maps[this.current_map]
	}

	/**
	 *
	 * @returns {Map}
	 */
	get_current_map(){
		return this.maps[this.current_map]
	}
}
