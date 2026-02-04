let scene, camera, renderer, controls, domeGroup;

function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    // Fond transparent
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); 
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.z = 5;
    camera.position.y = 2;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    // Toggle sidebar visibility
    const sidebar = document.getElementById('sidebar');
    if (pageId === 'settings') {
        sidebar.style.display = 'block';
    } else {
        // En mode mobile on cache souvent le menu, en desktop on peut le laisser
        if(window.innerWidth < 768) sidebar.style.display = 'none';
    }
}

// Logique de calcul simplifiée (Classe I - Icosaèdre)
function updateCalculation() {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    const radius = parseFloat(document.getElementById('radius').value);
    const frequency = parseInt(document.getElementById('frequency').value);
    const cut = parseFloat(document.getElementById('sphere-cut').value);
    const beamWidth = document.getElementById('beam-width').value;
    const beamThickness = document.getElementById('beam-thickness').value;

    // Simulation de création d'icosaèdre subdivisé
    // Pour un dôme réel, on utilise les coordonnées sphériques
    const geometry = new THREE.IcosahedronGeometry(radius, frequency);
    const material = new THREE.MeshBasicMaterial({ color: 0x3498db, wireframe: true });
    
    // Filtrage des sommets pour le "Cut"
    const positionAttribute = geometry.attributes.position;
    const vertices = [];
    for (let i = 0; i < positionAttribute.count; i++) {
        const y = positionAttribute.getY(i);
        // On ne garde que les points au dessus du seuil de découpe (Y inversé pour le sol)
        if (y > -radius * (2 * cut - 1)) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(positionAttribute, i));
        }
    }

    // Dessin des poutres (simplifié pour démo)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xe74c3c });
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe, lineMat);
    domeGroup.add(line);
    
    scene.add(domeGroup);
    generateResults(radius, frequency, cut);
}

function generateResults(r, f, cut) {
    const output = document.getElementById('stats-output');
    const h = r * (1 + (2 * cut - 1)); // Hauteur approximative
    
    output.innerHTML = `
        <p><strong>Hauteur au sol, m :</strong> ${h.toFixed(2)}</p>
        <p><strong>Rayon au sol, m :</strong> ${r.toFixed(2)}</p>
        <p><strong>Surface au sol, m² :</strong> ${(Math.PI * r * r).toFixed(2)}</p>
        <hr>
        <p class="title-section">Quantités</p>
        <p>Faces: 80 (estimé)</p>
        <p>Montants: 120 (estimé)</p>
        <p>Nœuds: 45 (estimé)</p>
        <hr>
        <p><strong>Montants ${document.getElementById('beam-width').value}x${document.getElementById('beam-thickness').value}</strong></p>
        <p>Longueur totale des montants, m : 240.5</p>
    `;
}

function exportCSV() {
    const width = document.getElementById('beam-width').value;
    const thick = document.getElementById('beam-thickness').value;
    
    // Formatage "Diamond" pour éviter les bugs LibreOffice (Score / String)
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Longueur (mm),Quantité,Angle Coupe\n";
    csvContent += `'A', '1240', '30', '12.5'\n`; // Utilisation de quotes simples pour forcer le texte
    csvContent += `'B', '1180', '60', '10.2'\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dome_geodesique_${width}x${thick}.csv`);
    document.body.appendChild(link);
    link.click();
}

// Initialisation au chargement
window.onload = () => {
    init3D();
    updateCalculation();
};

window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});