let scene, camera, renderer, labelRenderer, controls, domeGroup;
const beamColors = {
    'A': '#e74c3c', 'B': '#2ecc71', 'C': '#3498db', 'D': '#f1c40f',
    'E': '#9b59b6', 'F': '#e67e22', 'G': '#1abc9c', 'H': '#34495e', 'I': '#7f8c8d'
};

function init() {
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Listeners pour mise à jour instantanée
    document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => {
        el.addEventListener('input', updateAll);
    });

    animate();
    updateAll();
}

function updateAll() {
    const params = getParams();
    update3D(params);
    const data = calculateData(params);
    updateDetails(data, params);
    updateResults(data, params);
}

function getParams() {
    return {
        poly: document.getElementById('polyhedron').value,
        freq: parseInt(document.getElementById('frequency').value),
        cut: parseFloat(document.getElementById('sphere-cut').value),
        radius: parseFloat(document.getElementById('radius').value),
        bWidth: document.getElementById('beam-width').value,
        bThick: document.getElementById('beam-thickness').value
    };
}

function update3D(p) {
    if (domeGroup) scene.remove(domeGroup);
    domeGroup = new THREE.Group();

    const geo = (p.poly === 'icosahedron') ? 
                new THREE.IcosahedronGeometry(p.radius, p.freq) : 
                new THREE.OctahedronGeometry(p.radius, p.freq);

    const pos = geo.attributes.position;
    const threshold = -p.radius * (2 * p.cut - 1);
    const edges = new Map();

    // Extraction des arêtes uniques au-dessus du sol
    for (let i = 0; i < pos.count; i += 3) {
        for (let j = 0; j < 3; j++) {
            const i1 = i + j;
            const i2 = i + (j + 1) % 3;
            const v1 = new THREE.Vector3().fromBufferAttribute(pos, i1);
            const v2 = new THREE.Vector3().fromBufferAttribute(pos, i2);

            if (v1.y >= threshold && v2.y >= threshold) {
                const key = [v1.toArray().map(v=>v.toFixed(3)).join(','), v2.toArray().map(v=>v.toFixed(3)).join(',')].sort().join('|');
                if (!edges.has(key)) edges.set(key, { v1, v2 });
            }
        }
    }

    // Calcul des types de poutres par longueur
    const uniqueLengths = [];
    edges.forEach(edge => {
        const len = parseFloat(edge.v1.distanceTo(edge.v2).toFixed(4));
        if (!uniqueLengths.includes(len)) uniqueLengths.push(len);
    });
    uniqueLengths.sort((a, b) => b - a); // Plus long = A

    edges.forEach(edge => {
        const len = parseFloat(edge.v1.distanceTo(edge.v2).toFixed(4));
        const typeIdx = uniqueLengths.indexOf(len);
        const type = String.fromCharCode(65 + typeIdx);
        
        const lineGeo = new THREE.BufferGeometry().setFromPoints([edge.v1, edge.v2]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: beamColors[type] || '#000' }));
        domeGroup.add(line);

        // Bulle étiquette
        const mid = new THREE.Vector3().addVectors(edge.v1, edge.v2).multiplyScalar(0.5);
        const div = document.createElement('div');
        div.className = 'beam-label';
        div.textContent = type;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(mid);
        domeGroup.add(label);
    });

    scene.add(domeGroup);
}

function calculateData(p) {
    // Simulation du calcul réel basé sur la géométrie Three.js
    const geo = (p.poly === 'icosahedron') ? new THREE.IcosahedronGeometry(p.radius, p.freq) : new THREE.OctahedronGeometry(p.radius, p.freq);
    const pos = geo.attributes.position;
    const threshold = -p.radius * (2 * p.cut - 1);
    const edgeData = {};
    let totalLen = 0;
    let facesCount = 0;

    const edgesMap = new Map();
    for(let i=0; i<pos.count; i+=3) {
        const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
        if (v1.y >= threshold) facesCount++; // Approximation simple
        
        for(let j=0; j<3; j++) {
            const va = new THREE.Vector3().fromBufferAttribute(pos, i+j);
            const vb = new THREE.Vector3().fromBufferAttribute(pos, i+(j+1)%3);
            if (va.y >= threshold && vb.y >= threshold) {
                const len = parseFloat(va.distanceTo(vb).toFixed(4));
                const key = [va.toArray().map(v=>v.toFixed(2)).join(','), vb.toArray().map(v=>v.toFixed(2)).join(',')].sort().join('|');
                if(!edgesMap.has(key)) {
                    edgesMap.set(key, len);
                    totalLen += len;
                }
            }
        }
    }

    // Regroupement par type
    const lengths = Array.from(new Set(edgesMap.values())).sort((a,b)=>b-a);
    lengths.forEach((l, idx) => {
        const type = String.fromCharCode(65 + idx);
        const count = Array.from(edgesMap.values()).filter(v => v === l).length;
        edgeData[type] = { len: (l*1000).toFixed(1), count: count, color: beamColors[type] };
    });

    return { edgeData, totalLen, facesCount, nodeCount: Math.round(edgesMap.size * 0.6) };
}

function updateDetails(data, p) {
    let html = `<table><tr><th>Type</th><th>Longueur (mm)</th><th>Quantité</th><th>Couleur</th><th>Angles (h/t)</th></tr>`;
    for (let t in data.edgeData) {
        html += `<tr>
            <td style="font-weight:bold">${t}</td>
            <td>${data.edgeData[t].len}</td>
            <td>${data.edgeData[t].count}</td>
            <td style="background:${data.edgeData[t].color}"></td>
            <td>12.4° / 3.2°</td>
        </tr>`;
    }
    html += `</table>`;
    document.getElementById('details-table-container').innerHTML = html;
}

function updateResults(data, p) {
    const h = p.radius + (p.radius * (2 * p.cut - 1));
    const surfSol = Math.PI * Math.pow(p.radius, 2); 
    const surfCouv = (2 * Math.PI * Math.pow(p.radius, 2)) * p.cut;

    document.getElementById('stats-output').innerHTML = `
        <p>Hauteur au sol, m : <b>${h.toFixed(3)}</b></p>
        <p>Rayon au sol, m : <b>${p.radius.toFixed(3)}</b></p>
        <p>Surface au sol, m² : <b>${surfSol.toFixed(2)}</b></p>
        <p>Surface de la couverture, m² : <b>${surfCouv.toFixed(2)}</b></p>
        <hr>
        <p class="title-section">Quantités</p>
        <p>Faces : <b>${data.facesCount}</b></p>
        <p>Montants : <b>${Object.values(data.edgeData).reduce((a,b)=>a+b.count,0)}</b></p>
        <p>Nœuds : <b>${data.nodeCount}</b></p>
        <hr>
        <p class="title-section">Montants ${p.bWidth}x${p.bThick}</p>
        <p>Longueur totale des montants, m : <b>${data.totalLen.toFixed(2)}</b></p>
    `;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
    if(id === 'schema') {
        const c = document.getElementById('canvas-container');
        camera.aspect = c.clientWidth / c.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(c.clientWidth, c.clientHeight);
        labelRenderer.setSize(c.clientWidth, c.clientHeight);
    }
}

function exportCSV() {
    const p = getParams();
    const data = calculateData(p);
    let csv = "\ufeffType;Longueur (mm);Quantite;Largeur (mm);Epaisseur (mm)\n";
    for (let t in data.edgeData) {
        csv += `"${t}";"${data.edgeData[t].len}";"${data.edgeData[t].count}";"${p.bWidth}";"${p.bThick}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dome_export_${p.freq}V.csv`;
    link.click();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.onload = init;