const Logic = {
    colors: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d', '#d35400'],

    getData() {
        const p = {
            poly: document.getElementById('polyhedron').value,
            freq: parseInt(document.getElementById('frequency').value),
            cut: parseFloat(document.getElementById('sphere-cut').value),
            radius: parseFloat(document.getElementById('radius').value),
            width: document.getElementById('beam-width').value,
            thick: document.getElementById('beam-thickness').value
        };

        const geo = (p.poly === 'icosahedron') ? 
            new THREE.IcosahedronGeometry(p.radius, p.freq) : 
            new THREE.OctahedronGeometry(p.radius, p.freq);

        const pos = geo.attributes.position;
        const threshold = -p.radius * (2 * p.cut - 1);
        const edges = [];
        const edgeMap = new Map();

        // Filtrage et dédoublonnage des arêtes
        for (let i = 0; i < pos.count; i += 3) {
            for (let j = 0; j < 3; j++) {
                const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + j);
                const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + (j + 1) % 3);

                if (v1.y >= threshold && v2.y >= threshold) {
                    const key = [v1.toArray().map(v=>v.toFixed(3)).join(','), v2.toArray().map(v=>v.toFixed(3)).join(',')].sort().join('|');
                    if (!edgeMap.has(key)) {
                        const len = v1.distanceTo(v2);
                        edgeMap.set(key, { v1, v2, len });
                    }
                }
            }
        }

        // Tri par longueur pour attribuer les types A, B, C...
        const uniqueLens = Array.from(new Set(Array.from(edgeMap.values()).map(e => e.len.toFixed(4)))).sort((a, b) => b - a);
        const types = {};
        let totalLen = 0;

        edgeMap.forEach(edge => {
            const typeIdx = uniqueLens.indexOf(edge.len.toFixed(4));
            const typeLabel = String.fromCharCode(65 + typeIdx);
            edge.type = typeLabel;
            edge.color = this.colors[typeIdx] || '#000';
            
            if (!types[typeLabel]) types[typeLabel] = { len: (edge.len * 1000).toFixed(2), count: 0, color: edge.color };
            types[typeLabel].count++;
            totalLen += edge.len;
        });

        return { params: p, edges: Array.from(edgeMap.values()), types, totalLen, faceCount: Math.round(edgeMap.size / 1.5) };
    }
};

function exportCSV() {
    const data = Logic.getData();
    let csv = "\ufeffType;Longueur (mm);Quantite;Largeur (mm);Epaisseur (mm)\n";
    for (let t in data.types) {
        csv += `"${t}";"${data.types[t].len}";"${data.types[t].count}";"${data.params.width}";"${data.params.thick}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dome_export_${data.params.freq}V.csv`;
    link.click();
}