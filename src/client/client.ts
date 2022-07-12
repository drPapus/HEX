import * as THREE from 'three'
import { 
        ACESFilmicToneMapping,
        BoxGeometry,
        Color,
        FloatType,
        GridHelper,
        MeshStandardMaterial,
        PMREMGenerator,
        Raycaster,
        sRGBEncoding,
        Vector2,
        MathUtils,
 } from 'three';
import { GUI } from 'dat.gui'
import Stats from 'three/examples/jsm/libs/stats.module'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

import SimplexNoise = require('simplex-noise');


// SCENE
const scene = new THREE.Scene();

//Helpers
const gridHelper = new GridHelper( 400, 40, 0x0000ff, 0x808080 );
gridHelper.position.y = 0;
gridHelper.position.x = 0;
scene.add( gridHelper );

scene.background = new Color("#FFEECC");

// CAMERA
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(80, 30, 15)

//GUI
const gui = new GUI()

//Statistics
const stats = Stats()
document.body.appendChild(stats.dom)

// WINDOW RESIZE HANDLING
export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);


// RENDERER
const renderer = new THREE.WebGLRenderer({antialias: true})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement)

//Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true


const light = new THREE.SpotLight()
light.position.set(12.5, 12.5, 12.5)
light.castShadow = true
light.shadow.mapSize.width = 1024
light.shadow.mapSize.height = 1024
scene.add(light)


let hexagonGeometries = new BoxGeometry(0,0,0);

let envmap;
const cellSize = 16;


//////////////////////////////
interface VoxelWorld{
  cellSize:number
  cellSliceSize:number
  cell:any
}


class VoxelWorld {
  static faces: any;

  constructor(cellSize: any) {
    this.cellSize = cellSize;
    this.cellSliceSize = cellSize * cellSize;
    this.cell = new Uint8Array(cellSize * cellSize * cellSize);
  }

 //вычислить смещение вокселя
  computeVoxelOffset(x:number, y:number, z:number) {
    const {cellSize, cellSliceSize} = this;
    
    const voxelX = MathUtils.euclideanModulo(x, cellSize) | 0;
    const voxelY = MathUtils.euclideanModulo(y, cellSize) | 0;
    const voxelZ = MathUtils.euclideanModulo(z, cellSize) | 0;
    return voxelY * cellSliceSize + voxelZ * cellSize + voxelX;

  }
  
//получить ячейку для вокселя
  getCellForVoxel(x:number, y:number, z:number) {
    const {cellSize} = this;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const cellZ = Math.floor(z / cellSize);
    if (cellX !== 0 || cellY !== 0 || cellZ !== 0) {
      return null;
    }
    return this.cell;
  }

  //установить воксель

  setVoxel(x:number, y:number, z:number, v:number) {
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return;  // TODO: add a new cell?
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
 
  }
//получить воксель
  getVoxel(x:number, y:number, z:number) {
    const cell = this.getCellForVoxel(x , y, z);
    if (!cell) {
      return 0;
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return cell[voxelOffset];
  }


  //генерировать данные геометрии для ячейки

  generateGeometryDataForCell(cellX:any, cellY:any, cellZ:any) {
    const {cellSize} = this;
    const positions:any[] = [];
    const normals:number[] = [];
    const indices:number[] = [];
    const startX:number = cellX * cellSize;
    const startY:number = cellY * cellSize;
    const startZ:number = cellZ * cellSize;

    
    for (let y = 0; y < cellSize; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < cellSize; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < cellSize; ++x) {
          const voxelX = startX + x;
          const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
          if (voxel) {
            // Тут вокселю нужно знать где стороны/фэйсы
            for (const {dir, corners} of VoxelWorld.faces) {
              const neighbor = this.getVoxel(
                  voxelX + dir[0],
                  voxelY + dir[1],
                  voxelZ + dir[2]
                  );
              if (!neighbor) {
                // у этого вокселя нет соседей в этом направлении, поэтому рисуем грань.
                const ndx = positions.length / 3;
                for (const pos of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                  normals.push(...dir);
                }
                indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3,
                );
              }
            }
          }
        }
      }
    }

    return {
      positions,
      normals,
      indices,
    };
  }
}


 // Hexagonal Prism

      /*
            2 -- 3
           /      \
          1        4                 -z
           \      /                   |
            0 -- 5               -x ---- +x
                                      |
               C                     +z
             2 -- 3
          B /      \ D
           1        4
          A \      / E
             0 -- 5
               F
      */

let t = 0.5 * Math.sqrt(3);

