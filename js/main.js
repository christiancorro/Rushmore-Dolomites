// -----------------------------------------------
// Variables
// -----------------------------------------------

// Scene
let scene, camera, renderer, controls;
let stats;
let gui, params;
let world, plane;
let bgColor = new THREE.Color(0xFCF1E8);

// Camera
let fov = 60,
    aspectRatio = window.innerWidth / window.innerHeight,
    near = 0.1,
    far = 500;
let viewSize = 180,
    cameraOffsetY = 20; // camera position on Y

// Terrain
let terrainHeightmap;
let maxHeightTerrain, maxHeightTerrainPosition;

let unitSize = 1,
    distance = unitSize;

// Single instance of BoxBufferGeometry for all the elements on the scene
let cubeGeometry = new THREE.BoxBufferGeometry(unitSize, unitSize, unitSize);
let ambientLight;

// Loaders
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new THREE.GLTFLoader();

// Materials
const materialClouds = new THREE.MeshPhongMaterial({
    color: 0xDFDEDC,
    opacity: 0.6,
    transparent: true,
    shininess: 100,
    specular: 0xf9d71c,
    flatShading: true,
    map: textureLoader.load('img/textures/cloud.jpg')
});

// Common materials
const materialRock = new THREE.MeshPhongMaterial({
    map: textureLoader.load('img/textures/rock.jpg'),
    shininess: 0,
    flatShading: true
});

const materialWater = new THREE.MeshPhongMaterial({
    map: textureLoader.load('img/textures/water.jpg'),
    // color: 0x1BE1F5,
    shininess: 70,
    specular: 0xf9d71c,
    flatShading: true,
    opacity: 0.6,
    transparent: true
});

const materialGrass = new THREE.MeshPhongMaterial({
    map: textureLoader.load('img/textures/grass.jpg'),
    shininess: 50,
    flatShading: true
});

const materialSnow = new THREE.MeshPhongMaterial({
    map: textureLoader.load('img/textures/snow.jpg'),
    shininess: 90,
    specular: 0xf9d71c,
    flatShading: true
});

const materialSand = new THREE.MeshPhongMaterial({
    map: textureLoader.load('img/textures/sand.jpg'),
    // color: 0xE7C69C,
    shininess: 0,
    flatShading: true
});

// Webcam
let video;
let videoWidth = 320;
let videoHeight = 240;
let videoCanvas;
let videoReady = false;

// All cubes affected by webcam
let rocks = [];

// Aux arrays
let cubes = []; // all generated cubes 
let water = []; // all water cubes (needed for animation)
let grass = []; // all grass cubes (needed for positioning trees)

// All clouds and trees (needed for animation)
let clouds = new THREE.Object3D(),
    trees = new THREE.Object3D(),
    birds = new THREE.Object3D();


const DEFAULT_CLOUDS_NUMBER = 4,
    DEFAULT_CLOUDS_DIM = 4,
    DEFAULT_CLOUDS_SPEED = 0.002,
    DEFAULT_CLOUDS_ALTITUDE = 0, // based on max height of terrain
    DEFAULT_WATER_TURBULENCE = 0.08,
    DEFAULT_BIRDS_NUMBER = 8,
    DEFAULT_BIRDS_SCALE = 0.0038,
    DEFAULT_TREES_GENERATION = true,
    DEFAULT_TREES_MAX_NUMBER = 300,
    DEFAULT_TREES_SCALE = 3,
    DEFAULT_WEBCAM_ACTIVE = false,
    DEFAULT_WATER_MAX_HEIGHT = 28,
    DEFAULT_SAND_MAX_HEIGHT = 29,
    DEFAULT_GRASS_MAX_HEIGHT = 38,
    DEFAULT_ROCK_MAX_HEIGHT = 78,
    DEFAULT_CAMERA_POSITION_X = 45,
    DEFAULT_CAMERA_POSITION_Y = 45,
    DEFAULT_CAMERA_POSITION_Z = 85,
    DEFAULT_HEIGHTMAP_MAX_WIDTH = 120,
    DEFAULT_AMBIENT_LIGHT_INTENSITY = 1;

