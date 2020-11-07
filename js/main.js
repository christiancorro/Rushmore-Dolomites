
let scene, camera, renderer, controls, stats, gui;
let terrainHeightmap, data;
let maxHeightTerrain, minHeightTerrain;

let bgColor = new THREE.Color(0xFCF1E8);

let unitSize = 1,
    distance = unitSize;


let fov = 60,
    aspectRatio = window.innerWidth / window.innerHeight,
    near = 0.1,
    far = 500;

let viewSize = 180,
    cameraOffset = 20; // used to shift camera on the Y axis

let world, plane;

let logCount = 0;
const logTotal = 4;

let video;
var videoWidth = 320;
var videoHeight = 240;
let videoCanvas;
let videoReady = false;

let params;
let date = new Date();

let cubes = [];
let water = [];
let grass = [];
let clouds = new THREE.Object3D();
let trees = new THREE.Object3D();

const DEFAULT_CLOUDS_N = 4;
const loader = new THREE.TextureLoader();
let fileSelector = document.getElementById('myInput');

let webcamStarted = false;

function Start() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bgColor, far / 3, far * 2);

    // camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    camera = new THREE.OrthographicCamera(
        (-aspectRatio * viewSize) / 2,
        (aspectRatio * viewSize) / 2,
        viewSize / 2 + cameraOffset,
        -viewSize / 2 + cameraOffset,
        near,
        far
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    // camera.position.set(distance * 30, distance * 20, distance * 20);
    // camera.position.set(-5, 50, 80);
    camera.position.set(45, 45, 85);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    params = {
        numberClouds: DEFAULT_CLOUDS_N,
        dimClouds: 4,
        speedClouds: 0.002,
        altitudeClouds: 0,
        waterTurbulence: 0.08,
        numberBirds: 6,
        numberTrees: 300,
        scaleTree: 3,
        webcam: false,
        loadFile: function () {
            fileSelector.click();
        },
        heightmap: 'img/heightmaps/heightmapDefault.png',
        download_GLTF: exportGLTF
    };

    fileSelector.addEventListener('change', (event) => {
        // console.log(event);
        var reader = new FileReader();
        reader.onload = function () {
            heightmap = new Image();
            heightmap.onload = function () {
                console.clear();
                console.log("Heightmap loaded (" + heightmap.width + "x" + heightmap.height + ")px");
                //get height data from img
                heightmap.data = getHeightData(heightmap, 0.2);

                world.children.length = 0;
                // console.log(heightmap);
                generateWorld(heightmap);
                scene.add(world);
            }

            heightmap.src = reader.result;
        }
        reader.readAsDataURL(event.target.files[0]);
    });

    var geometry = new THREE.PlaneBufferGeometry(1, 1, 32, 32);
    var material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
    plane = new THREE.Mesh(geometry, material);
    plane.position.set(0, -0.1, 0);
    plane.rotation.x = Math.PI / 2;

    world = new THREE.Group();


    addLight(0.3, -50, 100, 10);
    addLight(0.2, 0, 1, 2);
    // addLight(0.5, -1, 1, -2);
    // addLight(10, 10, 2);

    const light = new THREE.AmbientLight(0xffffff, 1); // soft white light
    scene.add(light);

    // world.rotation.x = Math.PI / 2;
    scene.add(world);

    // Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // Axes
    var axesHelper = new THREE.AxesHelper(5);
    // scene.add(axesHelper);


    // GUI
    gui = new dat.GUI();
    gui.add(params, 'webcam');
    let folderClouds = gui.addFolder("Clouds");
    folderClouds.add(params, 'numberClouds').min(0).max(100).step(1).onChange(createClouds);
    folderClouds.add(params, 'dimClouds').min(1).max(10).step(1).onChange(createClouds);
    folderClouds.add(params, 'speedClouds').min(0).max(0.1).step(0.001).onChange(updateCloudSpeed);
    folderClouds.add(params, 'altitudeClouds').min(0).max(100).step(1).onChange(createClouds);
    folderClouds.open();

    let folderBirds = gui.addFolder("Birds");
    folderBirds.add(params, 'numberBirds').min(0).max(50).step(1);
    folderBirds.open();

    let folderTrees = gui.addFolder("Trees");
    folderTrees.add(params, 'numberTrees').min(0).max(1000).step(1).onChange(createTrees);
    console.log(folderTrees);
    folderTrees.add(params, 'scaleTree').min(1).max(10).step(0.5).onChange(createTrees);

    folderTrees.open();


    let folderWater = gui.addFolder("Water");
    folderWater.add(params, 'waterTurbulence').min(0).max(0.5).step(0.001).onChange(updateWaterTurbulence);
    folderWater.open();

    gui.add(params, 'heightmap', {
        HeightmapDefault: 'img/heightmaps/heightmapDefault.png',
        Heightmap1: 'img/heightmaps/heightmap1.png',
        Heightmap2: 'img/heightmaps/heightmap2.png',
        Heightmap3: 'img/heightmaps/heightmap3.png',
        Heightmap4: 'img/heightmaps/heightmap4.png',
        Heightmap5: 'img/heightmaps/heightmap5.png'
    }).onChange(generateWorldFromImage);

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

    //get webcam
    // startWebcam();

    // Terrain
    generateWorldFromImage();
}

