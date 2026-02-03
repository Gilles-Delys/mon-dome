// Navigation entre onglets
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'trent') init3D(); // Lance la 3D si l'onglet Trent est choisi
}

function lancerCalculs() {
    const V = parseInt(document.getElementById('freqV').value);
    const R = parseFloat(document.getElementById('rayon').value);
    
    // Simulation de calculs géodésiques (Facteurs de corde simplifiés pour l'exemple)
    // En mode Diamond, ces facteurs sont calculés par l'algorithme de Kruschke
    const struts = [
        { type: 'A', facteur: 0.3486, couleur: '#FF5733', qte: 30 },
        { type: 'B', facteur: 0.4035, couleur: '#33FF57', qte: 40 },
        { type: 'C', facteur: 0.4124, couleur: '#3357FF', qte: 50 }
    ];

    let html = `<table><tr><th>Type</th><th>Longueur (cm)</th><th>Quantité</th><th>Angle de coupe</th></tr>`;
    
    struts.forEach(s => {
        const longueur = (s.facteur * R * 100).toFixed(2);
        const angle = (Math.acos(s.facteur / 2) * (180 / Math.PI)).toFixed(2);
        html += `<tr>
            <td style="color:${s.couleur}; font-weight:bold">Type ${s.type}</td>
            <td>${longueur}</td>
            <td>${s.qte}</td>
            <td>${angle}°</td>
        </tr>`;
    });
    html += `</table>`;
    
    document.getElementById('resultatsCalculs').innerHTML = html;
    alert("Calculs terminés. Consultez l'onglet Schéma.");
}