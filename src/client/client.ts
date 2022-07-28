import * as THREE from 'three'
import { 
        ACESFilmicToneMapping,
        FloatType,
        MeshStandardMaterial,
        PMREMGenerator,
        Raycaster,
        sRGBEncoding,
        MathUtils,
        BufferGeometry,
        PointsMaterial,
        Points
 } from 'three';
import { GUI } from 'dat.gui'
import Stats from 'three/examples/jsm/libs/stats.module'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { newPrismFaces} from './World/components/_faces'
import { worldSize } from './World/components/_config';
import {cellSize} from "./World/components/_config";
import { gridHelper, axesHelper } from './World/components/_helpers';


import  scene  from './World/components/_scene';
import camera from './World/components/_camera';


import SimplexNoise = require('simplex-noise');

scene.add( gridHelper );
const gui = new GUI()
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

// CONFIG =============================================================================================
let envmap;

interface VoxelWorld {
    cellSize:number
    worldSize:number
    cellSliceSize:number
    cell:any
    cellSizeWidth:number
    cellSizeHeight:number
    cellSizeDepth:number
}

//////////////////////////////
interface VoxelWorld{
  cellSize:number
  cellSliceSize:number
  cell:any
}

class VoxelWorld {
  static faces: any = newPrismFaces;

  constructor(cellSize: any, worldSize: any) {
    this.worldSize = worldSize;
    this.cellSize = cellSize;
    this.cellSliceSize = cellSize * cellSize;

    this.cellSizeWidth = cellSize * Math.sqrt(3);
    this.cellSizeHeight = cellSize * 2;
    this.cellSizeDepth = cellSize;

    this.cell = new Uint8Array(worldSize * worldSize * worldSize);
}
 //вычислить смещение вокселя
  computeVoxelOffset(x:number, y:number, z:number) {
    const {cellSize, cellSliceSize} = this;
    const voxelX = MathUtils.euclideanModulo(x, worldSize) | 0;
    const voxelY = MathUtils.euclideanModulo(y, worldSize) | 0;
    const voxelZ = MathUtils.euclideanModulo(z, worldSize) | 0;
    let offset = voxelY * worldSize * worldSize
    + voxelZ * worldSize
    + voxelX;
return offset
  }
//получить ячейку для вокселя
  getCellForVoxel(x:number, y:number, z:number) {
    const {cellSize} = this;
    const cellX = Math.floor(x / worldSize);
    const cellY = Math.floor(y / worldSize);
    const cellZ = Math.floor(z / worldSize);
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
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return 0;
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return cell[voxelOffset];
  }

  //генерировать данные геометрии для ячейки

  generateGeometryDataForCell(cellX:any, cellY:any, cellZ:any) {
    const {cellSizeWidth, cellSizeHeight, cellSizeDepth, worldSize} = this;
    const positions:any[] = [];
    const normals:number[] = [];
    const indices:number[] = [];
    const startX:number = cellX * worldSize;
    const startY:number = cellY * worldSize;
    const startZ:number = cellZ * worldSize;

    for (let y = 0; y < worldSize; ++y) {
        const voxelY = startY + y;
        for (let z = 0; z < worldSize; ++z) {
            const voxelZ = startZ + z;
            for (let x = 0; x < worldSize; ++x) {
                const voxelX = startX + x;
                const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
                if (!voxel) {continue;}

                // Тут вокселю нужно знать где стороны/фэйсы
                for (const {side, dir, corners} of VoxelWorld.faces) {
                    let dirX = dir[0];
                    let dirY = dir[1];
                    let dirZ = dir[2];

                    if ('bcfe'.includes(side)) {dirX += z % 2}

                    const neighbor = this.getVoxel(
                        voxelX + dirX,
                        voxelY + dirY,
                        voxelZ + dirZ,
                    );

                    // Есть сосед - не рисуем грань
                    if (neighbor) {continue;}

                    // у этого вокселя нет соседей в этом направлении, поэтому рисуем грань.
                    const ndx = positions.length / 3;
                    for (const pos of corners) {
                        positions.push(
                            pos[0] + x * cellSizeWidth + (z % 2 * (cellSizeWidth / 2)),
                            pos[1] + y * cellSizeDepth,
                            pos[2] + z * cellSizeHeight - (z * .5)
                        );
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

    return {
        positions,
        normals,
        indices,

    };
}
}


(async function(){

    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("assets/envmap.hdr");
    envmap = pmrem.fromEquirectangular(envmapTexture).texture

    const simplex = new SimplexNoise 

/////
const world = new VoxelWorld(cellSize, worldSize);

  for (let y = 0; y < worldSize; ++y) {
    for (let z = 0; z < worldSize; ++z) {
      for (let x = 0; x < worldSize; ++x) {
        const height =
        (Math.sin(x / worldSize * Math.PI * 2) + Math.sin(z / worldSize * Math.PI * 3))
        * (worldSize / 6)
        + (worldSize / 2);
        if (y < height) {
          world.setVoxel(x, y, z, 1);
        }
      }
    }
  }

  const {positions, normals, indices} = world.generateGeometryDataForCell(0, 0, 0);
  const geometry = new THREE.BufferGeometry();

  const material = new MeshStandardMaterial({envMap: envmap,flatShading: true})

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


const edges = new THREE.EdgesGeometry( geometry, 90 );
const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xff0000 } ) );
scene.add( line );




///////////////////////////////////////////////////////////////////////////////////

    renderer.setAnimationLoop(()=>{
        //hexagonMesh.rotation.x += 0.01
        controls.update();
        renderer.render(scene, camera);
    })
})();




