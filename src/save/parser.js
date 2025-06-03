import { collisions } from "../constants.js"
import { Hitbox } from "../entities/hitbox.js"
import { Entity } from "../entities/entity.js"
import { Tileset } from "../world/tileset.js"
import { Spider } from "../entities/mobs/spider.js"
import { Frog } from "../entities/mobs/frog.js"
export class Parser{
    constructor(game){
        this.game=game
    }
    to_json_hitbox(hitbox){
        const items = {
            map : hitbox.map.src === "house.json" ? "house" : "new_map",
            id : hitbox.id,
            x : hitbox.x,
            y : hitbox.y,
            width : hitbox.width.get(),
            height : hitbox.height.get(),
            player : hitbox.player,
            canvas_width : this.game.canvas.width
        }
        return JSON.stringify(items)
    }
    from_jon_hitbox(hitbox_string){
        const items = JSON.parse(hitbox_string)
        let hitbox = new Hitbox(this.game, this.game.maps[items.map], items.x, items.y, items.width, items.height)
        return hitbox
    }



    to_json_entity(entity){
        const items = {
            life : entity.life,
            map : entity.map.src === "house.json" ? "house" : "new_map",
            id : entity.id,
            state : entity.state,
            worldX : entity.worldX.get(),
            worldY : entity.worldY.get(),
            // life : entity.life,
            tileset : entity.tileset.src.split(".").slice(0, -1).join("."),
            combat_hitbox : this.to_json_hitbox(entity.combat_hitbox), 
            collision_hitbox : this.to_json_hitbox(entity.collision_hitbox),
            type : entity.type
        }
        return JSON.stringify(items)
    }
    from_json_entity(entity_string){
        const items = JSON.parse(entity_string)
        let entity = 0
        console.log(items.type)
        switch (items.type){
            case "Spider":
                entity = new Spider(this.game, this.game.maps[items.map], items.worldX, items.worldY)
                entity.life = items.life
                break
            case "Frog":
                entity = new Frog(this.game, this.game.maps[items.map], items.worldX, items.worldY)
                break
        }
        return entity
    }
}