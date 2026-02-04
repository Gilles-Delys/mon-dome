let scene, camera, renderer, labelRenderer, controls, domeGroup;

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 4, 4);

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
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Mise à jour automatique sur changement d'input
    document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => {
        el.addEventListener('input', refreshAll);
    });

    window.addEventListener('resize', onResize);
    refreshAll();
    animate();
}

function refreshAll() {
    const data = Logic.getData();
    update3D(data);
    updateTables(data);
}

function update3D(data) {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    data.edges.forEach(edge => {
        const mat = new THREE.LineBasicMaterial({ color: edge.color, linewidth: 2 });
        const geo = new THREE.BufferGeometry().setFromPoints([edge.v1, edge.v2]);
        const line = new THREE.Line(geo, mat);
        domeGroup.add(line);

        const mid = new THREE.Vector3().addVectors(edge.v1, edge.v2).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = edge.type;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(mid);
        domeGroup.add(label);
    });
    scene.add(domeGroup);
}

function updateTables(data) {
    // Page Détails
    let dHtml = `<table><tr><th>Type</th><th>Long (mm)</th><th>Qté</th><th>Couleur</th></tr>`;
    for (let t in data.types) {
        dHtml += `<tr><td><b>${t}</b></td><td>${data.types[t].len}</td><td>${data.types[t].count}</td><td style="background:${data.types[t].color}"></td></tr>`;
    }
    document.getElementById('details-table').innerHTML = dHtml + `</table>`;

    // Page Résultats
    const p = data.params;
    const h = p.radius + (p.radius * (2 * p.cut - 1));
    const surfSol = Math.PI * Math.pow(p.radius, 2);
    
    document.getElementById('results-display').innerHTML = `
        <p>Hauteur au sol, m : <b>${h.toFixed(3)}</b></p>
        <p>Rayon au sol, m : <b>${p.radius.toFixed(3)}</b></p>
        <p>Surface au sol, m² : <b>${surfSol.toFixed(2)}</b></p>
        <hr><p class="title-section">Quantités</p>
        <p>Faces : <b>${data.faceCount}</b></p>
        <p>Montants : <b>${data.edges.length}</b></p>
        <p>Nœuds : <b>${Math.round(data.edges.length * 0.6)}</b></p>
        <hr><p class="title-section">Montants ${p.width}x${p.thick}</p>
        <p>Longueur totale : <b>${data.totalLen.toFixed(2)} m</b></p>
    `;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    onResize();
}

function onResize() {
    const c = document.getElementById('canvas-container');
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

window.onload = init;