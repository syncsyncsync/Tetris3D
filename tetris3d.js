// The size of a single block in the game
const unitSize = 1;

// An empty array that will hold all the blocks in the game
const blockList = [];

// The width of the boundary around the game
const boundaryWidth = 20 * unitSize;

// An object that specifies the width and height of the game grid
const containerGrid = {
    width: 10, // Change this to the desired width of your grid
    height: 20 // Change this to the desired height of your grid
};

// A variable that keeps track of the number of blocks in the game
let numBlocks = 0;

// A variable that keeps track of the highest position of any block in the game
let highestPosition = 0;

// A reference to the HTML element that will hold the game
const gameContainer = document.getElementById('gameContainer');

// A Three.js scene object that will hold all the game objects
const scene = new THREE.Scene();

// A Three.js camera object that determines the viewpoint of the game
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (2 * window.innerHeight), 0.1, 1000);

//const camera = new THREE.PerspectiveCamera(75, gameContainer.clientWidth / gameContainer.clientHeight, 0.1, 1000);

// A Three.js renderer object that renders the game
const renderer = new THREE.WebGLRenderer();

// Set the size of the renderer to match the size of the game container
renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);

// Add the renderer element to the game container
gameContainer.appendChild(renderer.domElement);

// A Three.js box geometry that defines the shape of the game blocks
const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);

// A Three.js material that determines the appearance of the game blocks
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

// A Three.js mesh that combines the geometry and material to create a game block
const cube = new THREE.Mesh(geometry, material);

// A variable that will hold the bottom plane of the game boundary
let bottomPlane;

// A variable that will hold the red plane of the game boundary
let redPlane;

// const topSideCamera = new THREE.OrthographicCamera(
//     containerGrid .width / -2, containerGrid.width / 2, containerGrid.height / 2, containerGrid.height / -2, 1, 1000
// );
// topSideCamera.position.set(0, 500, 0);
// topSideCamera.lookAt(scene.position);
const top_width = 40;
const top_height = 20;

const topSideCamera = new THREE.OrthographicCamera(
    (top_width / -2) * (window.innerWidth / (2 * window.innerHeight)), (top_width / 2) * (window.innerWidth / (2 * window.innerHeight)), top_height / 2, top_height / -2, 1, 1000
);
topSideCamera.position.set(0, 500, 0);
topSideCamera.lookAt(scene.position);


function createBoundary(width, height, depth) {
    // Create a wireframe around the game area
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    scene.add(wireframe);

    // Create a separate plane for the bottom of the boundary
    const bottomThickness = 5; // Thickness of the bottom block
    const bottomGeometry = new THREE.BoxGeometry(width,  bottomThickness,depth);
    const bottomMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    bottomPlane = new THREE.Mesh(bottomGeometry, bottomMaterial);
    // Position the bottom plane
    bottomPlane.position.y = -height /2 - bottomThickness / 2; 
    //bottomPlane.position.y = -height/2;
    scene.add(bottomPlane);
    console.log("width:", width);
    console.log("height:", height);
        
    console.log("bottomPlane.position.x:", bottomPlane.position.x);
    console.log("bottomPlane.position.y:", bottomPlane.position.y);
    // Add the bottom plane to the block list
    blockList.push(bottomPlane);
    
    // Create a red plane for the top-side area of the boundary
    const redGeometry = new THREE.PlaneGeometry(width, depth);
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    redPlane = new THREE.Mesh(redGeometry, redMaterial);

    // Position the red plane
    redPlane.rotation.x = Math.PI / 2;
    redPlane.position.y = height / 2;
    //scene.add(redPlane);

    
    // Create a cargo object
    const cargoGeometry = new THREE.BoxGeometry(width * 1., height * 1., depth * 1.);
    const cargoMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const cargo = new THREE.Mesh(cargoGeometry, cargoMaterial);
  
    // Position the cargo object outside of the boundary
    cargo.position.y = wireframe.position.y;
    cargo.position.z = -depth * 1.2;
  
    // Add the cargo object to the scene
    scene.add(cargo);

    // Create a point light
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, height, 0);

    // Add the light to the scene
    scene.add(light);

    // Create left and right walls
    const wallWidth = 0.1 * width;
    const wallHeight = height;
    const wallDepth = depth;
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftWallGeometry = new THREE.BoxGeometry(wallWidth/2, wallHeight, wallDepth);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    const rightWallGeometry = new THREE.BoxGeometry(-wallWidth/2, wallHeight, wallDepth);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);

    // Position left and right walls
    leftWall.position.x = -width / 2 - wallWidth / 2;
    rightWall.position.x = width / 2 + wallWidth / 2;
    // Add left and right walls to the scene
    scene.add(leftWall);
    scene.add(rightWall);  
    blockList.push(leftWall);
    blockList.push(rightWall);
    
}