let webcamStarted = false;

// Input custom heightmaps
let fileSelector = document.getElementById('myInput');

// Download GLTF
// Date for naming gltf file when download
let date = new Date();

// link element for download
let link = document.createElement('a');
link.style.display = 'none';
link = document.body.appendChild(link);



// -----------------------------------------------
// START
// -----------------------------------------------

function Start() {

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bgColor, far / 3, far * 2);

    // camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    camera = new THREE.OrthographicCamera(
        (-aspectRatio * viewSize) / 2,
        (aspectRatio * viewSize) / 2,
        viewSize / 2 + cameraOffsetY,
        -viewSize / 2 + cameraOffsetY,
        near,
        far
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    camera.position.set(DEFAULT_CAMERA_POSITION_X, DEFAULT_CAMERA_POSITION_Y, DEFAULT_CAMERA_POSITION_Z);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    params = {
        cloudsNumber: DEFAULT_CLOUDS_NUMBER,
        cloudsDim: DEFAULT_CLOUDS_DIM,
        cloudsSpeed: DEFAULT_CLOUDS_SPEED,
        cloudsAltitude: DEFAULT_CLOUDS_ALTITUDE,
        waterTurbulence: DEFAULT_WATER_TURBULENCE,
        birdsNumber: DEFAULT_BIRDS_NUMBER,
        birdsScale: DEFAULT_BIRDS_SCALE,
        trees: DEFAULT_TREES_GENERATION,
        treesMaxNumber: DEFAULT_TREES_MAX_NUMBER,
        treesScale: DEFAULT_TREES_SCALE,
        webcam: DEFAULT_WEBCAM_ACTIVE,
        waterMaxHeight: DEFAULT_WATER_MAX_HEIGHT,
        sandMaxHeight: DEFAULT_SAND_MAX_HEIGHT,
        grassMaxHeight: DEFAULT_GRASS_MAX_HEIGHT,
        rockMaxHeight: DEFAULT_ROCK_MAX_HEIGHT,
        ambientLightIntensity: DEFAULT_AMBIENT_LIGHT_INTENSITY,
        loadFile: function () {
            fileSelector.click();
        },
        reset: resetWorld,
        heightmap: 'img/heightmaps/heightmapDefault.png',
        download_GLTF: exportGLTF
    };

    // Event for input:file for uploading custom heightmaps
    fileSelector.addEventListener('change', (event) => {
        let reader = new FileReader();
        reader.onload = function () {
            generateWorldFromImage(reader.result);
            scene.add(world);
        }
        reader.readAsDataURL(event.target.files[0]);
    });

    // Base plane, added to scene later, only when heightmap loaded
    let planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
    let wireMaterial = new THREE.MeshBasicMaterial({ color: 0xbababa, wireframe: true });

    plane = new THREE.Mesh(planeGeometry, wireMaterial);
    plane.position.set(0, -0.1, 0);
    plane.rotation.x = Math.PI / 2;

    world = new THREE.Group();
    scene.add(world);

    // Lights
    addLight(0.3, -50, 100, 10);
    addLight(0.2, 0, 1, 2);
    // addLight(0.5, -1, 1, -2);
    // addLight(10, 10, 2);

    ambientLight = new THREE.AmbientLight(0xffffff, params.ambientLightIntensity); // white light
    scene.add(ambientLight);

    // Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // Axes
    // let axesHelper = new THREE.AxesHelper(5);
    // scene.add(axesHelper);

    // GUI
    gui = new dat.GUI();
    gui.add(params, 'webcam');
    let folderLevels = gui.addFolder("Levels");
    folderLevels.add(params, 'waterMaxHeight').min(0).max(100).step(1).onChange(updateMaterials);
    folderLevels.add(params, 'sandMaxHeight').min(0).max(100).step(1).onChange(updateMaterials);
    folderLevels.add(params, 'grassMaxHeight').min(0).max(100).step(1).onChange(updateMaterials);
    folderLevels.add(params, 'rockMaxHeight').min(0).max(100).step(1).onChange(updateMaterials);
    // folderLevels.open();

    let folderClouds = gui.addFolder("Clouds");
    folderClouds.add(params, 'cloudsNumber').min(0).max(100).step(1).onChange(generateClouds);
    folderClouds.add(params, 'cloudsDim').min(1).max(10).step(1).onChange(generateClouds);
    folderClouds.add(params, 'cloudsSpeed').min(0).max(0.1).step(0.001).onChange(updateCloudSpeed);
    folderClouds.add(params, 'cloudsAltitude').min(0).max(100).step(1).onChange(generateClouds);
    // folderClouds.open();

    let folderBirds = gui.addFolder("Birds");
    folderBirds.add(params, 'birdsNumber').min(0).max(500).step(1).onChange(generateBirds);
    folderBirds.add(params, 'birdsScale').min(0.001).max(0.05).step(0.001).onChange(generateBirds);
    // folderBirds.open();

    let folderTrees = gui.addFolder("Trees");
    folderTrees.add(params, 'trees').onChange(generateTrees);
    folderTrees.add(params, 'treesMaxNumber').min(0).max(2000).step(1).onChange(generateTrees);
    console.log(folderTrees);
    folderTrees.add(params, 'treesScale').min(1).max(10).step(0.5).onChange(generateTrees);
    // folderTrees.open();

    let folderWater = gui.addFolder("Water");
    folderWater.add(params, 'waterTurbulence').min(0).max(0.5).step(0.001).onChange(updateWaterTurbulence);
    // folderWater.open();

    let folderLight = gui.addFolder("Light");
    folderLight.add(params, 'ambientLightIntensity').min(0).max(2).step(0.1).onChange(updateAmbientLight);
    // folderLight.open();

    gui.add(params, 'heightmap', {
        HeightmapDefault: 'img/heightmaps/heightmapDefault.png',
        Heightmap1: 'img/heightmaps/heightmap1.png',
        Heightmap2: 'img/heightmaps/heightmap2.png',
        Heightmap3: 'img/heightmaps/heightmap3.png',
        Heightmap4: 'img/heightmaps/heightmap4.png',
        Heightmap5: 'img/heightmaps/heightmap5.png'
    }).onChange(() => { generateWorldFromImage(params.heightmap) });


    gui.add(params, 'reset').name("Reset");
    gui.add(params, 'loadFile').name("Load heightmap");
    gui.add(params, 'download_GLTF').name("Download GLTF");
    gui.close();

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2;
    // controls.minPolarAngle = Math.PI * 0.05;
    controls.enableKeys = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Now, please, generate the terrain
    generateWorldFromImage(params.heightmap);
}

