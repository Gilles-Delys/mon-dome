/**
 * Gère les calculs géométriques et la structure des données du dôme.
 */
const Logic = {
    beamColors: {
        'A': '#e74c3c', 'B': '#2ecc71', 'C': '#3498db', 'D': '#f1c40f',
        'E': '#9b59b6', 'F': '#e67e22', 'G': '#1abc9c', 'H': '#34495e', 'I': '#7f8c8d'
    },

    getParams() {
        return {
            poly: document.getElementById('polyhedron').value,
            freq: parseInt(document.getElementById('frequency').value),
            cut: parseFloat(document.getElementById('sphere-cut').value),
            radius: parseFloat(document.getElementById('radius').value),
            bWidth: document.getElementById('beam-width').value,
            bThick: document.getElementById('beam-thickness').value
        };
    },

    calculateDomeData(p) {
        // Génération d'une géométrie temporaire pour extraire les données
        const geo = (p.poly === 'icosahedron') ? 
                    new THREE.IcosahedronGeometry(p.radius, p.freq) : 
                    new THREE.OctahedronGeometry(p.radius, p.freq);

        const pos = geo.attributes.position;
        const threshold = -p.radius * (2 * p.cut - 1);
        const edgesMap = new Map();
        let totalLen = 0;
        let facesCount = 0;

        for (let i = 0; i < pos.count; i += 3) {
            const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
            if (v1.y >= threshold) facesCount++;

            for (let j = 0; j < 3; j++) {
                const va = new THREE.Vector3().fromBufferAttribute(pos, i + j);
                const vb = new THREE.Vector3().fromBufferAttribute(pos, i + (j + 1) % 3);

                if (va.y >= threshold && vb.y >= threshold) {
                    const len = parseFloat(va.distanceTo(vb).toFixed(4));
                    const key = [va.toArray().map(v => v.toFixed(2)).join(','), vb.toArray().map(v => v.toFixed(2)).join(',')].sort().join('|');
                    if (!edgesMap.has(key)) {
                        edgesMap.set(key, { va, vb, len });
                        totalLen += len;
                    }
                }
            }
        }

        // Classement par longueur pour attribuer A, B, C...
        const uniqueLengths = Array.from(new Set(Array.from(edgesMap.values()).map(e => e.len))).sort((a, b) => b - a);
        const edgeData = {};

        edgesMap.forEach(edge => {
            const typeIdx = uniqueLengths.indexOf(edge.len);
            const type = String.fromCharCode(65 + typeIdx);
            if (!edgeData[type]) edgeData[type] = { len: (edge.len * 1000).toFixed(1), count: 0, color: this.beamColors[type], rawLen: edge.len };
            edgeData[type].count++;
            edge.type = type;
        });

        return { edgesMap, edgeData, totalLen, facesCount, nodeCount: Math.round(edgesMap.size * 0.6) };
    }
};

function exportCSV() {
    const p = Logic.getParams();
    const data = Logic.calculateDomeData(p);
    let csv = "\ufeffType;Longueur (mm);Quantite;Largeur (mm);Epaisseur (mm)\n";
    for (let t in data.edgeData) {
        csv += `"${t}";"${data.edgeData[t].len}";"${data.edgeData[t].count}";"${p.bWidth}";"${p.bThick}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_dome_${p.freq}V.csv`;
    link.click();
}