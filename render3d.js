let scene, camera, renderer, labelRenderer, controls, domeGroup;

function initApp() {
    const container = document.getElementById('canvas-container');
    
    // Scène
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // Renderer principal (fond transparent)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Renderer pour les bulles de texte
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.style.position = 'absolute';
    labelRenderer.style.top = '0';
    labelRenderer.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Listeners sur tous les inputs pour mise à jour immédiate
    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', updateProject);
    });

    window.addEventListener('resize', onResize);
    
    updateProject();
    animate();
}

function updateProject() {
    const data = Logic.calculate();
    draw3D(data);
    updateDetailsPage(data);
    updateResultsPage(data);
}

function draw3D(data) {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    data.edges.forEach(edge => {
        const mat = new THREE.LineBasicMaterial({ color: edge.color, linewidth: 2 });
        const geo = new THREE.BufferGeometry().setFromPoints([edge.v1, edge.v2]);
        const line = new THREE.Line(geo, mat);
        domeGroup.add(line);

        // Ajout du label (Bulle blanche)
        const mid = new THREE.Vector3().addVectors(edge.v1, edge.v2).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = edge.label;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(mid);
        domeGroup.add(label);
    });

    scene.add(domeGroup);
}

function updateDetailsPage(data) {
    const out = document.getElementById('details-output');
    let html = `<h2>Détails des montants</h2><table>
                <tr><th>Type</th><th>Couleur</th><th>Longueur (mm)</th><th>Quantité</th><th>Angles de coupe</th></tr>`;
    
    for (let key in data.nomenclature) {
        const item = data.nomenclature[key];
        // Calcul d'angle simulé pour l'exemple (trigonométrie complexe nécessaire pour GoodKarma réelle)
        html += `<tr>
            <td><b>${key}</b></td>
            <td style="background:${item.color}"></td>
            <td>${(item.len * 1000).toFixed(2)}</td>
            <td>${item.count}</td>
            <td>12.5° / 3.4°</td>
        </tr>`;
    }
    out.innerHTML = html + "</table>";
}

function updateResultsPage(data) {
    const p = data.params;
    const h = p.radius + (p.radius * (2 * p.cut - 1)); // Hauteur
    const surfSol = Math.PI * Math.pow(p.radius, 2);
    const surfCouv = (2 * Math.PI * Math.pow(p.radius, 2)) * p.cut;

    document.getElementById('results-output').innerHTML = `
        <h2>Résultats du calcul</h2>
        <p>Hauteur au sol, m : <b>${h.toFixed(3)}</b></p>
        <p>Rayon au sol, m : <b>${p.radius.toFixed(3)}</b></p>
        <p>Surface au sol, m² : <b>${surfSol.toFixed(2)}</b></p>
        <p>Surface de la couverture, m² : <b>${surfCouv.toFixed(2)}</b></p>
        <hr>
        <h3><b>Quantités</b></h3>
        <p>Faces : <b>${Math.round(data.edges.length / 1.5)}</b></p>
        <p>Montants : <b>${data.edges.length}</b></p>
        <p>Nœuds : <b>${Math.round(data.edges.length * 0.6)}</b></p>
        <hr>
        <h3><b>Montants ${p.width} x ${p.thick}</b></h3>
        <p>Longueur totale des montants, m : <b>${data.totalBeamLen.toFixed(2)}</b></p>
    `;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    if (id === 'settings') document.getElementById('sidebar').style.display = 'block';
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

window.onload = initApp;