function generateWorldFromImage(image) {
    console.clear();
    terrainHeightmap = new Image();
    terrainHeightmap.data = [];
    // load img source
    terrainHeightmap.src = image;
    terrainHeightmap.onload = function () {
        console.log("Heightmap loaded (" + terrainHeightmap.width + "x" + terrainHeightmap.height + ")px");
        //get height data from img
        if (terrainHeightmap.width > DEFAULT_HEIGHTMAP_MAX_WIDTH || terrainHeightmap.height > DEFAULT_HEIGHTMAP_MAX_WIDTH) {  // limit size of image TODO:alert user
            console.warn("Heightmap too big (width auto resized to " + DEFAULT_HEIGHTMAP_MAX_WIDTH + "px )")
        }
        terrainHeightmap.data = getHeightData(terrainHeightmap, 0.2);
        console.log("Heightmap data extracted (" + terrainHeightmap.data.length + ")");
        // Reset population
        world.children.length = 0;
        trees.children.length = 0;
        clouds.children.length = 0;
        generateWorld(terrainHeightmap);
    }
}

function generateWorld() {
    generateTerrain();
    generateClouds();
    generateBirds();
    generateTrees();
}


function generateTerrain() {
    cubes = [];
    grass = [];
    water = [];
    rocks = [];

    // Set plane dim based on heightmap
    plane.scale.set(terrainHeightmap.maxWidth * 1.3, terrainHeightmap.maxHeight * 1.3, 0);
    camera.zoom = map(terrainHeightmap.maxWidth, 1, 100, 1.9, 1.2);
    world.add(plane);

    console.log("Generating terrain...");

    // Max height of the terrain (needed for generating clouds/birds and setting materials)
    maxHeightTerrain = Math.max(...terrainHeightmap.data);
    params.cloudsAltitude = maxHeightTerrain;
    gui.updateDisplay();

    // Levels
    // - 100 %
    // | snow
    // |
    // | rock
    // | 
    // | grass
    // | sand
    // | 
    // | water
    // - 0 %
    let max = 0; // for determine max position (needed for generating birds, avoid peak)
    for (let i = 0, m = terrainHeightmap.maxWidth; i < m; i++) {
        for (let j = 0; j < terrainHeightmap.maxHeight; j++) {
            height = terrainHeightmap.data[j * m + i];
            let cube = new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial());
            cube.heightData = height;
            cube.position.set(i * distance - (m / 2 * distance), height / 2, j * distance - (terrainHeightmap.maxHeight / 2 * distance));
            cube.scale.set(1, height, 1);

            // determines material
            setMaterials(cube, height);

            if (max < height) {
                max = height;
                maxHeightTerrainPosition = cube.position.clone();
            }

            cube.heightDataIndex = j * m + i;
            cubes.push(cube);
            world.add(cube);
        }
    }

    console.log("Terrain generated");
}

