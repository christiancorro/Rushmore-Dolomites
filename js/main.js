
let scene, camera, renderer, controls, stats, gui;
let heightmap, data;


let bgColor = new THREE.Color(0xFCF1E8);

let unitSize = 1,
    distance = unitSize;


let fov = 60,
    aspectRatio = window.innerWidth / window.innerHeight,
    near = 0.1,
    far = 500;

let viewSize = 180,
    cameraOffset = 15; // used to shift camera on the Y axis

let logCount = 0;
const logTotal = 4;

let world;
let fileSelector = document.getElementById('myInput');

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
    camera.position.set(0, 80, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    var geometry = new THREE.PlaneBufferGeometry(80, 80, 32, 32);
    var material = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
    var plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = Math.PI / 2;

    world = new THREE.Group();
    //world.add(plane);
    scene.add(world);

    // Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // Axes
    var axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    let params = {
        loadFile: function () {
            fileSelector.click();
        }
    };
    // fileSelector.addEventListener('change', (event) => {
    //     heightmap = new Image();
    //     heightmap.src = URL.createObjectURL(event.target.files[0]);
    //     console.log(heightmap);
    //     console.log(event.target.files[0]);
    //     heightmap.data = getHeightData(heightmap, 0.2);
    //     scene.children.length = 0;
    //     generaTerreno(heightmap);
    //     scene.add(world);
    // });

    // GUI
    gui = new dat.GUI();
    gui.add(params, 'loadFile').name('Load heightmap');

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2;
    // controls.minPolarAngle = Math.PI * 0.05;
    controls.enableKeys = false;

    // Terrain
    heightmap = new Image();
    heightmap.data = [];
    // load img source
    heightmap.src = "img/heightmaps/heightmap2.png";
    heightmap.onload = function () {
        console.log("[" + ++logCount + "/" + logTotal + "] Heightmap caricata (" + heightmap.width + "x" + heightmap.height + ")");
        //get height data from img
        heightmap.data = getHeightData(heightmap, 0.2);
        generaTerreno(heightmap);
    }
}

function Update() {
    requestAnimationFrame(Update);
    controls.update();
    stats.update();
    Render();
}

function Render() {
    renderer.render(scene, camera);
}

function generaTerreno(heightmap) {
    console.log("[" + ++logCount + "/" + logTotal + "] Generazione terreno...");
    let geometry = new THREE.BoxBufferGeometry(unitSize, unitSize, unitSize);
    let material = new THREE.MeshBasicMaterial({
        color: 0x00000,
        wireframe: true
    });

    for (let i = 0, m = heightmap.width; i < m; i++) {
        for (let j = 0; j < heightmap.height; j++) {
            let cube = new THREE.Mesh(geometry, material,);
            cube.position.set(i * distance - (m / 2 * distance), heightmap.data[j * m + i] * distance, j * distance - (heightmap.height / 2 * distance));
            //cube.scale.set(1, data[i * m + j] * unitSize / 2, 1);

            world.add(cube);
        }
    }

    console.log("[" + ++logCount + "/" + logTotal + "] Terreno generato");
}

// -----------------------------------------------
// Funzioni ausiliarie 
// -----------------------------------------------

//return array with height data from img, taken from: http://danni-three.blogspot.it/2013/09/threejs-heightmaps.html
function getHeightData(img, scale) {

    if (scale == undefined) scale = 1;

    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let context = canvas.getContext('2d');

    let size = img.width * img.height;
    let data = new Float32Array(size);

    context.drawImage(img, 0, 0);

    for (let i = 0; i < size; i++) {
        data[i] = 0
    }

    let imgData = context.getImageData(0, 0, img.width, img.height);
    let pix = imgData.data;

    let j = 0;
    for (let i = 0; i < pix.length; i += 4) {
        let all = pix[i] + pix[i + 1] + pix[i + 2];  // all is in range 0 - 255*3
        data[j++] = scale * all / 3;
    }
    console.log("[" + ++logCount + "/" + logTotal + "] Dati heightmap estratti (" + data.length + ")");
    return data;
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

Start();
Update();
