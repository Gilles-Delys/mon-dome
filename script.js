// --- Initialisation de la Scène 3D ---
let scene, camera, renderer, controls, group;

function init3D() {
    const container = document.getElementById('threejs-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Fond blanc

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    group = new THREE.Group();
    scene.add(group);

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    const container = document.getElementById('threejs-canvas');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- Logique de calcul du Dôme ---
const COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x800080, 0x008000];
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

function updateAll() {
    const freq = parseInt(document.getElementById('v-freq').value);
    const radius = parseFloat(document.getElementById('radius').value);
    const fraction = parseFloat(document.getElementById('fraction').value);
    
    generateDome(freq, radius, fraction);
    updateResults();
}

function generateDome(v, r, fraction) {
    group.clear(); // On vide la scène précédente
    
    // Pour une démo stable, nous utilisons ici un Icosaèdre simple 
    // subdivisé dynamiquement selon la fréquence V
    const geometry = new THREE.IcosahedronGeometry(r, v);
    const positionAttribute = geometry.getAttribute('position');
    
    let struts = []; // Pour stocker les segments uniques

    // On filtre les points selon la fraction (hauteur Y)
    // Note: Pour une sphère centrée, l'hémisphère est à y > 0
    const threshold = -r * (2 * fraction - 1); 

    for (let i = 0; i < positionAttribute.count; i += 3) {
        // Logique de dessin des lignes pour chaque face
        drawStruts(i, positionAttribute, threshold, r);
    }
}

function drawStruts(index, pos, limit, r) {
    const material = new THREE.LineBasicMaterial({ color: COLORS[0] });
    const points = [];
    
    // Simplification : On dessine les arêtes des triangles
    for(let j=0; j<3; j++) {
        const x = pos.getX(index + j);
        const y = pos.getY(index + j);
        const z = pos.getZ(index + j);
        
        if (y >= limit) {
            points.push(new THREE.Vector3(x, y, z));
        }
    }

    if (points.length >= 2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, material);
        group.add(line);
    }
}

// --- Gestion des Onglets ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'parametres') {
        // Réinitialisation si nécessaire ou simple rafraîchissement
        onWindowResize(); 
    }
}

// --- Export CSV ---
function exportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type;Lettre;Longueur;Quantite\n";
    // Simulation de données
    csvContent += "Montant;A;1.234;30\n";
    csvContent += "Montant;B;1.112;60\n";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "geodome_export.csv");
    document.body.appendChild(link);
    link.click();
}

// Lancement au chargement
window.onload = () => {
    init3D();
    updateAll();
};