function predictHeight(block) {
    const blockBox = new THREE.Box3().setFromObject(block);
    let predictedHeight = block.position.y;

    for (const otherBlock of blockList) {
        const otherBlockBox = new THREE.Box3().setFromObject(otherBlock);
        if (blockBox.intersectsBox(otherBlockBox)) {
            const otherBlockTop = otherBlock.position.y + otherBlock.geometry.parameters.height / 2;
            predictedHeight = Math.max(predictedHeight, otherBlockTop + block.geometry.parameters.height / 2);
        }
    }

    return predictedHeight;
}

function calculateScore(containerGrid, block, x, y, z, rotation) {
    // Clone the container grid to test the placement without affecting the actual grid
    const testGrid = JSON.parse(JSON.stringify(containerGrid));

    // Place the block in the test grid at the specified position
    for (let i = x; i < x + block.width; i++) {
        for (let j = y; j < y + block.height; j++) {
            for (let k = z; k < z + block.depth; k++) {
                testGrid[i][j][k] = 1;
            }
        }
    }

    // Calculate the height of the pile after placing the block
    let maxHeight = 0;
    let filledSpaces = 0;
    let createdGaps = 0;

    for (let i = 0; i < testGrid.width; i++) {
        for (let j = 0; j < testGrid.height; j++) {
            for (let k = 0; k < testGrid.depth; k++) {
                if (testGrid[i][j][k] === 1) {
                    maxHeight = Math.max(maxHeight, j);
                    filledSpaces++;
                } else {
                    // Check if there's an empty space with a block directly above it
                    if (j < testGrid.height - 1 && testGrid[i][j + 1][k] === 1) {
                        createdGaps++;
                    }
                }
            }
        }
    }

    a = 1;
    b = 1;
    c = 1;

    // Implement your scoring function logic here
    // Example: score = a * filledSpaces - b * createdGaps - c * blockHeight
    const score = a * filledSpaces - b * createdGaps - c * maxHeight;

    return score;
}

function findBestPosition(containerGrid, block) {
    let highestScore = -Infinity;
    let bestPosition = null;
    let bestRotation = null;

    // Iterate through all possible x, y, and z positions
    for (let x = 0; x < containerGrid.width - block.width + 1; x++) {
        for (let y = 0; y < containerGrid.height - block.height + 1; y++) {
            for (let z = 0; z < containerGrid.depth - block.depth + 1; z++) {
                // Try all possible rotations of the block
                for (const rotation of possibleRotations(block)) {
                    const rotatedBlock = block.clone().rotate(rotation);

                    if (isValidPlacement(containerGrid, rotatedBlock, x, y, z)) {
                        const score = calculateScore(containerGrid, rotatedBlock, x, y, z, rotation);

                        if (score > highestScore) {
                            highestScore = score;
                            bestPosition = { x, y, z };
                            bestRotation = rotation;
                        }
                    }
                }
            }
        }
    }

    // Check if bestRotation is not null before applying it to the block
    if (bestRotation !== null) {
        block.geometry = new THREE.BoxGeometry(bestRotation.width, bestRotation.height, bestRotation.depth);
    }

    return { position: bestPosition, rotation: bestRotation };
}

