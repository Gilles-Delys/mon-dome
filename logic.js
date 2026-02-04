const Logic = {
    colors: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d'],

    calculate() {
        const p = {
            poly: document.getElementById('polyhedron').value,
            freq: parseInt(document.getElementById('frequency').value),
            cut: parseFloat(document.getElementById('sphere-cut').value),
            radius: parseFloat(document.getElementById('radius').value),
            width: parseFloat(document.getElementById('beam-width').value),
            thick: parseFloat(document.getElementById('beam-thickness').value)
        };

        // Génération géométrie Classe I (Standard Three.js)
        const geo = (p.poly === 'icosahedron') ? 
            new THREE.IcosahedronGeometry(p.radius, p.freq) : 
            new THREE.OctahedronGeometry(p.radius, p.freq);

        const pos = geo.attributes.position;
        const threshold = -p.radius * (2 * p.cut - 1);
        const edges = new Map();

        // Analyse des segments
        for (let i = 0; i < pos.count; i += 3) {
            for (let j = 0; j < 3; j++) {
                const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + j);
                const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + (j + 1) % 3);

                if (v1.y >= threshold - 0.01 && v2.y >= threshold - 0.01) {
                    const key = [v1.toArray().map(v=>v.toFixed(3)).join(','), v2.toArray().map(v=>v.toFixed(3)).join(',')].sort().join('|');
                    if (!edges.has(key)) {
                        edges.set(key, { v1, v2, len: v1.distanceTo(v2) });
                    }
                }
            }
        }

        // Nomenclature A, B, C...
        const uniqueLens = Array.from(new Set(Array.from(edges.values()).map(e => e.len.toFixed(4)))).sort((a,b)=>b-a);
        const types = {};
        let totalLen = 0;

        edges.forEach(edge => {
            const idx = uniqueLens.indexOf(edge.len.toFixed(4));
            const label = String.fromCharCode(65 + idx);
            edge.label = label;
            edge.color = this.colors[idx % this.colors.length];
            
            if (!types[label]) types[label] = { len: (edge.len * 1000).toFixed(1), count: 0, color: edge.color };
            types[label].count++;
            totalLen += edge.len;
        });

        return { p, edges: Array.from(edges.values()), types, totalLen, faceCount: Math.round(edges.size / 1.5) };
    }
};

function exportCSV() {
    const data = Logic.calculate();
    let csv = "\ufeffType;Longueur (mm);Quantite;Largeur;Epaisseur\n";
    for(let t in data.types) {
        csv += `"${t}";"${data.types[t].len}";"${data.types[t].count}";"${data.p.width}";"${data.p.thick}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "export_dome.csv";
    a.click();
}