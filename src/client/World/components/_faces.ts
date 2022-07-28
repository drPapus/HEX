import {cellSize} from "./_config";

// Size
const s = cellSize;
// 1/2 Size
const s12 = cellSize / 2;
// Width
const w = s * Math.sqrt(3);
// 1/2 width
const w12 = w / 2;
// Height
const h = s * 2;


/*
      3 -- 4
     /      \                 x - red, y - green, z - blue
    2        5                 +x
     \      /                   |
      1 -- 0               -z ---- +z
                                |
         D                     -x
       3 -- 4
    C /      \ E
     2        5
    B \      / F
       1 -- 0
         A
                   ______
                  /      \
           ______/  1.1   \
          /      \        /
         /  1.0   \______/
         \        /      \
          \______/  0.1   \
          /      \        /
         /  0.0   \______/
         \        /
          \______/
          ^
         0.0.0

*/

const newPrismFaces = [
    // BOTTOM =================================================================
    { // start
        side: 'bs',
        dir:[0, -1, 0],
        corners: [
            [w, 0, 0],
            [0, 0, 0],
            [w12, 0, -s12],
            [0, 0, 0],
        ]
    },
    { // center
        side: 'bc',
        dir: [0, -1,  0],
        corners: [
            [w, 0, s],
            [0, 0, s],
            [w, 0, 0],
            [0, 0, 0],
        ],
    },
    { // end
        side: 'be',
        dir:[0, -1, 0],
        corners: [
            [0, 0, s],
            [w, 0, s],
            [w12, 0, s + s12],
            [w, 0, s],
        ]
    },
    // TOP ========================================================
    { // start
        side: 'ts',
        dir:[0, 1, 0],
        corners: [
            [0, s, 0],
            [w, s, 0],
            [w12, s, -s12],
            [w, s, 0],
        ]
    },
    { // center
        side: 'tc',
        dir: [0, 1,  0],
        corners: [
            [0, s, s],
            [w, s, s],
            [0, s, 0],
            [w, s, 0],
        ],
    },
    { // end
        side: 'te',
        dir:[0, 1, 0],
        corners: [
            [w, s, s],
            [0, s, s],
            [w12, s, s + s12],
            [0, s, s],
        ]
    },
    // LATERAL SIDES ===============================================
    { // A
        side: 'a',
        dir: [-1, 0, 0],
        corners: [
            [0, 0, 0],
            [0, 0, s],
            [0, s, 0],
            [0, s, s],
        ],
    },
    { // B
        side: 'b',
        dir: [-1, 0, -1],
        corners: [
            [w12, 0, -s12],
            [0, 0, 0],
            [w12, s, -s12],
            [0, s, 0],
        ],
    },
    { // C
        side: 'c',
        dir: [0, 0, -1],
        corners: [
            [w, 0, 0],
            [w12, 0, -s12],
            [w, s, 0],
            [w12, s, -s12],
        ],
    },
    { // D
        side: 'd',
        dir: [ 1, 0, 0],
        corners: [
            [w, 0, s],
            [w, 0, 0],
            [w, s, s],
            [w, s, 0],
        ],
    },
    { // E
        side: 'e',
        dir: [ 0, 0, 1],
        corners: [
            [w12, 0, s + s12],
            [w, 0, s],
            [w12, s, s + s12],
            [w, s, s],
        ],
    },
    { // F
        side: 'f',
        dir: [-1, 0, 1],
        corners: [
            [0, 0, s],
            [w12, 0, s + s12],
            [0, s, s],
            [w12, s, s + s12],
        ],
    },
];

export {

    newPrismFaces
}