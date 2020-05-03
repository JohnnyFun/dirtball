// https://doc.babylonjs.com/features/es6_support

/**
// TODO: glb won't load from nano-server IIS. registered mime, still nothin. 
// TODO: success screen words, see this: https://doc.babylonjs.com/how_to/gui
// TODO: multiple cameras? one for on character, other for moving around environment in god-mode
// TODO: repeat stone material, and then make the pattern even smaller maybe, same with dirt...

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

import {
  ActionManager,
  Axis,
  CannonJSPlugin,
  DirectionalLight,
  ExecuteCodeAction,
  PhysicsImpostor,
  SceneLoader,
  ShadowGenerator,
  Space,
  StandardMaterial,
  Texture,
  UniversalCamera
} from '@babylonjs/core'

import CANNON from 'cannon'
import {Engine} from '@babylonjs/core/Engines/engine'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import {Scene} from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math'
import maze from './maze'

let statusTimer
let lastHighestPoint = 0
let won = false
let lastTaunt = 0

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
const characterMaxSpeed = 14
let character = MeshBuilder.CreateSphere('character', {
  segments: 16,
  diameter: characterSize
}, scene)
character.material = dirtMaterial
character.physicsImpostor = new PhysicsImpostor(character, PhysicsImpostor.SphereImpostor, {mass: 10, restitution: .5 }, scene)
shadowGenerator.addShadowCaster(character)
window.character = character

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

let platform1 = MeshBuilder.CreateBox('platform1', {
  height: 6,
  width: 6,
  depth: .5
}, scene)
platform1.position.set(-10, 5, -10)
platform1.rotation.x = -Math.PI / 2
platform1.material = stoneMaterial
platform1.physicsImpostor = new PhysicsImpostor(platform1, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

let ramp = MeshBuilder.CreateBox('ramp', {
  height: 12,
  width: 6,
  depth: .5
}, scene)
ramp.rotation.x = -Math.PI / 3
ramp.position.set(-10, 2, 2)
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

let platform2 = MeshBuilder.CreateBox('platform2', {
  height: 8,
  width: 8,
  depth: .5
}, scene)
platform2.position.set(10, 8.5, -10)
platform2.rotation.x = -Math.PI / 2
platform2.material = stoneMaterial
platform2.physicsImpostor = new PhysicsImpostor(platform2, PhysicsImpostor.BoxImpostor, {mass: 0, friction: 0.5, restitution: 0.7 }, scene)

// status msg
const msg = document.getElementById('status-msg')

addLittleFella()

reset()
setStatus('Dirtball, get to the highest platform!', 2)
scene.onBeforeRenderObservable.add(() => {
  if (won) return
  const fellOffArena = character.position.y < -10
  if (fellOffArena) {
    reset()
    setStatus('You died. Try again', 2)
  } else {
    let velocity = character.physicsImpostor.getLinearVelocity().clone()
    const falling = Math.abs(Math.round(velocity.y)) > 0
    if (!falling) moveCharacter(velocity) // can't modify your velocity if you're in the air
  }
  positionCamera()
  taunt()
})

engine.runRenderLoop(() => {
  scene.render()
})

function taunt() {
  lastHighestPoint = Math.max(lastHighestPoint, character.position.y)
  const onGround = Math.round(character.position.y) <= 1
  if (onGround) {
    const gotClose = lastHighestPoint > 5.5
    if (gotClose) {
      const taunts = [
        'Remember your training, Dirtball',
        'Easy does it',
        'Dirtball, this isn\'t a drill',
        'Oh man...',
        'What are you doing?'
      ]
      if (lastTaunt >= taunts.length) lastTaunt = 0
      setStatus(taunts[lastTaunt], 2)
      lastTaunt++
      lastHighestPoint = 0
    }
  }
}

function reset() {
  clearStatus()
  lastHighestPoint = 0
  won = false

  character.position.set(0, 5, 20)
  // setOnPlatform(platform1)
  
  character.physicsImpostor.setAngularVelocity(new Vector3(0,0,0))
  character.physicsImpostor.setLinearVelocity(new Vector3(0,0,0))
  positionCamera()
}

function setOnPlatform(platform) {
  console.log(platform.position)
  // character.position.set(platform.position.clone())
  character.position.y = platform.position.y + 2
  character.position.x = platform.position.x
  character.position.z = platform.position.z
}

function setStatus(statusMsg, seconds) {
  clearTimeout(statusTimer)
  msg.style.display = 'block'
  msg.innerHTML = statusMsg
  if (seconds) statusTimer = setTimeout(clearStatus, seconds*1000)
}

function clearStatus() {
  msg.style.display = 'none'
}

function moveCharacter(velocity) {
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

  if (isWinning(velocity)) {
    won = true
    lastTaunt = 0
    setStatus('Great work, Dirtball.<br/>You won.<br/>Press "r" to play again')
  }

  character.physicsImpostor.setLinearVelocity(velocity)
}

function isWinning(velocity) {
  if (character.position.y >= 8.5) {
    const stopped = Math.round(velocity.x) === 0 && Math.round(velocity.y) === 0 && Math.round(velocity.z) === 0
    if (stopped) {
      if (character.position.x >= 7) {
        return true
      }
    }
  }
  return false
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
    // console.log(meshes, particleSystems, skeletons, animationGroups)


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