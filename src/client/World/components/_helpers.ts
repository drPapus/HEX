import {GridHelper, AxesHelper} from "three";

const gridHelper = new GridHelper( 400, 40, 0x0000ff, 0x808080 );
gridHelper.position.y = 0;
gridHelper.position.x = 0;

const axesHelper = new AxesHelper( 35 );

export {
    gridHelper,
    axesHelper
}
