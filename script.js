const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 2, 5);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.PointerLockControls(camera, document.body);

document.addEventListener('click', (event) => {
    if (!isPaused) {
        controls.lock();
    }
});

const cubeSize = 1;
const gridSize = 20;
const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const dirtMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });


const cubes = [];
const outlines = [];

const frustumBuffer = 1.5;

function isCubeVisible(cube) {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    const box = new THREE.Box3().setFromObject(cube);
    box.expandByScalar(frustumBuffer);

    return frustum.intersectsBox(box);
}

let outlinesVisible = true;

function toggleOutlines() {
    outlinesVisible = !outlinesVisible;

    outlines.forEach(outline => {
        outline.visible = outlinesVisible;
    });
}

function createOutlinedCube(material, position) {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);

    const edges = new THREE.EdgesGeometry(geometry);

    const outlineMaterial = material.color.getHex() === 0x000000 ?
        new THREE.LineBasicMaterial({ color: 0xffffff }) :
        new THREE.LineBasicMaterial({ color: 0x000000 });

    const outline = new THREE.LineSegments(edges, outlineMaterial);
    outline.position.copy(position);
    outline.visible = outlinesVisible;

    scene.add(cube);
    scene.add(outline);

    cubes.push(cube);
    outlines.push(outline);

    return cube;
}

for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
        const position = new THREE.Vector3(x * cubeSize, 0, z * cubeSize);
        createOutlinedCube(dirtMaterial, position);
    }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedColor = 0xffffff;

function onMouseClick(event) {
    if (isPaused) return;

    mouse.x = 0;
    mouse.y = 0;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const index = cubes.indexOf(intersect.object);

        if (index > -1) {
            if (event.button === 0) {
                scene.remove(cubes[index]);
                scene.remove(outlines[index]);
                cubes.splice(index, 1);
                outlines.splice(index, 1);
            } else if (event.button === 2) {
                const newPosition = intersect.object.position.clone().add(intersect.face.normal).round();
                const newMaterial = new THREE.MeshBasicMaterial({ color: selectedColor });
                createOutlinedCube(newMaterial, newPosition);
            }
        }
    }
}

window.addEventListener('mousedown', onMouseClick, false);

const moveSpeed = 0.1;
const jumpSpeed = 0.2;
const gravity = 0.01;
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false
};

let isJumping = false;
let isFloating = false;
let velocityY = 0;
let isPaused = false;

const keyBindings = {
    'KeyW': 'forward',
    'KeyS': 'backward',
    'KeyA': 'left',
    'KeyD': 'right',
    'Space': 'jump',
    'Enter': 'pause',
};

const digitKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];

function onKeyDown(event) {
    const action = keyBindings[event.code];
    if (action) {
        switch (action) {
            case 'jump':
                if (!isJumping && !isFloating) {
                    isJumping = true;
                    velocityY = jumpSpeed;
                } else if (isJumping && !isFloating) {
                    isFloating = true;
                    isJumping = false;
                    velocityY = 0;
                }
                break;
            case 'pause':
                togglePause();
                break;
            default:
                keys[action] = true;
        }
    } else if (digitKeys.includes(event.code)) {
        selectColor(event.code);
    }
}

function onKeyUp(event) {
    const action = keyBindings[event.code];
    if (action) {
        switch (action) {
            case 'jump':
                if (isFloating) {
                    isFloating = false;
                }
                break;
            default:
                keys[action] = false;
        }
    }
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

function togglePause() {
    isPaused = !isPaused;
    const pauseScreen = document.getElementById('pauseScreen');
    if (isPaused) {
        pauseScreen.style.display = 'block';
        controls.unlock();
    } else {
        pauseScreen.style.display = 'none';
        controls.lock();
        animate();
    }
}

function resumeGame() {
    togglePause();
}

function resetGame() {
    location.reload();
}

function closeGame() {
    window.close();
}

function selectColor(keyCode) {
    const index = (parseInt(keyCode.replace('Digit', '')) + 9) % 10;
    const slots = document.querySelectorAll('.inventory .slot');
    slots.forEach(slot => slot.classList.remove('selected'));
    slots[index].classList.add('selected');
    selectedColor = parseInt(slots[index].getAttribute('data-color'));
}

const fpsCounter = document.getElementById('fpsCounter');
let lastTime = performance.now();
let frameCount = 0;

function updateFPS() {
    const now = performance.now();
    frameCount++;
    if (now - lastTime >= 1000) {
        const fps = frameCount;
        const memoryUsage = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        const memoryTotal = (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2);
        fpsCounter.textContent = `FPS: ${fps} | Memory: ${memoryUsage} MB / ${memoryTotal} MB`;
        frameCount = 0;
        lastTime = now;
    }
}

const visibleCubes = new Set();

function animate() {
    if (!isPaused) {
        requestAnimationFrame(animate);

        const moveX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const moveZ = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);

        controls.moveRight(moveX * moveSpeed);
        controls.moveForward(moveZ * moveSpeed);

        cubes.forEach(cube => {
            if (isCubeVisible(cube)) {
                visibleCubes.add(cube);
                cube.visible = true;
            } else {
                visibleCubes.delete(cube);
                cube.visible = false;
            }
        });
        if (isJumping) {
            camera.position.y += velocityY;
            velocityY -= gravity;

            if (camera.position.y <= 2) {
                camera.position.y = 2;
                isJumping = false;
                velocityY = 0;
            }
        } else if (isFloating) {
            camera.position.y += moveSpeed;
        }
    } else if (camera.position.y > 2) {
        camera.position.y -= gravity;
        if (camera.position.y < 2) {
            camera.position.y = 2;
        }
    }

    renderer.render(scene, camera);
    updateFPS();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
