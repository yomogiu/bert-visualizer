# DistilBERT Model Visualizer

A 3D visualization of the DistilBERT model architecture using Three.js, displaying tokenization and attention mechanisms in transformer models.

## Features

- Interactive 3D representation of DistilBERT's layers and attention heads
- Visualization of token embeddings with individual token highlighting
- Real-time display of attention patterns between tokens
- Heatmap visualization showing attention weight matrices
- Interactive controls to explore different samples and model components
- Rotatable view to examine the model from multiple angles

## Getting Started

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Use mouse to rotate the visualization, and scroll wheel to zoom
4. Use the controls to:
   - Select different sample texts
   - Focus on specific layers
   - Highlight particular attention heads

## Generating Real Model Data

The visualization can use actual DistilBERT model data. To generate this data:

1. Install required Python packages:
   ```
   pip install transformers torch
   ```

2. Run the data extractor script:
   ```
   python data-extractor.py
   ```

3. This will generate data files in the `data/` directory for three sample sentences:
   - "The cat sat on the mat."
   - "John told Mike that he passed the exam."
   - "Paris is the capital of France."

4. The visualizer will automatically load these data files when selecting different samples from the dropdown menu.

## Implementation Details

- **Tokens**: Displayed at the bottom with unique colors based on token identity
- **Layers**: Represented as horizontal planes, with 6 layers (DistilBERT's architecture)
- **Attention Heads**: Shown as interactive cubes within each layer
- **Connections**: Lines showing token relationships and attention flow
- **Heatmaps**: Visual representation of attention weight matrices
- **Token Info**: Panel displaying tokenized text information

## How It Works

1. Text samples are tokenized using the DistilBERT tokenizer
2. Attention patterns are extracted from the model for each layer and head
3. The 3D visualization maps these patterns to visual elements:
   - Token importance is represented by color and connection opacity
   - Attention head activity is shown through scaling and color intensity
   - Attention matrices are displayed as color-coded heatmaps

## Technologies Used

- **Three.js** for 3D visualization and WebGL rendering
- **JavaScript** for interactive elements and real-time updates
- **HTML/CSS** for interface and styling
- **Hugging Face Transformers** for model data extraction