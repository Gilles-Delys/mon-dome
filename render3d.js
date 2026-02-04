/**
 * Gère le rendu 3D et les mises à jour d'interface.
 */
let scene, camera, renderer, labelRenderer, controls, domeGroup;

function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.style.position = 'absolute';
    labelRenderer.style.top = '0';
    labelRenderer.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Listeners sur les inputs
    document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => {
        el.addEventListener('input', updateUI);
    });

    window.addEventListener('resize', onWindowResize);
    animate();
    updateUI();
}

function updateUI() {
    const params = Logic.getParams();
    const data = Logic.calculateDomeData(params);
    
    renderDome(data);
    fillTables(data, params);
}

function renderDome(data) {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    data.edgesMap.forEach(edge => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([edge.va, edge.vb]);
        const mat = new THREE.LineBasicMaterial({ color: Logic.beamColors[edge.type] || '#000' });
        const line = new THREE.Line(lineGeo, mat);
        domeGroup.add(line);

        // Étiquettes
        const mid = new THREE.Vector3().addVectors(edge.va, edge.vb).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = edge.type;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(mid);
        domeGroup.add(label);
    });

    scene.add(domeGroup);
}

function fillTables(data, p) {
    // Remplissage Résultats
    const h = p.radius + (p.radius * (2 * p.cut - 1));
    document.getElementById('stats-output').innerHTML = `
        <p>Hauteur au sol : <b>${h.toFixed(3)} m</b></p>
        <p>Rayon au sol : <b>${p.radius.toFixed(3)} m</b></p>
        <p>Total montants : <b>${data.totalLen.toFixed(2)} m</b></p>
    `;

    // Remplissage Détails
    let html = `<table><tr><th>Type</th><th>Long. (mm)</th><th>Qté</th><th>Couleur</th></tr>`;
    for (let t in data.edgeData) {
        html += `<tr><td><b>${t}</b></td><td>${data.edgeData[t].len}</td><td>${data.edgeData[t].count}</td><td style="background:${data.edgeData[t].color}"></td></tr>`;
    }
    html += `</table>`;
    document.getElementById('details-table-container').innerHTML = html;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    onWindowResize();
}

function onWindowResize() {
    const c = document.getElementById('canvas-container');
    if (!c) return;
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight);
    labelRenderer.setSize(c.clientWidth, c.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.onload = init3D;