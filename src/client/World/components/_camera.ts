import {PerspectiveCamera} from "three";

const camera = new PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(100, 35, 50)

export default camera;