function updateMaterials() {
    water = [];
    grass = [];
    rocks = [];

    let cube;
    for (let i = 0; i < cubes.length; i++) {
        height = terrainHeightmap.data[cubes[i].heightDataIndex];
        cube = cubes[i];
        // determines material
        setMaterials(cube, height);
    }
    updateTreesPosition();
}

// Sets cube material based on his height
function setMaterials(cube, height) {
    let max = maxHeightTerrain + 1,
        min = 0;
    if (height < percent(min, max, params.waterMaxHeight)) {
        cube.material = materialWater;
        cube.speed = random(percent(0, params.waterTurbulence, 80), percent(0, params.waterTurbulence, 150));
        cube.movement = 0;
        cube.initialHeight = height;
        water.push(cube);
    } else if (height < percent(min, max, params.sandMaxHeight)) {
        cube.material = materialSand;
    } else if (height < percent(min, max, params.grassMaxHeight)) {
        cube.material = materialGrass;
        grass.push(cube);
    } else if (height < percent(min, max, params.rockMaxHeight)) {
        cube.material = materialRock;
        rocks.push(cube);
    } else {
        cube.material = materialSnow;
    }
}

function generateClouds() {
    // Delete all clouds
    clouds.children.length = 0;
    let x, z;

    let n = params.cloudsNumber;
    let nCloudCubes;

    let altitude = params.cloudsAltitude;

    // Creation of all clouds, cloud generation is horizontal, creates cube -> transform cube-> translate cube in correct position
    for (let i = 0; i < n; i++) {
        let cloud = new THREE.Group();
        // determines randomly dimension of this cloud
        nCloudCubes = Math.ceil(random(1, 10));
        if (nCloudCubes <= 0) nCloudCubes = 1;

        // Composition of this cloud
        let poxXOld = 0;
        for (let i = 0; i < nCloudCubes; i++) {

            let dimCubeX;
            let cloudCube = new THREE.Mesh(cubeGeometry, materialClouds);
            let dimCloudCube = Math.floor(random(percent(0, params.cloudsDim, 80), percent(0, params.cloudsDim, 150)));
            if (dimCloudCube <= 0) dimCloudCube = 0.1;

            if (i == 0 || i == nCloudCubes - 1) dimCloudCube = random(percent(0, dimCloudCube, 50), percent(0, dimCloudCube, 70));

            dimCubeX = dimCloudCube / random(2, 4);
            cloudCube.scale.set(dimCubeX, dimCloudCube, dimCloudCube);
            cloudCube.position.set(poxXOld, 0, 0);
            poxXOld = cloudCube.position.x + 1.4;
            cloud.add(cloudCube);
        }

        cloud.speed = random(percent(0, params.cloudsSpeed, 80), percent(0, params.cloudsSpeed, 150));
        cloud.movement = 0;
        // avoid peak
        x = random(-terrainHeightmap.maxWidth / 2, terrainHeightmap.maxWidth / 2);
        z = random(-terrainHeightmap.maxHeight / 2, terrainHeightmap.maxHeight / 2);
        if (x > -5 && x < 5) x = random(-10, -5);
        if (z > -5 && z < 5) z = random(5, 10);

        cloud.position.set(x,
            random(altitude - 15, altitude + 15),
            z);

        cloud.spawnPositionX = cloud.position.x;
        cloud.spawnPositionZ = cloud.position.z;
        clouds.add(cloud);
    }

    world.add(clouds);
}