function findLowestHeightPosition(block) {
    let lowestHeight = Infinity;
    let lowestHeightX = 0;

    // Iterate through all possible x positions
    for (let x = 0; x < containerGrid.width - block.width + 1; x++) {
        for (let z = 0; z < containerGrid.depth - block.depth + 1; z++) {
            let highestOccupiedY = -1;

            // Create a temporary container grid to simulate the block's future position
            const tempContainerGrid = JSON.parse(JSON.stringify(containerGrid));

            // Simulate the block's position in the temporary container grid
            for (let bx = 0; bx < block.width; bx++) {
                for (let by = 0; by < block.height; by++) {
                    for (let bz = 0; bz < block.depth; bz++) {
                        if (block.geometry[by][bx][bz] === 1) {
                            tempContainerGrid[x + bx][highestOccupiedY + 1 + by][z + bz] = 1;
                        }
                    }
                }
            }

            // Find the highest occupied cell in the tempContainerGrid at the current x and z positions
            for (let y = 0; y < containerGrid.height; y++) {
                if (tempContainerGrid[x][y][z] === 1) {
                    highestOccupiedY = y;
                }
            }

            // Calculate the height of the pile after placing the block at the current x and z positions
            const pileHeight = highestOccupiedY + block.height;

            // If the pile height is lower than the current lowest height, update the lowest height and x position
            if (pileHeight < lowestHeight) {
                lowestHeight = pileHeight;
                lowestHeightX = x;
            }
        }
    }

    return lowestHeightX;
}

function generateRandomSize() {
    const mean = 4;
    const stdDev = 2;

    // Box-Muller transform
    let u1, u2;
    do {
        u1 = Math.random();
        u2 = Math.random();
    } while (u1 <= Number.EPSILON);

    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    return Math.max(1, Math.round(mean + z1 * stdDev));
}

function createRandomColor() {
    return Math.random() * 0xffffff;
}



function createRandomBlock() {
    const width = generateRandomSize();
    const height = generateRandomSize();
    const depth = generateRandomSize();
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const randomColor = createRandomColor();
    const material = new THREE.MeshBasicMaterial({ color: randomColor });
    const block = new THREE.Mesh(geometry, material);

    // Add lines to the edges of the block
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const lines = new THREE.LineSegments(edgesGeometry, linesMaterial);
    block.add(lines);

    const topSideY = bottomPlane.position.y + boundaryHeight ; // Add a small margin above the topPlate

//    const topSideY = bottomPlane.position.y + boundaryHeight;
    block.position.set(0, topSideY, 0);

    // Spawn the block at the lowest height coordinate
    const adjustedHeightMap = heightMap.slice(width / 2, heightMap.length - width / 2);
    const minHeight = Math.min(...adjustedHeightMap);
    //const minHeight = Math.min(...heightMap);
    const minHeightIndex = heightMap.findIndex(height => height === minHeight);
    block.position.set(minHeightIndex - containerGrid.width + width / 2, topSideY, 0);
    scene.add(block);

    // Update the height map
    for (let i = minHeightIndex; i < minHeightIndex + width; i++) {
        if (i < heightMap.length) { // Check if the index is within the height map bounds
            heightMap[i] += height;
        }
    }

    return block;
}

function displayStats() {
    console.log("Number of blocks: " + numBlocks);
    console.log("Highest position: " + highestPosition);
}


function isDirectlyBelow(currentBlock, otherBlock) {
    const currentBox = new THREE.Box3().setFromObject(currentBlock);
    const otherBox = new THREE.Box3().setFromObject(otherBlock);

    return (
        otherBox.min.x < currentBox.max.x &&
        otherBox.max.x > currentBox.min.x &&
        otherBox.max.y < currentBox.min.y
    );
}