function generateWorldFromImage() {
    // world.children.length = 0;
    // trees.children.length = 0;
    // clouds.children.length = 0;
    console.clear();
    terrainHeightmap = new Image();
    terrainHeightmap.data = [];
    // load img source
    terrainHeightmap.src = params.heightmap;
    terrainHeightmap.onload = function () {
        console.log("Heightmap loaded (" + terrainHeightmap.width + "x" + terrainHeightmap.height + ")px");
        //get height data from img
        terrainHeightmap.data = getHeightData(terrainHeightmap, 0.2);
        console.log("Heightmap data extracted (" + terrainHeightmap.data.length + ")");
        world.children.length = 0;
        trees.children.length = 0;
        clouds.children.length = 0;
        generateWorld(terrainHeightmap);
    }
}

function generateWorld(heightmap) {
    createTerrain(heightmap);
    createClouds();
    createTrees();
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

// link element for download
var link = document.createElement('a');
link.style.display = 'none';
link = document.body.appendChild(link);

function save(blob, filename) {
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function createTrees() {
    trees.children.length = 0;
    let loader = new THREE.GLTFLoader();
    loader.load('models/tree/tree.gltf', function (gltf) {

        // gltf.scene.traverse(function (child) {

        //     // if (child.isMesh) {

        //     //     child.material.envMap = envMap;

        //     // }

        // });
        //scene.add(gltf.scene);
        let treeScale = params.scaleTree;
        for (let i = 0, j; i < params.numberTrees; i++) {
            if (i < grass.length - 1) {
                j = Math.floor(random(0, grass.length - 1));
                // j = 500;
                // console.log(grass[500].position);
                // const materialTree = new THREE.MeshPhongMaterial({ map: loader.load('img/textures/tree.png'), shininess: 0, flatShading: true, transparent: true });
                //let geometryTree = new THREE.PlaneBufferGeometry(unitSize, unitSize * 2);
                //  let tree = new THREE.Mesh(geometryTree, materialTree);
                gltf.scene.scale.set(treeScale, treeScale, treeScale);
                let tree = gltf.scene.clone();
                tree.position.set(grass[j].position.x - treeScale * 0.1, grass[j].scale.y + treeScale * 1.7, grass[j].position.z - treeScale * 1.2);

                // console.log(tree.position);
                trees.add(tree);
            }
            scene.add(trees);
        }
    });

}


function createClouds() {
    // Delete all clouds
    clouds.children.length = 0;

    const geometryClouds = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
    const materialClouds = new THREE.MeshPhongMaterial({
        color: 0xDFDEDC,
        opacity: 0.6,
        transparent: true,
        shininess: 100,
        specular: 0xf9d71c,
        flatShading: true,
        map: loader.load('img/textures/cloud.jpg')
    });

    // cloud.position.set(0, 70, 0);
    // scene.add(cloud);
    let n = params.numberClouds;
    let nCloudCubes;

    let altitude = params.altitudeClouds;

    // Creation of all clouds
    for (let i = 0; i < n; i++) {
        let cloud = new THREE.Group();
        // determines randomly dimension of this cloud
        nCloudCubes = Math.ceil(random(1, 10)); //+- 20%
        if (nCloudCubes <= 0) nCloudCubes = 1;

        // Composition of this cloud
        let poxXOld = 0;
        for (let i = 0; i < nCloudCubes; i++) {

            let dimCubeX;
            let cloudCube = new THREE.Mesh(geometryClouds, materialClouds);
            let dimCloudCube = Math.floor(random(percent(0, params.dimClouds, 80), percent(0, params.dimClouds, 150)));
            if (dimCloudCube <= 0) dimCloudCube = 0.1;

            if (i == 0 || i == nCloudCubes - 1) dimCloudCube = random(percent(0, dimCloudCube, 50), percent(0, dimCloudCube, 70));

            dimCubeX = dimCloudCube / random(2, 4);


            cloudCube.scale.set(dimCubeX, dimCloudCube, dimCloudCube);
            cloudCube.position.set(poxXOld, 0, 0);

            poxXOld = cloudCube.position.x + 1.4;

            cloud.add(cloudCube);

        }

        cloud.speed = random(percent(0, params.speedClouds, 80), percent(0, params.speedClouds, 150));
        cloud.movement = 0;

        cloud.position.set(random(-terrainHeightmap.height / 2, terrainHeightmap.width / 2),
            random(altitude - 15, altitude + 15),
            random(-terrainHeightmap.height / 2, terrainHeightmap.height / 2));

        cloud.spawnPositionX = cloud.position.x;
        cloud.spawnPositionZ = cloud.position.z;
        clouds.add(cloud);
    }

    scene.add(clouds);
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

let cloudMove = 0;
function Update() {
    cloudMove += params.speedClouds;
    if (!webcamStarted && params.webcam) {
        startWebcam();
    }
    if (webcamStarted && !params.webcam) {
        webcamStarted = false;
        videoReady = false;
        // createTerrain(terrainHeightmap);
        updateCubes(terrainHeightmap);
    }

    if (videoReady) {
        video.data = getHeightData(video, 0.3);
        // console.log(d[0]);
        updateCubes(video);
    }


    animateClouds();
    animateWater();
    // world.rotation.y -= 0.01;
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
        waterCube.position.y = map(Math.sin(waterCube.movement), 0, 1, waterCube.initialHeight / 2 / 1.015, waterCube.initialHeight / 2 * 1.015);
        waterCube.scale.y = map(Math.sin(waterCube.movement), 0, 1, waterCube.initialHeight / 1.015, waterCube.initialHeight * 1.015);
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
        clouds.children[i].speed = random(percent(0, params.speedClouds, 80), percent(0, params.speedClouds, 150));;
    }
}

function updateWaterTurbulence() {
    for (let i = 0; i < water.length; i++) {
        water[i].speed = random(percent(0, params.waterTurbulence, 80), percent(0, params.waterTurbulence, 150));;
    }
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function updateCubes(heightmap) {
    // console.log(videoHeightmap.height);
    let height;
    let cube;
    for (let i = 0, m = 61; i < m; i++) {
        for (let j = 0; j < 61; j++) {
            height = heightmap.data[j * m + i];
            cube = cubes[i * m + j];
            cube.position.set(i * distance - (m / 2 * distance), height / 2, j * distance - (terrainHeightmap.height / 2 * distance));
            cube.scale.set(1, height, 1);
            // cubes.push(cube);
            // world.add(cube);
        }
    }
    // for (let i = 0; i < cubes.length; i++) {
    //     // console.log(videoHeightmap.data[i]);
    //     cubes[i].position.set(i / 2, videoHeightmap.data[i], i * distance);
    // }
}

function onCamReady(stream) {
    //init webcam texture
    video = document.createElement('video');
    video.width = videoWidth;
    video.height = videoHeight;
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

    // Analisi dell'immagine e trasformazione dei cubi

    vidCanvas = document.createElement('canvas');
    document.body.appendChild(vidCanvas);
    vidCanvas.style.position = 'absolute';
    vidCanvas.style.display = 'none';
    videoCanvas = vidCanvas.getContext('2d');
}

function createTerrain(heightmap) {
    grass = [];
    water = [];
    plane.scale.set(heightmap.width * 1.3, heightmap.height * 1.3, 0);
    world.add(plane);
    console.log("Creating terrain...");
    let geometry = new THREE.BoxBufferGeometry(unitSize, unitSize, unitSize);
    // let material = new THREE.MeshBasicMaterial({
    //     color: 0x00000,
    //     wireframe: true
    // });
    // const texture = new THREE.TextureLoader().load('textures/rock.jpg');

    // immediately use the texture for material creation

    const materialRock = new THREE.MeshPhongMaterial({ map: loader.load('img/textures/rock.jpg'), shininess: 0, flatShading: true });
    const materialWater = new THREE.MeshPhongMaterial({
        map: loader.load('img/textures/water.jpg'),
        // color: 0x1BE1F5,
        shininess: 70,
        specular: 0xf9d71c,
        flatShading: true,
        opacity: 0.45,
        transparent: true
    });
    const materialGrass = new THREE.MeshPhongMaterial({ map: loader.load('img/textures/grass.jpg'), shininess: 50, flatShading: true });
    const materialSnow = new THREE.MeshPhongMaterial({ map: loader.load('img/textures/snow.jpg'), shininess: 90, specular: 0xf9d71c, flatShading: true });
    const materialSand = new THREE.MeshPhongMaterial({
        map: loader.load('img/textures/sand.jpg'),
        // color: 0xE7C69C,
        shininess: 0,
        flatShading: true
    });

    maxHeightTerrain = Math.max(...heightmap.data);
    params.altitudeClouds = maxHeightTerrain;
    gui.updateDisplay();
    // console.log(maxHeight);
    minHeightTerrain = Math.min(...heightmap.data);
    // console.log(minHeight);

    // Livelli 
    // - 100 %
    // | neve
    // |
    // | roccia
    // | 
    // | erba
    // | sabbia
    // | 
    // | acqua
    // - 0 %
    const snowLevel = 95,
        rockLevel = 46,
        grassLevel = 33,
        sandLevel = 32;

    for (let i = 0, m = heightmap.width; i < m; i++) {
        for (let j = 0; j < heightmap.height; j++) {
            height = heightmap.data[j * m + i];
            let cube = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
            cube.heightData = height;
            cube.position.set(i * distance - (m / 2 * distance), height / 2, j * distance - (heightmap.height / 2 * distance));
            cube.scale.set(1, height, 1);

            // determines material
            if (height > percent(minHeightTerrain, maxHeightTerrain, snowLevel)) {
                cube.material = materialSnow;
            } else if (height > percent(minHeightTerrain, maxHeightTerrain, rockLevel)) {
                cube.material = materialRock;
            } else if (height > percent(minHeightTerrain, maxHeightTerrain, grassLevel)) {
                cube.material = materialGrass;
                grass.push(cube);
            } else if (height > percent(minHeightTerrain, maxHeightTerrain, sandLevel)) {
                cube.material = materialSand;
            } else {
                cube.material = materialWater;
                cube.speed = random(percent(0, params.waterTurbulence, 80), percent(0, params.waterTurbulence, 150));
                cube.movement = 0;
                cube.initialHeight = height;
                water.push(cube);
            }

            cubes.push(cube);
            world.add(cube);
        }
    }

    console.log("Terrain generated");
}

function percent(min, max, percent) {
    return ((max - min) * percent) / 100;
}

// -----------------------------------------------
// Aux functions
// -----------------------------------------------

//return array with height data from img, taken from: http://danni-three.blogspot.it/2013/09/threejs-heightmaps.html
function getHeightData(img, scale) {

    if (scale == undefined) scale = 0.2;

    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let context = canvas.getContext('2d');

    let size = img.width * img.height;
    let data = new Float32Array(size);

    // let ratio = canvas.height / canvas.width;
    let maxWidth = img.width,
        maxHeight = img.height;
    // let maxWidth = 61,
    // maxHeight = 61;
    // let maxHeight = maxWidth * ratio;
    context.drawImage(img, 0, 0, maxWidth, maxHeight);

    document.getElementById("testImg").src = canvas.toDataURL('image/webp');

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

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // update the camera
    aspectRatio = window.innerWidth / window.innerHeight;
    camera.left = (-aspectRatio * viewSize) / 2;
    camera.right = (aspectRatio * viewSize) / 2;
    camera.top = viewSize / 2 + cameraOffset;
    camera.bottom = -viewSize / 2 + cameraOffset;
    camera.updateProjectionMatrix();
}

Start();
Update();
