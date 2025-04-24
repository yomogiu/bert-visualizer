from transformers import DistilBertTokenizer, DistilBertModel
import torch
import json
import os

# Load pre-trained model and tokenizer
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
model = DistilBertModel.from_pretrained('distilbert-base-uncased')

# Sample texts
sample_texts = [
    "The cat sat on the mat.",
    "John told Mike that he passed the exam.",
    "Paris is the capital of France."
]

# Create output directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Process each sample text
for i, text in enumerate(sample_texts):
    # Create unique filename for this sample
    filename = f"data/sample_{i+1}.json"
    
    # Tokenize the text
    inputs = tokenizer(text, return_tensors="pt")
    
    # Get model outputs with attention weights
    outputs = model(**inputs, output_attentions=True)
    
    # Extract tokens
    tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
    
    # Extract attention weights (6 layers, each with multiple attention heads)
    attention = outputs.attentions
    
    # Convert tensor data to lists for JSON serialization
    attention_data = []
    for layer_attn in attention:
        # Convert this layer's attention tensor to list
        layer_data = layer_attn.detach().numpy().tolist()
        attention_data.append(layer_data)
    
    # Create data dictionary
    data = {
        'text': text,
        'tokens': tokens,
        'attention': attention_data
    }
    
    # Save to JSON file
    with open(filename, 'w') as f:
        json.dump(data, f)
    
    print(f"Sample {i+1} data exported to {filename}")
    print(f"Text: {text}")
    print(f"Tokens: {tokens}")
    print(f"Model has {len(attention)} layers")
    print(f"Each layer has {attention[0].shape[1]} attention heads")
    print("---")

# Also create a combined file with metadata about all samples
combined_data = {
    'samples': [
        {
            'id': i+1,
            'text': text,
            'file': f"sample_{i+1}.json"
        } for i, text in enumerate(sample_texts)
    ]
}

with open('data/index.json', 'w') as f:
    json.dump(combined_data, f, indent=2)

print("Combined index exported to data/index.json")