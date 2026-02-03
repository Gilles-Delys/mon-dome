let scene, camera, renderer, dome;

function init3D() {
    const container = document.getElementById('container3d');
    if (renderer) return; // Évite de recréer la scène si elle existe déjà

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / 500, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, 500);
    container.appendChild(renderer.domElement);

    // Création d'une géométrie de dôme (Icosaèdre subdivisé)
    const geometry = new THREE.IcosahedronGeometry(10, parseInt(document.getElementById('freqV').value));
    const material = new THREE.MeshBasicMaterial({ color: 0x1abc9c, wireframe: true });
    dome = new THREE.Mesh(geometry, material);
    scene.add(dome);

    camera.position.z = 25;

    function animate() {
        requestAnimationFrame(animate);
        dome.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}