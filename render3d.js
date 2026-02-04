let scene, camera, renderer, dome, controls;

function init3D() {
    const container = document.getElementById('renderer-container');
    if (renderer) {
        update3D();
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / 500, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, 500);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x555555));

    update3D();

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function update3D() {
    if (dome) scene.remove(dome);

    const rad = parseFloat(document.getElementById('rayon').value);
    const decoupe = document.getElementById('decoupe').value;
    
    // Visualisation simplifiée du dôme
    // On utilise une sphère tronquée pour simuler le 1/2 vs 7/12
    const thetaLength = decoupe === "0.5" ? Math.PI / 2 : Math.PI / 1.7; 
    
    const geometry = new THREE.SphereGeometry(rad * 2, 32, 16, 0, Math.PI * 2, 0, thetaLength);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x1abc9c, 
        wireframe: true,
        wireframeLinewidth: 2 
    });
    
    dome = new THREE.Mesh(geometry, material);
    scene.add(dome);
    
    camera.position.set(0, rad * 3, rad * 5);
}