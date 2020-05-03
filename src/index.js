// https://doc.babylonjs.com/features/es6_support

/**
// TODO: make char not able to go through wall or fall off ground
// TODO: why character doesn't fall with gravity applied? maybe try starting character on a plane above the ground and make him roll off?
// TODO: success screen words, see this: https://doc.babylonjs.com/how_to/gui
// TODO: multiple cameras? one for on character, other for moving around environment in god-mode

 * TODO (keep SUPER SIMPLE. get something working, then add to it):
 *  - (SKIP gen, just make static one first!) generate config object to describe the maze
 *    - size of maze
 *      - say 100x100 or whatever perimeter
 *      - hallway width of 10
 *    - walls on perimiter
 *    - 2 doors (in on right side, out on left side)
 *      - compute based on hallway width, place randomly in one of the possible slots
 *    - put walls through middle on all possible slots
 *      - a grid of walls both x and y
 *    - then cut doors in a path to exit
 *    - return something like:
 *      - { 
 *          height: 100,
 *          
 *        }
 *  - throw-away method to draw the maze in 2d? Or just go straight to 3d
 *  - start with cube as character first
 *    - hook up wasd controls to move through maze
 *  - detect when character makes it to other side, Winner!, track time it took
 *    - limit so they can't simply walk around the maze...or through walls in the maze for that matter
 */

import {ActionManager, Axis, CannonJSPlugin, DirectionalLight, ExecuteCodeAction, PhysicsImpostor, ShadowGenerator, Space, StandardMaterial, Texture} from '@babylonjs/core'
import {Color3, Vector3} from '@babylonjs/core/Maths/math'

import CANNON from 'cannon'
import {Engine} from '@babylonjs/core/Engines/engine'
import {FollowCamera} from '@babylonjs/core/Cameras/followCamera'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import {Scene} from '@babylonjs/core/scene'
import maze from './maze'

const canvas = document.getElementById('renderCanvas')
const engine = new Engine(canvas)
let scene = new Scene(engine)

// physics
const gravityVector = new Vector3(0,-9.81, 0)
const physicsPlugin = new CannonJSPlugin(undefined, undefined, CANNON)
scene.enablePhysics(gravityVector, physicsPlugin)

let arenaSize = 60

let keys = {}
scene.actionManager = new ActionManager(scene)
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => keys[e.sourceEvent.key] = true))
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => keys[e.sourceEvent.key] = false))

let dirtMaterial = new StandardMaterial('poop', scene)
const poopTexture = new Texture('textures/poop.jpg')
dirtMaterial.bumpTexture = poopTexture
dirtMaterial.bumpTexture.level = 1
dirtMaterial.diffuseTexture = poopTexture

let stoneMaterial = new StandardMaterial('gravel', scene)
stoneMaterial.diffuseTexture = new Texture('textures/stone.jpg')

let grassMaterial = new StandardMaterial('grassMat', scene)
let grassTexture = new GrassProceduralTexture('grassTxt', arenaSize*arenaSize, scene)
grassMaterial.ambientTexture = grassTexture

let sun = new DirectionalLight("light", new Vector3(0, -1, -1), scene)
window.light = sun
sun.position = new Vector3(10, 40, 10)
// Default intensity is 1. Let's dim the light a small amount
sun.intensity = 0.6

var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = .7

// shadows
const shadowGenerator = new ShadowGenerator(2048, sun)

const characterSize = 2
const characterSpeed = .1
let characterWrapper = MeshBuilder.CreateBox('characterWrapper', {
  size: characterSize
})
let transparentMaterial = new StandardMaterial('transparentMaterial', scene)
transparentMaterial.alpha = 0
characterWrapper.material = transparentMaterial
characterWrapper.position.y = 5
characterWrapper.position.z = 3
// characterWrapper.ellipsoid = new Vector3(characterSize, characterSize, characterSize)

let character = MeshBuilder.CreateSphere('character', {
  segments: 16,
  diameter: characterSize
}, scene)
character.material = dirtMaterial
character.parent = characterWrapper
shadowGenerator.addShadowCaster(character)

characterWrapper.physicsImpostor = new PhysicsImpostor(character, PhysicsImpostor.SphereImpostor, {mass: 1}, scene)
characterWrapper.checkCollisions = true
// characterWrapper.applyGravity = true

let camera = new FollowCamera('camera', new Vector3(0, 2, -10), scene)
camera.lockedTarget = characterWrapper
camera.checkCollisions = true
camera.applyGravity = true

let ground = MeshBuilder.CreateGround('ground', {
  height: arenaSize,
  width: arenaSize
}, scene)
ground.material = grassMaterial
ground.checkCollisions = true
ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)
ground.receiveShadows = true

// let platform = MeshBuilder.CreateGround('platform', {
//   height: 6,
//   width: 6
// }, scene)
// platform.position.y = 3
// platform.checkCollisions = true
// platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

let wall = new MeshBuilder.CreateBox('wall', {
  width: 7,
  height: 5,
  depth: 1
}, scene)
// wall.position.z = 5
wall.material = stoneMaterial
wall.checkCollisions = true
wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 }, scene);
wall.receiveShadows = true
shadowGenerator.addShadowCaster(wall)

scene.onBeforeRenderObservable.add(() => {
  moveCharacter()
})

engine.runRenderLoop(() => {
  scene.render()
})

function moveCharacter() {
  if (keys['s']) {
    characterWrapper.position.z += characterSpeed
    character.rotate(Axis.X, characterSpeed, Space.WORLD)
  }
  if (keys['w']) {
    characterWrapper.position.z -= characterSpeed
    character.rotate(Axis.X, -characterSpeed, Space.WORLD)
  }
  if (keys['d']) {
    characterWrapper.position.x -= characterSpeed
    character.rotate(Axis.Z, characterSpeed, Space.WORLD)
  }
  if (keys['a']) {
    characterWrapper.position.x += characterSpeed
    character.rotate(Axis.Z, -characterSpeed, Space.WORLD)
  }
}