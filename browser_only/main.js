import JSZip from 'jszip';
import { Parser } from 'web-tree-sitter';

const fetchRepoButton = document.getElementById("fetch-repo");
const repoUrlInput = document.getElementById("repo-url");
const outputDiv = document.getElementById("output");

fetchRepoButton.addEventListener("click", async () => {
  const repoUrl = repoUrlInput.value.trim();
  if (!repoUrl) {
    alert("Please enter a valid GitHub repository zip URL.");
    return;
  }

  try {
    fetchRepoButton.disabled = true;
    outputDiv.innerHTML = "<p>Fetching repository...</p>";
    const files = await fetchRepo(repoUrl);
    
    outputDiv.innerHTML = "<p>Initializing Tree-sitter...</p>";
    const definitions = await parseFiles(files);
    displayDefinitions(definitions);
  } catch (error) {
    console.error(error);
    outputDiv.innerHTML = `<p>Error: ${error.message}</p>`;
  }
    fetchRepoButton.disabled = false;


});

async function fetchRepo(url) {
  // Convert GitHub repo URL to zip download URL
  const zipUrl = url.replace(/\/?$/, '/archive/refs/heads/main.zip');
  
  // Use cors-anywhere as proxy
  const corsProxy = 'https://cors-anywhere.herokuapp.com/';
  const proxyUrl = corsProxy + zipUrl;

  try {
    const response = await fetch(proxyUrl, {
      headers: {
        'Origin': window.location.origin
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const zip = new JSZip();
    const contents = await zip.loadAsync(blob);
    const files = [];

    contents.forEach((relativePath, file) => {
      if (!file.dir) {
        files.push(file.async("string").then(content => ({
          path: relativePath,
          content
        })));
      }
    });

    return Promise.all(files);
  } catch (error) {
    throw new Error(`Failed to fetch repository: ${error.message}`);
  }
}

async function parseFiles(files) {
  try {
    await Parser.init();
    const parser = new Parser();
    
    // Update path to match your server's structure
    const Lang = await Parser.Language.load("./tree-sitter-python.wasm");
    parser.setLanguage(Lang);

    const definitions = [];
    for (const file of files) {
      if (!file.path.endsWith('.py')) continue; // Only parse Python files
      try {
        const tree = parser.parse(file.content);
        definitions.push(...extractDefinitions(tree.rootNode, file.path));
      } catch (err) {
        console.warn(`Failed to parse ${file.path}:`, err);
      }
    }
    return definitions;
  } catch (error) {
    throw new Error(`Parser initialization failed: ${error.message}`);
  }
}

function extractDefinitions(rootNode, filePath) {
  const definitions = [];
  rootNode.walk((node) => {
    if (node.type === 'function_definition' || node.type === 'class_definition') {
      definitions.push({
        type: node.type,
        name: node.childForFieldName('name')?.text || 'unknown',
        file: filePath,
        text: node.text
      });
    }
    return true;
  });
  return definitions;
}

function displayDefinitions(definitions) {
  if (definitions.length === 0) {
    outputDiv.innerHTML = "<p>No Python definitions found.</p>";
    return;
  }

  const ul = document.createElement("ul");
  definitions.forEach((def) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${def.type === 'function_definition' ? 'Function' : 'Class'}:</strong> 
      ${def.name}
      <br>
      <small>File: ${def.file}</small>
      <pre><code>${def.text}</code></pre>
    `;
    ul.appendChild(li);
  });
  
  outputDiv.innerHTML = "<h3>Extracted Definitions:</h3>";
  outputDiv.appendChild(ul);
}