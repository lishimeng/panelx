import {Loader} from "./Loder.ts";
import {World} from "./World.ts";
import type {Model} from "./model/Model.ts";

let canvasSelector: string

let loader: Loader
let world: World

let onLoaded: (loader: Loader, world: World) => void
let onRegister: ()=>Model[]

const onLoadModels = () => {
    onLoaded(loader, world)
}

const registerModel = (loader: Loader, m: Model) => {
    loader.getTemplateStore().addModel(m.modelName, m)
}

const initResources = () => {
    loader = new Loader(onLoadModels)

    let models = onRegister() // model列表
    for (let model of models) {
        registerModel(loader, model) // 注册所有model
    }

    loader.loadModels()
}

const initWorld = () => {
    console.log('start init world')
    if (!onLoaded) {
        console.log("load callback nil")
        return
    }
    if (!onRegister) {
        console.log("register callback nil")
        return
    }
    world = new World(canvasSelector)
    initResources()
}

export const setup3D = (selector: string, h: (loader: Loader, world: World)=>void, onRegisterModels: ()=>Model[]) => {
    if (!h) {
        return
    }
    canvasSelector = selector
    onLoaded = h
    onRegister = onRegisterModels
    initWorld()
}