function generateBirds() {
    birds.children.length = 0;
    gltfLoader.load('models/bird/bird.gltf', function (gltf) { // load GLTF model
        for (let i = 0; i < params.birdsNumber; i++) {
            let bird = gltf.scene.clone();
            let x = random(-10, 10);
            let z = random(-10, 10);

            // avoid birds in peak
            // -----------
            // |   ---   | 
            // |  | x |  |
            // |   ---   |
            // -----------
            if (x > -3 && x < 3) x = random(-10, -5);
            if (z > -3 && z < 3) z = random(-10, -5);
            bird.scale.set(params.birdsScale, params.birdsScale, params.birdsScale);
            bird.rotation.x = -Math.PI / 2;
            bird.position.set(x, random(maxHeightTerrain - 3, maxHeightTerrain + 3), z);
            bird.spawnPosition = bird.position.clone();
            bird.speed = random(0.005, 0.02);
            bird.movement = 0;
            birds.add(bird);
        }
        birds.position.set(maxHeightTerrainPosition.x, 0, maxHeightTerrainPosition.z);
        world.add(birds);

    });
}

function animateBirds() {
    for (let i = 0, bird; i < birds.children.length; i++) {
        bird = birds.children[i];
        bird.movement += bird.speed;
        bird.position.x = Math.sin(bird.movement) * bird.spawnPosition.x;
        bird.position.z = Math.cos(bird.movement) * bird.spawnPosition.z;
        birds.rotation.y = Math.sin(bird.movement) / 2;
    }
}

function generateTrees() {
    trees.children.length = 0;
    if (params.trees) {
        gltfLoader.load('models/tree/tree.gltf', function (gltf) {
            let treeScale = params.treesScale;
            for (let i = 0, j; i < params.treesMaxNumber; i++) {
                if (i < grass.length - 1) {
                    j = Math.floor(random(0, grass.length - 1));
                    gltf.scene.scale.set(treeScale, treeScale, treeScale);
                    let tree = gltf.scene.clone();
                    tree.position.set(grass[j].position.x - treeScale * 0.1, grass[j].scale.y + treeScale * 1.7, grass[j].position.z - treeScale * 1.2);
                    tree.spawnPosition = tree.position.clone();
                    tree.grassIndex = j;
                    trees.add(tree);
                }
                world.add(trees);
            }
        });
    }
}

function updateTreesPosition() {
    if (grass.length > trees.children.length) {
        generateTrees();
    } else {
        trees.children.length = grass.length;
        for (let i = 0, j; i < grass.length - 1; i++) {
            j = Math.floor(random(0, grass.length - 1));
            trees.children[i].position.set(grass[j].position.x - params.treeScale * 0.1, grass[j].scale.y + params.treeScale * 1.7, grass[j].position.z - params.treeScale * 1.2);
        }
    }
}

function updateAmbientLight() {
    ambientLight.intensity = params.ambientLightIntensity;
}

