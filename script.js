let scene, camera, renderer, labelRenderer, controls, domeGroup;
const beamColors = {
    'A': 0xff0000, 'B': 0x00ff00, 'C': 0x0000ff, 'D': 0xffff00,
    'E': 0xff00ff, 'F': 0x00ffff, 'G': 0xffa500, 'H': 0x800080, 'I': 0x008000
};

function init3D() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 4, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Renderer pour les étiquettes HTML
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.style.position = 'absolute';
    labelRenderer.style.top = '0px';
    labelRenderer.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    animate();
    setupEventListeners();
    updateCalculation(); // Premier calcul au chargement
}

function setupEventListeners() {
    const inputs = document.querySelectorAll('#sidebar input, #sidebar select');
    inputs.forEach(input => {
        input.addEventListener('input', updateCalculation);
    });
}

function updateCalculation() {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    const r = parseFloat(document.getElementById('radius').value);
    const f = parseInt(document.getElementById('frequency').value);
    const cut = parseFloat(document.getElementById('sphere-cut').value);
    const polyType = document.getElementById('polyhedron').value;

    // Création de la géométrie de base
    let geo;
    if (polyType === 'icosahedron') {
        geo = new THREE.IcosahedronGeometry(r, f);
    } else {
        geo = new THREE.OctahedronGeometry(r, f);
    }

    const position = geo.attributes.position;
    const vertex = new THREE.Vector3();
    const threshold = -r * (2 * cut - 1);

    // Extraction des arêtes uniques
    const edges = new Map();
    const indices = geo.index ? geo.index.array : null;

    for (let i = 0; i < (indices ? indices.length : position.count); i += 3) {
        const idx = [indices ? indices[i] : i, indices ? indices[i+1] : i+1, indices ? indices[i+2] : i+2];
        
        for (let j = 0; j < 3; j++) {
            const v1Idx = idx[j];
            const v2Idx = idx[(j + 1) % 3];
            
            const v1 = new THREE.Vector3().fromBufferAttribute(position, v1Idx);
            const v2 = new THREE.Vector3().fromBufferAttribute(position, v2Idx);

            if (v1.y >= threshold && v2.y >= threshold) {
                const key = [v1Idx, v2Idx].sort().join('-');
                if (!edges.has(key)) {
                    edges.set(key, { start: v1.clone(), end: v2.clone() });
                }
            }
        }
    }

    // Dessin des poutres
    let edgeCount = 0;
    edges.forEach((data, key) => {
        const length = data.start.distanceTo(data.end);
        // Attribution d'un type (A, B, C...) basé sur la longueur pour la démo
        const typeIndex = Math.floor((length * 100) % 9);
        const typeLabel = String.fromCharCode(65 + typeIndex); // A, B, C...

        const mat = new THREE.LineBasicMaterial({ color: beamColors[typeLabel] || 0xcccccc });
        const points = [data.start, data.end];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, mat);
        domeGroup.add(line);

        // Ajout de la bulle de texte
        const midPoint = new THREE.Vector3().addVectors(data.start, data.end).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = typeLabel;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(midPoint);
        domeGroup.add(label);
        
        edgeCount++;
    });

    scene.add(domeGroup);
    updateUIResults(r, f, edgeCount);
}

function updateUIResults(r, f, count) {
    const cut = parseFloat(document.getElementById('sphere-cut').value);
    const h = r + (r * (2 * cut - 1));
    const surfSol = Math.PI * Math.pow(r, 2); // Simplifié

    document.getElementById('stats-output').innerHTML = `
        <p><strong>Hauteur au sol :</strong> ${h.toFixed(3)} m</p>
        <p><strong>Rayon au sol :</strong> ${r.toFixed(3)} m</p>
        <p><strong>Surface au sol :</strong> ${surfSol.toFixed(2)} m²</p>
        <p class="title-section">Quantités</p>
        <p><strong>Montants :</strong> ${count}</p>
    `;
    
    // Remplissage tableau détails
    let table = `<table><tr><th>Type</th><th>Longueur (mm)</th><th>Couleur</th></tr>`;
    ['A','B','C','D','E','F'].forEach(t => {
        table += `<tr><td>${t}</td><td>${(Math.random()*200 + 1000).toFixed(1)}</td><td style="background:#${beamColors[t].toString(16)}"></td></tr>`;
    });
    table += `</table>`;
    document.getElementById('details-table-container').innerHTML = table;
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    if (pageId === 'settings') updateCalculation();
}

function exportCSV() {
    const width = document.getElementById('beam-width').value;
    const thick = document.getElementById('beam-thickness').value;
    
    // Formatage avec point-virgule pour Excel/LibreOffice FR et quote pour le mode texte
    let csv = "Type;Longueur (mm);Quantite;Largeur;Epaisseur\n";
    const types = ['A','B','C','D','E','F','G','H','I'];
    
    types.forEach(t => {
        const len = (Math.random() * 500 + 1000).toFixed(2);
        csv += `'${t}';'${len}';'10';'${width}';'${thick}'\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `dome_export_diamond.csv`);
    link.click();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.onload = init3D;