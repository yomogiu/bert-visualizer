// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('visualizer'), antialias: true });
renderer.setSize(800, 600);

// Add sample selector to the controls
const sampleSelector = document.createElement('div');
sampleSelector.innerHTML = `
    <label for="sampleSelect">Sample Text:</label>
    <select id="sampleSelect">
        <option value="1">The cat sat on the mat.</option>
        <option value="2">John told Mike that he passed the exam.</option>
        <option value="3">Paris is the capital of France.</option>
    </select>
`;
document.getElementById('controls').prepend(sampleSelector);

// Add orbit controls for rotation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
camera.position.z = 20;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Colors for visualization
const colors = {
    layer: 0x333333,
    token: 0x00ff00,
    attention: 0x0088ff
};

// Mock data for DistilBERT (6 layers, 4 attention heads per layer)
const mockData = {
    tokens: ["[CLS]", "Hello", "world", "[SEP]"],
    // Generate random attention values
    attention: Array(6).fill().map(() => 
        Array(4).fill().map(() => 
            Array(4).fill().map(() => 
                Array(4).fill().map(() => Math.random())
            )
        )
    )
};

// Create layers (6 planes)
const layers = [];
for (let i = 0; i < 6; i++) {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const material = new THREE.MeshBasicMaterial({ 
        color: colors.layer, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = i * 2 - 5; // Stack vertically, centered
    plane.rotation.x = Math.PI / 2; // Horizontal orientation
    scene.add(plane);
    layers.push(plane);
}

// Create token visualization group
const tokenGroup = new THREE.Group();
tokenGroup.position.y = -7;
scene.add(tokenGroup);

// Initial empty token display - will be populated when data is loaded
const tokenLabels = [];
const tokenMeshes = [];

// Add attention heads (small cubes in each layer)
const attentionHeads = [];
for (let layerIdx = 0; layerIdx < 6; layerIdx++) {
    const layerHeads = [];
    for (let headIdx = 0; headIdx < 4; headIdx++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: colors.attention,
            transparent: true,
            opacity: 0.8
        });
        const cube = new THREE.Mesh(geometry, material);
        // Position in a grid pattern
        cube.position.set(
            (headIdx % 2) * 3 - 1.5, 
            layerIdx * 2 - 5,  // Same height as layer
            Math.floor(headIdx / 2) * 3 - 1.5
        );
        scene.add(cube);
        layerHeads.push(cube);
    }
    attentionHeads.push(layerHeads);
}

// No output plane needed

