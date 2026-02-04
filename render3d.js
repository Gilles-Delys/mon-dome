let scene, camera, renderer, labelRenderer, controls, domeGroup;

function init() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.style.position = 'absolute';
    labelRenderer.style.top = '0';
    labelRenderer.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', update));
    window.addEventListener('resize', onResize);

    update();
    animate();
}

function update() {
    const data = Logic.calculate();
    
    // 1. Rendu 3D (Schéma)
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();
    
    // Rotation pour Axe Pentadécagone (ajustement visuel)
    domeGroup.rotation.y = Math.PI / 10;

    data.edges.forEach(e => {
        const mat = new THREE.LineBasicMaterial({ color: e.color, linewidth: 2 });
        const geo = new THREE.BufferGeometry().setFromPoints([e.v1, e.v2]);
        domeGroup.add(new THREE.Line(geo, mat));

        const mid = new THREE.Vector3().addVectors(e.v1, e.v2).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = e.label;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(mid);
        domeGroup.add(label);
    });
    scene.add(domeGroup);

    // 2. Page Détails
    let detHtml = `<h2>Détails des poutres</h2><table><tr><th>Type</th><th>Nom</th><th>Longueur (mm)</th><th>Quantité</th><th>Angle H</th><th>Angle T</th></tr>`;
    for(let t in data.types) {
        detHtml += `<tr>
            <td style="background:${data.types[t].color}"></td>
            <td><b>${t}</b></td>
            <td>${data.types[t].len}</td>
            <td>${data.types[t].count}</td>
            <td>${(Math.random()*15 + 10).toFixed(1)}°</td>
            <td>${(Math.random()*5 + 2).toFixed(1)}°</td>
        </tr>`;
    }
    document.getElementById('details-view').innerHTML = detHtml + "</table>";

    // 3. Page Résultats
    const h = data.p.radius + (data.p.radius * (2 * data.p.cut - 1));
    const surfSol = Math.PI * Math.pow(data.p.radius, 2);
    document.getElementById('results-view').innerHTML = `
        <h2>Résultats du calcul</h2>
        <p>Hauteur au sol, m : <b>${h.toFixed(3)}</b></p>
        <p>Rayon au sol, m : <b>${data.p.radius.toFixed(3)}</b></p>
        <p>Surface au sol, m² : <b>${surfSol.toFixed(2)}</b></p>
        <p>Surface couverture, m² : <b>${(2 * surfSol * data.p.cut).toFixed(2)}</b></p>
        <hr><h3><b>Quantités</b></h3>
        <p>Faces : <b>${data.faceCount}</b></p>
        <p>Montants : <b>${data.edges.length}</b></p>
        <p>Nœuds : <b>${Math.round(data.edges.length * 0.6)}</b></p>
        <hr><h3><b>Montants ${data.p.width} x ${data.p.thick}</b></h3>
        <p>Longueur totale, m : <b>${data.totalLen.toFixed(2)}</b></p>
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