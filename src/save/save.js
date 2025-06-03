import { Parser } from "./parser.js";
import { Game } from "../core/game.js";
export function save(game){
    const parser = new Parser(game)
    const game_entities = []
    game.entities.forEach(element => {
        if(!element.player){
            game_entities.push(parser.to_json_entity(element))
        }
    });
    const items = {
        current_map : game.current_map,
        entities : game_entities,
        player_WX : game.player.worldX.get(),
        player_WY : game.player.worldY.get(),
        canvas_width : game.canvas.width,
    }
    
    return JSON.stringify(items)
}

export function restore(game){
    const items = JSON.parse(localStorage.getItem('game'))
    const parser = new Parser(game)
    game.current_map = items.current_map
    game.map = game.maps[game.current_map]
    game.player.worldX.set_value(items.player_WX)
    game.player.worldY.set_value(items.player_WY)
    
    items.entities.forEach(e => {
        parser.from_json_entity(e)
    })
}