// Add connections (arrows or lines)
function createConnection(startX, startY, startZ, endX, endY, endZ) {
    const points = [];
    points.push(new THREE.Vector3(startX, startY, startZ));
    points.push(new THREE.Vector3(endX, endY, endZ));
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

// Connection arrays
const connections = [];
const tokenConnections = [];

// Create connections between layer heads (simplified)
for (let layerIdx = 0; layerIdx < 5; layerIdx++) {
    for (let headIdx = 0; headIdx < 4; headIdx++) {
        connections.push(createConnection(
            attentionHeads[layerIdx][headIdx].position.x,
            attentionHeads[layerIdx][headIdx].position.y,
            attentionHeads[layerIdx][headIdx].position.z,
            attentionHeads[layerIdx + 1][headIdx].position.x,
            attentionHeads[layerIdx + 1][headIdx].position.y,
            attentionHeads[layerIdx + 1][headIdx].position.z
        ));
    }
}

// No need for output connections

// Add annotation
const annotation = document.createElement('div');
annotation.style.cssText = 'position:absolute;top:10px;left:10px;color:white;font-family:Arial;';
annotation.innerHTML = 'A = Softmax(QK<sup>T</sup> / √d)';
document.body.appendChild(annotation);

// Function to load data for a selected sample
async function loadSampleData(sampleId) {
    try {
        // Try to load real data first
        const response = await fetch(`data/sample_${sampleId}.json`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Loaded data for sample ${sampleId}`, data);
            
            // Update token visualization based on real tokens
            updateTokenVisualization(data.tokens);
            
            // If we have attention data, update that too
            if (data.attention && data.attention.length > 0) {
                updateAttentionVisualization(data.attention);
                updateAttentionHeatmap(data.attention);
            }
            
            // Update annotation with the sample text
            updateAnnotation(data.text);
            
            return;
        }
    } catch (e) {
        console.log("Could not load real data, using mock data instead", e);
    }
    
    // If we couldn't load real data, just update the annotation with the selected text
    const sampleTexts = [
        "The cat sat on the mat.",
        "John told Mike that he passed the exam.",
        "Paris is the capital of France."
    ];
    updateAnnotation(sampleTexts[sampleId - 1]);
    
    // Clear any existing heatmap since we don't have data
    const heatmapContainer = document.getElementById('heatmap-container');
    if (heatmapContainer) {
        heatmapContainer.innerHTML = `
            <div class="heatmap-title">Attention Matrix</div>
            <div style="margin-bottom: 10px;">No attention data available.</div>
            <div style="font-size: 12px; color: #aaa;">Run data-extractor.py to generate real model data.</div>
        `;
    }
}

// Function to update token visualization
function updateTokenVisualization(tokens) {
    console.log("Updating token visualization with:", tokens);
    
    // Clear existing token visualization
    while (tokenGroup.children.length > 0) {
        tokenGroup.remove(tokenGroup.children[0]);
    }
    tokenMeshes.length = 0;
    tokenLabels.length = 0;
    
    // Remove existing token connections
    tokenConnections.forEach(connection => {
        scene.remove(connection);
    });
    tokenConnections.length = 0;
    
    // Create new token visualization
    const tokenWidth = 0.8;
    const tokenSpacing = 0.2;
    const totalWidth = tokens.length * (tokenWidth + tokenSpacing);
    const startX = -totalWidth / 2;
    
    // Create a mesh for each token
    tokens.forEach((token, idx) => {
        // Create token geometry with distinct color based on token
        const tokenGeometry = new THREE.PlaneGeometry(tokenWidth, tokenWidth);
        
        // Generate color based on token hash (simple hash for demo)
        const tokenHash = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = (tokenHash % 360) / 360;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
        
        const tokenMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
        });
        
        const tokenMesh = new THREE.Mesh(tokenGeometry, tokenMaterial);
        tokenMesh.position.x = startX + idx * (tokenWidth + tokenSpacing) + tokenWidth/2;
        tokenMesh.position.z = 0;
        tokenMesh.rotation.x = Math.PI / 2;
        tokenGroup.add(tokenMesh);
        tokenMeshes.push(tokenMesh);
        
        // Create token label using HTML and CSS
        const tokenLabel = document.createElement('div');
        tokenLabel.style.cssText = `
            position: absolute;
            color: ${color.getStyle()};
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none;
            text-shadow: 0 0 3px #000;
            font-weight: bold;
            z-index: 10;
        `;
        tokenLabel.textContent = token.replace(/^##/, ''); // Remove ## prefix from wordpiece tokens
        document.body.appendChild(tokenLabel);
        tokenLabels.push(tokenLabel);
        
        // Create connections from this token to first layer heads
        attentionHeads[0].forEach((head, headIdx) => {
            const connection = createConnection(
                tokenMesh.position.x, tokenGroup.position.y, tokenMesh.position.z,
                head.position.x, head.position.y, head.position.z
            );
            tokenConnections.push(connection);
            connection.material.transparent = true;
            connection.material.opacity = 0.2; // Start with low opacity
        });
    });
    
    // Create background plane for all tokens
    const bgGeometry = new THREE.PlaneGeometry(totalWidth + tokenSpacing * 2, tokenWidth + tokenSpacing * 2);
    const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x222222,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.x = startX + totalWidth/2 - tokenWidth/2;
    bgMesh.position.z = -0.05;
    bgMesh.rotation.x = Math.PI / 2;
    tokenGroup.add(bgMesh);
}

// Function to update attention visualization
function updateAttentionVisualization(attentionData) {
    console.log("Updating attention visualization with data for", attentionData.length, "layers");
    
    // Update attention heads based on attention data
    attentionHeads.forEach((layerHeads, layerIdx) => {
        if (layerIdx < attentionData.length) {
            const layerData = attentionData[layerIdx];
            
            layerHeads.forEach((head, headIdx) => {
                if (headIdx < layerData[0].length) { // First batch, check head count
                    // Update head color based on attention pattern
                    const attentionValues = layerData[0][headIdx];
                    const avgAttention = attentionValues.flat().reduce((a, b) => a + b, 0) / attentionValues.flat().length;
                    
                    // Update color intensity based on attention value
                    const intensity = 0.5 + (avgAttention * 0.5);
                    head.material.color.setHSL(0.6, 0.8, intensity); // Blue-purple glow effect
                    
                    // Scale the head slightly based on attention importance
                    const scale = 0.8 + avgAttention * 0.7;
                    head.scale.set(scale, scale, scale);
                }
            });
        }
    });
    
    // Update token connections based on first layer attention
    if (attentionData.length > 0 && tokenMeshes.length > 0) {
        const firstLayerAttention = attentionData[0][0]; // First layer, first head
        
        // Update token connection opacities based on attention
        tokenConnections.forEach((connection, idx) => {
            const tokenIdx = Math.floor(idx / 4); // Each token has 4 connections (to 4 heads)
            const headIdx = idx % 4;
            
            if (tokenIdx < tokenMeshes.length && 
                headIdx < attentionHeads[0].length && 
                tokenIdx < firstLayerAttention[headIdx].length) {
                
                // Get attention value from token to this head
                const attentionValue = firstLayerAttention[headIdx][tokenIdx];
                
                // Update connection opacity based on attention value
                connection.material.opacity = 0.1 + attentionValue * 0.9;
                
                // Also update connection color intensity
                const intensity = 0.3 + attentionValue * 0.7;
                connection.material.color.setRGB(intensity, intensity, intensity);
            }
        });
    }
    
    // Create or update a heatmap visualization for the currently selected layer and head
    updateAttentionHeatmap(attentionData);
}

// Create a 2D heatmap visualization in the DOM
function updateAttentionHeatmap(attentionData) {
    // Get currently selected layer and head
    const layerIndex = parseInt(document.getElementById('layerSlider').value);
    const headValue = document.getElementById('headMenu').value;
    const headIndex = headValue === 'all' ? 0 : parseInt(headValue);
    
    // If we don't have attention data or tokens, exit
    if (!attentionData || attentionData.length === 0 || tokenMeshes.length === 0) {
        return;
    }
    
    // Get attention weights for selected layer/head
    if (layerIndex >= attentionData.length) {
        return;
    }
    
    const layerData = attentionData[layerIndex];
    
    if (headIndex >= layerData[0].length) {
        return;
    }
    
    const headData = layerData[0][headIndex];
    
    // Find or create the heatmap container
    let heatmapContainer = document.getElementById('heatmap-container');
    if (!heatmapContainer) {
        heatmapContainer = document.createElement('div');
        heatmapContainer.id = 'heatmap-container';
        heatmapContainer.className = 'heatmap-container';
        document.body.appendChild(heatmapContainer);
        
        // Add some styles if they don't exist yet
        if (!document.getElementById('heatmap-styles')) {
            const style = document.createElement('style');
            style.id = 'heatmap-styles';
            style.textContent = `
                .heatmap-container {
                    position: absolute;
                    bottom: 20px;
                    left: calc(25% + 40px);
                    background: rgba(0,0,0,0.8);
                    border: 1px solid #333;
                    border-radius: 5px;
                    padding: 15px;
                    color: white;
                    font-family: Arial, sans-serif;
                    z-index: 100;
                    box-shadow: 0 0 20px rgba(0, 0, 255, 0.2);
                    max-width: 50%;
                }
                .heatmap-title {
                    font-size: 14px;
                    margin: 0 0 10px 0;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #444;
                    color: #4dabf7;
                }
                .heatmap-grid {
                    display: grid;
                    grid-gap: 1px;
                    background: #222;
                    padding: 1px;
                    margin-top: 10px;
                }
                .heatmap-cell {
                    width: 25px;
                    height: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                    text-shadow: 0 0 2px black;
                    position: relative;
                }
                .heatmap-row-label, .heatmap-col-label {
                    font-size: 11px;
                    text-align: center;
                    color: #aaa;
                    padding: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 70px;
                }
                .heatmap-row-label {
                    text-align: right;
                }
                .heatmap-col-label {
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                    height: 60px;
                    text-align: left;
                }
                .heatmap-value {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    font-size: 8px;
                    opacity: 0.8;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Prepare heatmap HTML content
    const size = Math.min(tokenMeshes.length, headData.length);
    let heatmapHTML = `
        <div class="heatmap-title">Attention Matrix - Layer ${layerIndex+1}, Head ${headIndex+1}</div>
        <div style="margin-bottom: 10px;">From token (row) → to token (column)</div>
    `;
    
    // Create a grid with token labels on columns and rows
    let gridHTML = '<div class="heatmap-grid" style="grid-template-columns: auto repeat(' + size + ', 30px);">';
    
    // Empty top-left cell
    gridHTML += '<div></div>';
    
    // Column headers (token labels)
    for (let j = 0; j < size; j++) {
        let tokenText = '';
        if (j < tokenLabels.length) {
            tokenText = tokenLabels[j].textContent || `T${j+1}`;
        }
        gridHTML += `<div class="heatmap-col-label" title="${tokenText}">${tokenText}</div>`;
    }
    
    // Rows with row headers and cells
    for (let i = 0; i < size; i++) {
        // Row header (token label)
        let tokenText = '';
        if (i < tokenLabels.length) {
            tokenText = tokenLabels[i].textContent || `T${i+1}`;
        }
        gridHTML += `<div class="heatmap-row-label" title="${tokenText}">${tokenText}</div>`;
        
        // Data cells
        for (let j = 0; j < size; j++) {
            let attentionValue = 0;
            if (i < headData.length && j < headData[i].length) {
                attentionValue = headData[i][j];
            }
            
            // Calculate color based on value (blue to red gradient)
            const hue = (1 - attentionValue) * 240; // 240 (blue) to 0 (red)
            const saturation = 80;
            const lightness = 50;
            
            gridHTML += `
                <div class="heatmap-cell" 
                     style="background-color: hsl(${hue}, ${saturation}%, ${lightness}%);"
                     title="Attention: ${attentionValue.toFixed(3)}">
                </div>
            `;
        }
    }
    
    gridHTML += '</div>';
    heatmapHTML += gridHTML;
    
    // Update the container
    heatmapContainer.innerHTML = heatmapHTML;
}

// Function to update annotation and token info
function updateAnnotation(text) {
    // Update annotation with formula
    annotation.innerHTML = `
        <div style="background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
            <div style="font-size: 16px; margin-bottom: 10px;">"${text}"</div>
            <div>A = Softmax(QK<sup>T</sup> / √d)</div>
        </div>
    `;
    
    // Also update token info box
    const tokenInfo = document.getElementById('token-info');
    if (!tokenInfo) {
        // Create token info box if it doesn't exist
        const infoBox = document.createElement('div');
        infoBox.id = 'token-info';
        document.body.appendChild(infoBox);
    }
    
    // Update content
    const tokenInfoContent = `
        <h3>Sample Text Tokenization</h3>
        <p>"${text}"</p>
        <div class="token-details">
            ${tokenMeshes.map((_, idx) => 
                `<div class="token-detail">
                    <span class="token-id">Token ${idx+1}:</span> 
                    <span class="token-value">${tokenLabels[idx]?.textContent || ''}</span>
                </div>`
            ).join('')}
        </div>
        <div class="model-info">
            <div>DistilBERT: 6 layers, 12 heads</div>
        </div>
    `;
    
    document.getElementById('token-info').innerHTML = tokenInfoContent;
}

// Update token label positions in each frame
function updateTokenLabelPositions() {
    if (tokenMeshes.length !== tokenLabels.length) return;
    
    tokenMeshes.forEach((mesh, idx) => {
        if (tokenLabels[idx]) {
            // Project 3D position to 2D screen coordinates
            const position = new THREE.Vector3();
            position.copy(mesh.position);
            position.y = tokenGroup.position.y - 0.6; // Position below the token
            
            // Convert to world position
            tokenGroup.localToWorld(position);
            
            // Project to screen space
            position.project(camera);
            
            // Convert to DOM coordinates
            const x = (position.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
            const y = (-(position.y * 0.5) + 0.5) * renderer.domElement.clientHeight + 5;
            
            // Update label position
            tokenLabels[idx].style.transform = `translate(-50%, 0)`;
            tokenLabels[idx].style.left = `${x}px`;
            tokenLabels[idx].style.top = `${y}px`;
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateTokenLabelPositions();
    renderer.render(scene, camera);
}
animate();

// Interactive controls - layer slider
const layerSlider = document.getElementById('layerSlider');
layerSlider.addEventListener('input', (e) => {
    const layerIndex = parseInt(e.target.value);
    
    // Update layer display
    layers.forEach((layer, idx) => {
        layer.material.opacity = idx === layerIndex ? 0.9 : 0.3;
    });
    
    // Update attention heads in the selected layer
    attentionHeads.forEach((layerHeads, idx) => {
        layerHeads.forEach(head => {
            head.material.opacity = idx === layerIndex ? 1.0 : 0.3;
        });
    });
    
    // Update the layer number text
    const layerText = document.querySelector('.control-group .control-value');
    if (layerText) {
        layerText.textContent = `Layer ${layerIndex + 1}`;
    }
    
    // Update attention heatmap with current layer
    updateAttentionHeatmapForCurrentSelection();
});

// Interactive controls - head selection
const headMenu = document.getElementById('headMenu');
headMenu.addEventListener('change', (e) => {
    const selectedHead = e.target.value;
    
    attentionHeads.forEach(layerHeads => {
        layerHeads.forEach((head, idx) => {
            if (selectedHead === 'all') {
                head.material.opacity = 0.8;
                head.material.color.set(colors.attention);
            } else {
                const headIndex = parseInt(selectedHead);
                head.material.opacity = idx === headIndex ? 1.0 : 0.2;
                head.material.color.set(idx === headIndex ? 0xff0000 : colors.attention);
            }
        });
    });
    
    // Update attention heatmap with current head
    updateAttentionHeatmapForCurrentSelection();
});

// Shared function to update heatmap based on current layer/head selection
function updateAttentionHeatmapForCurrentSelection() {
    try {
        // Get the active sample ID
        const sampleId = document.getElementById('sampleSelect').value;
        
        // Try to load data for this sample if it's not already loaded
        fetch(`data/sample_${sampleId}.json`)
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('No data available');
            })
            .then(data => {
                if (data.attention && data.attention.length > 0) {
                    updateAttentionHeatmap(data.attention);
                }
            })
            .catch(err => {
                console.log('Could not update heatmap with real data:', err);
            });
    } catch (e) {
        console.log('Error updating heatmap:', e);
    }
}

// Interactive controls - sample selection
const sampleSelect = document.getElementById('sampleSelect');
sampleSelect.addEventListener('change', (e) => {
    const sampleId = e.target.value;
    loadSampleData(sampleId);
});

// Load the first sample by default
loadSampleData(1);