function update() {
    const minHeight = currentBlock.geometry.parameters.height / 2;

    let collision = false;

    for (let i = 0; i < blockList.length; i++) {
        const otherBlock = blockList[i];

        if (isDirectlyBelow(currentBlock, otherBlock)) {
            const distance = currentBlock.position.y - (otherBlock.position.y + otherBlock.geometry.parameters.height / 2 + minHeight);
        
            if (distance <= 0.1) {
                collision = true;
                break;
            }
            //if (isColliding(currentBlock)) { // Correct usage of isColliding function
            if (isCollidingWithBottomPlane(currentBlock, bottomPlane)) {                
                collision = true;
                break;
            }
        }
                
    }
    console.log("bottomPlane.position.y:", bottomPlane.position.y);

    //if (!collision) {
        if (!collision && !isCollidingWithBottomPlane(currentBlock, bottomPlane)) {
        const targetY = bottomPlane.position.y + bottomPlane.geometry.parameters.height/2  + minHeight;
        //const targetY = bottomPlane.position.y  + minHeight ;
        if (currentBlock.position.y - 0.1 > targetY) {
            currentBlock.position.y -= 0.1;
        } else {
            currentBlock.position.y = targetY;
            blockList.push(currentBlock);
            numBlocks++;
            highestPosition = Math.max(highestPosition, currentBlock.position.y + currentBlock.geometry.parameters.height / 2);
            if (currentBlock.position.y < redPlane.position.y) {
                currentBlock = createRandomBlock();
                currentBlock.position.y = redPlane.position.y;
                const lowestHeightX = findBestPosition(containerGrid, currentBlock);
                currentBlock.position.x = lowestHeightX;
            } else {
                currentBlock = null;
            }
        }
    } else {
        blockList.push(currentBlock);
        numBlocks++;
        highestPosition = Math.max(highestPosition, currentBlock.position.y + currentBlock.geometry.parameters.height / 2);
        if (currentBlock.position.y < redPlane.position.y) {
            currentBlock = createRandomBlock();
            currentBlock.position.y = redPlane.position.y;
        } else {
            currentBlock = null;
        }
    }
}


function isCollidingWithBottomPlane(block, bottomPlane) {
    const blockMinY = block.position.y - block.geometry.parameters.height / 2;
    const bottomPlaneMaxY = bottomPlane.position.y + bottomPlane.geometry.parameters.height / 2;

    const verticalDistance = blockMinY - bottomPlaneMaxY;

    if (verticalDistance <= 0.1) {
        return true;
    }

    return false;
}

function animate() {
    requestAnimationFrame(animate);
    if (currentBlock) {
        update();
    }
    //updateDebugInfo();

    // Render the main camera's view
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);

    // Render the top side camera's view
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissorTest(true);
    renderer.render(scene, topSideCamera);
}


createBoundary(20*unitSize, 40*unitSize, 10 * unitSize);
camera.position.z = 35;
let boundaryHeight = 20 * unitSize;
//let heightMap = Array(Math.round(20 * unitSize)).fill(0);
let heightMap = Array(Math.round(20 * unitSize)).fill(bottomPlane.position.y);

let currentBlock = createRandomBlock();

animate();
document.addEventListener('keydown', handleKeyDown);
function handleKeyDown(event) {
    if (!currentBlock) return;

    // Define rotation angles for each axis
    const rotationAngle = Math.PI / 2;
    let rotationAxis = null;

    // Determine the rotation axis based on the key pressed
    switch (event.key) {
        case 'x':
            rotationAxis = new THREE.Vector3(1, 0, 0);
            break;
        case 'y':
            rotationAxis = new THREE.Vector3(0, 1, 0);
            break;
        case 'z':
            rotationAxis = new THREE.Vector3(0, 0, 1);
            break;
        default:
            return;
    }

    // Rotate the block
    currentBlock.rotateOnWorldAxis(rotationAxis, rotationAngle);
}
