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

import '@babylonjs/loaders/glTF'

import {ActionManager, Axis, CannonJSPlugin, DirectionalLight, ExecuteCodeAction, PhysicsImpostor, SceneLoader, ShadowGenerator, Skeleton, Space, StandardMaterial, Texture, UniversalCamera} from '@babylonjs/core'

import CANNON from 'cannon'
import {Engine} from '@babylonjs/core/Engines/engine'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import {Scene} from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math'
import maze from './maze'

const canvas = document.getElementById('renderCanvas')
const engine = new Engine(canvas)
window.addEventListener('resize', e => engine.resize())
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
platform.position.set(-10, 5, -10)
platform.rotation.x = -Math.PI / 2
platform.material = stoneMaterial
platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

let ramp = MeshBuilder.CreateBox('ramp', {
  height: 12,
  width: 6,
  depth: .5
}, scene)
ramp.rotation.x = -Math.PI / 3
ramp.position.set(-10, 2, 0)
ramp.material = stoneMaterial
ramp.physicsImpostor = new PhysicsImpostor(ramp, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

let ramp2 = MeshBuilder.CreateBox('ramp2', {
  height: 6,
  width: 12,
  depth: .5
}, scene)
ramp2.rotate(Axis.Y, Math.PI/10, Space.WORLD)
ramp2.rotate(Axis.X, Math.PI/2, Space.WORLD)
ramp2.position.set(-2, 6.9, -10)
ramp2.material = stoneMaterial
ramp2.physicsImpostor = new PhysicsImpostor(ramp2, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

addLittleFella()

let i = 0
reset()
scene.onBeforeRenderObservable.add(() => {
  moveCharacter()
  positionCamera()
})

engine.runRenderLoop(() => {
  scene.render()
})

function reset() {
  character.position.set(0, 5, 10)
  character.physicsImpostor.setAngularVelocity(new Vector3(0,0,0))
  character.physicsImpostor.setLinearVelocity(new Vector3(0,0,0))
  positionCamera()
}

function moveCharacter() {
  const fellOffArena = character.position.y < -10
  if (fellOffArena) reset()
  let velocity = character.physicsImpostor.getLinearVelocity().clone()
  
  const falling = Math.abs(Math.round(velocity.y)) > 0
  if (falling) return // can't modify your velocity if you're in the air

  if (keys['s'] && velocity.z < characterMaxSpeed) {
    velocity.z += characterAcceleration
  }
  if (keys['w'] && velocity.z > -characterMaxSpeed) {
    velocity.z -= characterAcceleration
  }
  if (keys['d'] && velocity.x > -characterMaxSpeed) {
    velocity.x -= characterAcceleration
  }
  if (keys['a'] && velocity.x < characterMaxSpeed) {
    velocity.x += characterAcceleration
  }

  character.physicsImpostor.setLinearVelocity(velocity)
}

function positionCamera() {
  camera.position = new Vector3(character.position.x, character.position.y + 2, character.position.z - 3)
  camera.position.x = character.position.x
  camera.position.y = character.position.y + 2
  camera.position.z = character.position.z + 6
  camera.rotation.x = Math.PI / 15 // tilted slightly down
  camera.rotation.y = Math.PI
  
  // // TODO: rotate camera based on angular velocity. tricky though since you'd ideally keep the WASD controls relative to the camera's rotation
  // const velocity = character.physicsImpostor.getLinearVelocity()
  
  // i++
  // if (i % 50 === 0) console.log(velocity)

  // const movingFasterOnZ = Math.abs(velocity.z) > Math.abs(velocity.x)

  // if (movingFasterOnZ) {

  // }
  // const movingForward = velocity.z < 0 && movingFasterOnZ

  // if (movingForward) camera.rotation.y = 0
  // const movingBackward = velocity.z < 0 && Math.abs(velocity.z) > Math.abs(velocity.x) 
  // if (movingBackward) camera.rotation.y = Math.PI

  // else camera.rotation.y = Math.PI
}

function addLittleFella() {
  SceneLoader.ImportMesh('', '/scenes/', 'little-fella.glb', scene, (meshes, particleSystems, skeletons, animationGroups) => {
    console.log(meshes, particleSystems, skeletons, animationGroups)


    const setMaterialRecursively = mesh => {
      mesh.material = dirtMaterial
      // if (mesh.subMeshes) {
      //   mesh.subMeshes.forEach(mm => setMaterialRecursively(mm._mesh))
      // }
    }
    meshes.forEach(m => {
      setMaterialRecursively(m)
    })

    scene.getAnimationGroupByName('RunCycle').start(true, undefined, 0, .6)
    let fella = scene.getMeshByName('Fella').parent.parent

    let fellaImposter = MeshBuilder.CreateBox('fellaImposter', {
      width: 2.5,
      height: 6.5,
      depth: 2.5
    })
    let transparentMaterial = new StandardMaterial('transparent', scene)
    transparentMaterial.alpha = 0
    fellaImposter.material = transparentMaterial
    fellaImposter.physicsImpostor = new PhysicsImpostor(fellaImposter, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5 }, scene)
    fella.parent = fellaImposter

    let turnaround = false
    let goingLeft = false
    scene.onBeforeRenderObservable.add(() => {
      turnaround = Math.abs(fellaImposter.position.x) > 5
      if (turnaround) {
        goingLeft = !goingLeft
        fellaImposter.rotate(Axis.Y, Math.PI, Space.WORLD)
      }
      fellaImposter.position.x += goingLeft ? -.1 : .1
    })
  })
}