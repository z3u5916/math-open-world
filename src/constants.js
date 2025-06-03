export const config = {
	MAP_DIR: "./assets/maps/",
	IMG_DIR: "./assets/images/",
	AUDIO_DIR: "./assets/audio/"
}

export const constants = {
    TILE_SIZE: 128,

    PLAYER_COLLISION_BOX_WIDTH: 2 * 128 / 3,
    PLAYER_COLLISION_BOX_HEIGHT: 128 / 2,
    PLAYER_COMBAT_BOX_WIDTH: 2 * 128 / 3,
    PLAYER_COMBAT_BOX_HEIGHT: 128,

    PLAYER_DASH_DURATION: 100,
    PLAYER_DASH_COOLDOWN: 3000,
    PLAYER_DASH_SPEED: 5,
    PLAYER_DASH_MAX_SPEED: 30,

    LABEL_TYPE: "label",
    BUTTON_TYPE: "button",
    TEXTAREA_TYPE: "textarea",
    NUMBERAREA_TYPE: "numberarea",
    ICON_TYPE: "icon",
    TEXTURE_TYPE: "texture",

    UP_KEY: "z",
    DOWN_KEY: "s",
    LEFT_KEY: "q",
    RIGHT_KEY: "d",
    INTERACTION_KEY: "e",
    DASH_KEY: " ",
	DRAG_KEY: "f",


	DOWN_DIRECTION: 0,
	UP_DIRECTION: 1,
	RIGHT_DIRECTION: 2,
	LEFT_DIRECTION: 3,


	MOUSE_LEFT_BUTTON: 0,
	MOUSE_MIDDLE_BUTTON: 1,
	MOUSE_RIGHT_BUTTON: 2,
	MOUSE_BACK_BUTTON: 3,
	MOUSE_FORWARD_BUTTON: 4,

    IDLE_STATE: 0,
	WALK_STATE: 1,
	ATTACK_STATE: 2,
	DRAG_STATE: 3,
    RUSHING_STATE: 4,

	WANDERING_AI_STATE: 0,
	STILL_AI_STATE: 1,
	CHASING_AI_STATE: 2,
    RUSH_AI_STATE: 3,
    Longrangeattacking_AI_STATE: 4,
    HEALTH_COLORS:['red', 'orange', 'green']
}

// The future has arrived
// the format is
// map_name: tile_number: {x: new_x, y: new_y, width: new_width, height: new_height}
//
// with:
// map_name the path to the map file, String
// tile_number the number of the tile that needs to be changed in the maps' tileset, Number
//
// new_x, new_y the new ccordinates of the top-left corner of the hitbox, 0 by default, Numbers
// new_width, new_height the new width and height of the hitbox, constants.TILE_SIZE by default, Numbers
//
// x, y, width and height takes their default values when not specified
export const collisions = {
    "map.json": {
        76: { width: 96, height: 112},
        113: {x: 22, y: 75, width: 85, height: 25},
        114: {x: 32, width: 64, height: 112},
        127: {x: 56, width: 72},
        131: {width: 72},
        167: {x: 56, width: 72, height: 110},
        168: {height: 110},
        170: {height: 110},
        171: {width: 72, height: 110},
    },
    "house.json": {
        11: {y: -8, height: 96},
        55: {y: -8, height: 96}
    },
	"new_map.json": {
		169: {width: 0, height: 1},
		76: { x: 20, y: 90, width: 76, height: 22},
        113: {x: 22, y: 75, width: 85, height: 25},
        114: {x: 32, width: 64, height: 112},
        127: {x: 56, width: 72},
        131: {width: 72},
        167: {x: 56, width: 72, height: 110},
        168: {height: 110},
        170: {height: 110},
        171: {width: 72, height: 110},
		721: {x: 50,width:30,height:110},
		724: {y:32, height:80, x:40, width: 48},
		725: {x:50, width:30},
		683: {x:40, y: 56, height:56, width:48},
		684: {x:40,y:56, width:48},
		685: {y:56, height:32},
		723: {x:40, y:32, height:80, width:48}
	}
}


export const blockDepthOrder = {
    "map.json": [
        127,
        131,
        113,
        171,
        168,
        170,
        167,
        76,
        114
    ],
    "house.json": [
        11,
        55
    ],
	"new_map.json": [
		169,
		131,
        127,
        725,
        684,
        683,
        724,
        685,
        113,
		723,
        721,
        168,
        170,
        167,
        171,
        114,
        76  
	]
}