function resetWorld() {
    params.cloudsNumber = DEFAULT_CLOUDS_NUMBER;
    params.cloudsDim = DEFAULT_CLOUDS_DIM;
    params.cloudsSpeed = DEFAULT_CLOUDS_SPEED;
    params.cloudsAltitude = DEFAULT_CLOUDS_ALTITUDE;
    params.waterTurbulence = DEFAULT_WATER_TURBULENCE;
    params.birdsNumber = DEFAULT_BIRDS_NUMBER;
    params.birdsScale = DEFAULT_BIRDS_SCALE;
    params.trees = DEFAULT_TREES_GENERATION;
    params.treesMaxNumber = DEFAULT_TREES_MAX_NUMBER;
    params.treesScale = DEFAULT_TREES_SCALE;
    params.webcam = DEFAULT_WEBCAM_ACTIVE;
    params.waterMaxHeight = DEFAULT_WATER_MAX_HEIGHT;
    params.sandMaxHeight = DEFAULT_SAND_MAX_HEIGHT;
    params.grassMaxHeight = DEFAULT_GRASS_MAX_HEIGHT;
    params.rockMaxHeight = DEFAULT_ROCK_MAX_HEIGHT;
    params.ambientLightIntensity = DEFAULT_AMBIENT_LIGHT_INTENSITY;
    world.children.length = 0;
    console.clear();
    updateAmbientLight();
    generateWorld();
}

function exportGLTF() {
    let gltfExporter = new THREE.GLTFExporter();

    let options = {
        trs: false,
        onlyVisible: false,
        truncateDrawRange: true,
        binary: false,
        forcePowerOfTwoTextures: false,
        maxTextureSize: 4096
    };

    gltfExporter.parse(world, function (result) {
        if (result instanceof ArrayBuffer) {
            saveArrayBuffer(result, 'sculpture-' + date.getTime() + '.glb');

        } else {
            let output = JSON.stringify(result, null, 2);
            //console.log(output);
            saveString(output, 'sculpture-' + date.getTime() + '.gltf');
        }
    }, options);
}