VoxelWorld.faces = [

  { // BOTTOM
   dir: [-1, -1, 0 ],
   corners: [
   [ 0.5, -1,  t],  
   [-0.5, -1,  t], 
   [ 0.5, -1, -t],  
   [-0.5, -1, -t],
   ],
 },
 {
 dir: [ 0, 0, 0 ],
   corners: [
   [0.5, -1,  0], 
   [0.5, -1, -t], 
   [0.5, -1,  t],  
   [1.0, -1,  0],   
   ],
 },
 {
   dir: [ 0, 0, 0 ],
   corners: [
   [-0.5, -1, 0], 
   [-0.5, -1, t], 
   [-0.5, -1,-t],  
   [-1.0, -1, 0],   
   ],
 },
 { // TOP
   dir: [ 1, 1, 0 ],
   corners: [
   [-0.5, 1,  t],  
   [ 0.5, 1,  t], 
   [-0.5, 1, -t],  
   [ 0.5, 1, -t],
   ],
 },
 {
   dir: [ 0, 1, 1 ],
   corners: [
   [-0.5, 1,  0], 
   [-0.5, 1, -t], 
   [-0.5, 1,  t],  
   [-1.0, 1,  0],   
   ],
 },
 {
   dir: [ 0, 1, 0 ],
   corners: [
   [0.5, 1, 0], 
   [0.5, 1, t], 
   [0.5, 1,-t],  
   [1.0, 1, 0],   
   ],
 },
 
   { // A
     dir: [ 1, 0, 0, ],
     corners: [
     [-0.5,  1,  t],  // 6   0
     [-1.0,  1,  0],  // 7   1 
     [-0.5, -1,  t],  // 8   0B
     [-1.0, -1,  0],  // 9   1B
     ],
   },
 
   { // B
     dir: [  1, 0, 0 ],
     corners: [
     [-1.0,  1,  0],  // 10  1
     [-0.5,  1, -t],  // 11  2
     [-1.0, -1,  0],  // 12  1B
     [-0.5, -1, -t],  // 13  2B
     ],
   },
   { // C
     dir: [ 0, -1, -1 ],
     corners: [
     [-0.5,  1, -t],  // 14  2
     [ 0.5,  1, -t],  // 15  3
     [-0.5, -1, -t],  // 16  2B
     [ 0.5, -1, -t],  // 17  3B
     ],
   },
   { //  D
     dir: [ 0, 1, 1 ],
     corners: [
     [0.5,  1, -t],  // 18  3
     [1.0,  1,  0],  // 19  4
     [0.5, -1, -t],  // 20  3B        
     [1.0, -1,  0],  // 21  4B
     ],
   },
   { // E
     dir:[ 0, 0, -1 ],
     corners: [
      [1.0, 1,  0],  // 22  4
      [0.5, 1,  t],  // 23  5
      [1.0, -1, 0],  // 24  4B
      [0.5, -1, t],  // 25  5B
     ]
   },
   { //F
     dir: [ 0, 0, 1 ],
     corners: [
     [ 0.5,  1,  t],  // 26  5
     [-0.5,  1,  t],  // 27  0
     [ 0.5, -1,  t],  // 28  5B
     [-0.5, -1,  t],  // 29  0B
     ],
   },
 ];



//////////////////////////////


(async function(){

    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("assets/envmap.hdr");
    envmap = pmrem.fromEquirectangular(envmapTexture).texture

    const simplex = new SimplexNoise 

/////
const world = new VoxelWorld(cellSize);

  for (let y = 0; y < cellSize; ++y) {
    for (let z = 0; z < cellSize; ++z) {
      for (let x = 0; x < cellSize; ++x) {
        const height = (Math.sin(x / cellSize * Math.PI * 2) + Math.sin(z / cellSize * Math.PI * 3)) * (cellSize / 6) + (cellSize / 2);
        if (y < height) {
          world.setVoxel(x * 2, y, z * 2, 1); //x&z * 2
          // mesh.position.set((x + (z % 2) * 0.5) * 2, y, z * 1.535);
        }
      }
    }
  }

  const {positions, normals, indices} = world.generateGeometryDataForCell(0, 0, 0);
  const geometry = new THREE.BufferGeometry();

  const material = new MeshStandardMaterial({
                 envMap: envmap,
                 flatShading: true
                
             })


  const positionNumComponents = 3;
  const normalNumComponents = 3;
  geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
  geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

//LINE
const edges = new THREE.EdgesGeometry( geometry );
const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xff0000 } ) );
scene.add( line );


    renderer.setAnimationLoop(()=>{
        //hexagonMesh.rotation.x += 0.01
        controls.update();
        renderer.render(scene, camera);
    })
})();



