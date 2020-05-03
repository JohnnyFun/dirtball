// https://doc.babylonjs.com/features/es6_support

/**
// TODO:
// TODO: success screen words, see this: https://doc.babylonjs.com/how_to/gui
// TODO: multiple cameras? one for on character, other for moving around environment in god-mode
// TODO: window resize, reset game engine display...

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

import {ActionManager, Axis, CannonJSPlugin, DirectionalLight, ExecuteCodeAction, PhysicsImpostor, ShadowGenerator, Space, StandardMaterial, Texture, UniversalCamera} from '@babylonjs/core'

import CANNON from 'cannon'
import {Engine} from '@babylonjs/core/Engines/engine'
import {FollowCamera} from '@babylonjs/core/Cameras/followCamera'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import {Scene} from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math'
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
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => {
  keys[e.sourceEvent.key] = true
  if (e.sourceEvent.key === 'r') reset()
}))
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

var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = .7

// shadows
const shadowGenerator = new ShadowGenerator(2048, sun)

const characterSize = 2
const characterAcceleration = .3
const characterMaxSpeed = 10
let character = MeshBuilder.CreateSphere('character', {
  segments: 16,
  diameter: characterSize
}, scene)
character.material = dirtMaterial
character.physicsImpostor = new PhysicsImpostor(character, PhysicsImpostor.SphereImpostor, {mass: 10, restitution: .5 }, scene)
shadowGenerator.addShadowCaster(character)

let camera = new UniversalCamera('camera', new Vector3(0,0,0), scene)
positionCamera()

let ground = MeshBuilder.CreateGround('ground', {
  height: arenaSize,
  width: arenaSize
}, scene)
ground.material = grassMaterial
ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)
ground.receiveShadows = true

let wall = new MeshBuilder.CreateBox('wall', {
  width: 7,
  height: 5,
  depth: .5
}, scene)
wall.position.z = -7
wall.position.y = 2.5
wall.material = stoneMaterial
wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 }, scene);
wall.receiveShadows = true
shadowGenerator.addShadowCaster(wall)

let platform = MeshBuilder.CreateBox('platform', {
  height: 6,
  width: 6,
  depth: .5
}, scene)
platform.position.y = 5
platform.position.z = -10
platform.position.x = -10
platform.rotation.x = -Math.PI / 2
platform.material = stoneMaterial
platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

let ramp = MeshBuilder.CreateBox('platform2', {
  height: 12,
  width: 6,
  depth: .5
}, scene)
ramp.rotation.x = -Math.PI / 3
ramp.position.z = 0
ramp.position.x = -10
ramp.position.y = 2
ramp.material = stoneMaterial
ramp.physicsImpostor = new PhysicsImpostor(ramp, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

// let ramp2 = MeshBuilder.CreateBox('platform2', {
//   height: 12,
//   width: 6,
//   depth: .5
// }, scene)
// ramp2.rotation.z = -Math.PI / 3
// ramp2.position.z = 0
// ramp2.position.x = -10
// ramp2.position.y = 4
// ramp2.material = stoneMaterial
// ramp2.physicsImpostor = new PhysicsImpostor(ramp2, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

reset()
scene.onBeforeRenderObservable.add(() => {
  moveCharacter()
  positionCamera()
})

engine.runRenderLoop(() => {
  scene.render()
})

function positionCamera() {
  camera.position = new Vector3(character.position.x, character.position.y + 2, character.position.z - 3)
  camera.position.x = character.position.x
  camera.position.y = character.position.y + 2
  camera.position.z = character.position.z + 6
  camera.setTarget(character.position.clone())
}

function moveCharacter() {
  let velocity = character.physicsImpostor.getLinearVelocity().clone()

  if (character.position.y < -10) {
    // fell off ground...dead
    reset()
  }

  const falling = Math.abs(Math.round(velocity.y)) > 0
  if (falling) return // can't modify your velocity if you're falling

  if (keys['s']) {
    if (velocity.z < characterMaxSpeed) velocity.z += characterAcceleration
  }
  if (keys['w']) {
    if (velocity.z > -characterMaxSpeed) velocity.z -= characterAcceleration
  }
  if (keys['d']) {
    if (velocity.x > -characterMaxSpeed) velocity.x -= characterAcceleration
  }
  if (keys['a']) {
    if (velocity.x < characterMaxSpeed) velocity.x += characterAcceleration
  }

  character.physicsImpostor.setLinearVelocity(velocity)
}

function speeding(speed) {
  return Math.abs(speed) > characterMaxSpeed // crappy check, but don't let dirtball get going too fast
}

function reset() {
  character.position.set(0, 5, 0)
  character.physicsImpostor.setAngularVelocity(new Vector3(0,0,0))
  character.physicsImpostor.setLinearVelocity(new Vector3(0,0,0))
}