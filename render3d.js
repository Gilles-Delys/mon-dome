let scene, camera, renderer, dome;

function init3D() {
    const container = document.getElementById('renderer-container');
    if (renderer) return; 

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / 500, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, 500);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    // Création dynamique basée sur la fréquence V
    const freq = parseInt(document.getElementById('freqV').value);
    const rad = parseFloat(document.getElementById('rayon').value);
    
    const geometry = new THREE.IcosahedronGeometry(rad * 2, freq);
    const material = new THREE.MeshBasicMaterial({ color: 0x1abc9c, wireframe: true });
    dome = new THREE.Mesh(geometry, material);
    scene.add(dome);

    camera.position.z = rad * 5;

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}