function saveString(text, filename) {
    save(new Blob([text], { type: 'text/plain' }), filename);
}
function save(blob, filename) {
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function addLight(intensity, ...pos) {
    const color = 0xFFFFFF;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
}

function startWebcam() {
    webcamStarted = true;
    navigator.getUserMedia =
        navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    navigator.getUserMedia(
        {
            video: true,
        },
        onCamReady,
        function (error) {
            console.error('Unable to capture WebCam. Please reload the page or try using latest Chrome.');
            return;
        }
    );
}

//Set position increments
let dx = 0.1;
let dy = -0.1;
let dz = 0.01;
let zoomAlpha = 0;
let zoomIn = true;
let zoomInTarget = 1.9;

function Update() {

    // Initial camera animation
    camera.updateProjectionMatrix();

    if (zoomIn) {
        camera.position.x += dx;
        camera.position.y += dy;
        zoomAlpha += dz;
        camera.zoom = THREE.Math.lerp(1, zoomInTarget, THREE.Math.smoothstep(zoomAlpha, 0, 1));
        camera.updateProjectionMatrix();
    }

    if (zoomIn && camera.zoom >= zoomInTarget) {
        zoomIn = false;
    }

    // Webcam
    if (!webcamStarted && params.webcam) {
        startWebcam();
    }

    if (webcamStarted && !params.webcam) {
        webcamStarted = false;
        videoReady = false;
        // generateTerrain(terrainHeightmap);
        updateCubes(terrainHeightmap);
    }

    if (videoReady) { //TODO: webcam
        // video.data = getHeightData(video, 0.2);
        // updateCubes(video);
    }

    // Animations
    animateClouds();
    animateBirds();
    animateWater();
    requestAnimationFrame(Update);
    controls.update();
    stats.update();
    Render();
}

function Render() {
    renderer.render(scene, camera);
}

function animateWater() {
    for (let i = 0, waterCube; i < water.length; i++) {
        waterCube = water[i];
        waterCube.movement += waterCube.speed;
        // waterCube.scale.y = Math.abs(Math.cos(waterCube.movement)) * waterCube.initialHeight;
        waterCube.position.y = map(Math.sin(waterCube.movement), 0, 1, waterCube.initialHeight / 2 / 1.018, waterCube.initialHeight / 2 * 1.018);
        waterCube.scale.y = map(Math.sin(waterCube.movement), 0, 1, waterCube.initialHeight / 1.018, waterCube.initialHeight * 1.018);
    }
}
function animateClouds() {
    // clouds.position.x = Math.sin(cloudMove) * terrainHeightmap.width / 2;
    for (let i = 0, cloud; i < clouds.children.length; i++) {
        cloud = clouds.children[i];
        cloud.movement += cloud.speed;
        cloud.position.x = Math.sin(cloud.movement) * cloud.spawnPositionX;
        cloud.position.z = Math.cos(cloud.movement) * cloud.spawnPositionZ;
    }
}

function map(n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}

function updateCloudSpeed() {
    for (let i = 0; i < clouds.children.length; i++) {
        clouds.children[i].speed = random(percent(0, params.cloudsSpeed, 80), percent(0, params.cloudsSpeed, 150));;
    }
}

function updateWaterTurbulence() {
    for (let i = 0; i < water.length; i++) {
        water[i].speed = random(percent(0, params.waterTurbulence, 80), percent(0, params.waterTurbulence, 150));;
    }
}

function updateCubes(heightmap) {
    let height;
    let cube;

    for (let i = 0, m = heightmap.maxWidth; i < m; i++) {
        for (let j = 0; j < heightmap.maxHeight; j++) {
            height = heightmap.data[j * m + i];
            cube = cubes[i * m + j];
            cube.position.set(i * distance - (m / 2 * distance), height / 2, j * distance - (terrainHeightmap.maxHeight / 2 * distance));
            cube.scale.set(1, height, 1);
            // cubes.push(cube);
            // world.add(cube);
        }
    }
}

function onCamReady(stream) {
    //init webcam texture
    video = document.createElement('video');
    video.width = terrainHeightmap.maxWidth;
    video.height = terrainHeightmap.maxHeight;
    video.autoplay = true;
    video.loop = true;
    video.onloadedmetadata = onCamMetaDataLoaded;
    video.srcObject = stream;
    video.data = [];
}

function onCamMetaDataLoaded() {
    // stop the user getting a text cursor
    document.onselectstart = function () {
        return false;
    };
    videoReady = true;
    console.log("Webcam attiva");

    // Analyze video image 
    vidCanvas = document.createElement('canvas');
    document.body.appendChild(vidCanvas);
    vidCanvas.style.position = 'absolute';
    vidCanvas.style.display = 'none';
    videoCanvas = vidCanvas.getContext('2d');
}

//return array with height data from img, taken from: http://danni-three.blogspot.it/2013/09/threejs-heightmaps.html
function getHeightData(img, scale) {

    if (scale == undefined) scale = 0.2;

    let ratio = img.height / img.width;
    let maxWidth = Math.min(img.width, DEFAULT_HEIGHTMAP_MAX_WIDTH),
        maxHeight = maxWidth * ratio;

    terrainHeightmap.maxHeight = maxHeight;
    terrainHeightmap.maxWidth = maxWidth;

    let canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    let context = canvas.getContext('2d');

    let size = maxWidth * maxHeight;
    let data = new Float32Array(size);
    // let maxWidth = 61,
    // maxHeight = 61;
    // let maxHeight = maxWidth * ratio;
    context.drawImage(img, 0, 0, maxWidth, maxHeight);

    document.getElementById("testImg").src = canvas.toDataURL('image/webp');
    document.getElementById("testImg").style.width = maxWidth;
    document.getElementById("testImg").style.height = maxHeight;

    for (let i = 0; i < size; i++) {
        data[i] = 0
    }

    let imgData = context.getImageData(0, 0, maxWidth, maxHeight);
    let pix = imgData.data;

    let j = 0;
    for (let i = 0; i < pix.length; i += 4) {
        let all = pix[i] + pix[i + 1] + pix[i + 2];  // all is in range 0 - 255*3
        data[j++] = scale * all / 3;
    }
    return data;
}



// -----------------------------------------------
// Aux functions
// -----------------------------------------------

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function percent(min, max, percent) {
    return ((max - min) * percent) / 100;
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // update the camera
    aspectRatio = window.innerWidth / window.innerHeight;
    camera.left = (-aspectRatio * viewSize) / 2;
    camera.right = (aspectRatio * viewSize) / 2;
    camera.top = viewSize / 2 + cameraOffsetY;
    camera.bottom = -viewSize / 2 + cameraOffsetY;
    camera.updateProjectionMatrix();
}





Start();
Update();
