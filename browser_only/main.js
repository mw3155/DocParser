import Parser from 'web-tree-sitter';

const fetchRepoButton = document.getElementById("fetch-repo");
const repoUrlInput = document.getElementById("repo-url");
const outputDiv = document.getElementById("output");

async function fetchRepoContents(owner, repo, path = '') {
  console.info(`Fetching contents of ${owner}/${repo}/${path}`);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  
  // Recursively fetch contents of directories
  const files = [];
  for (const item of data) {
    if (item.type === 'file') {
      const content = await fetch(item.download_url).then(r => r.text());
      files.push({ path: item.path, content });
    } else if (item.type === 'dir') {
      files.push(...await fetchRepoContents(owner, repo, item.path));
    }
  }
  return files;
}

async function parseFiles(files) {
  console.info(`Initializing parser and loading language`);
  
  // Check if the .wasm file is accessible
  try {
    const wasmResponse = await fetch('/public/tree-sitter-python.wasm');
    if (!wasmResponse.ok) {
      throw new Error(`Failed to fetch /public/tree-sitter-python.wasm: ${wasmResponse.statusText}`);
    }
    console.info(`.wasm file is accessible`);
  } catch (error) {
    console.error(`Error fetching .wasm file:`, error);
    alert(`Error fetching .wasm file: ${error.message}`);
    return;
  }

  await Parser.init();
  const parser = new Parser();
  console.info(`Loading Python language`);
  const Lang = await Parser.Language.load('/public/tree-sitter-python.wasm');
  console.info(`Language loaded: ${Lang.version}`);
  parser.setLanguage(Lang);

  const definitions = [];
  for (const file of files) {
    if (!file.path.endsWith('.py')) continue;
    try {
      console.info(`Parsing file: ${file.path}`);
      const tree = parser.parse(file.content);
      definitions.push(...extractDefinitions(tree.rootNode, file.path));
    } catch (err) {
      console.warn(`Failed to parse ${file.path}:`, err);
    }
  }
  return definitions;
}

// Update event listener:
fetchRepoButton.addEventListener("click", async () => {
  const repoUrl = repoUrlInput.value.trim();
  if (!repoUrl) {
    alert("Please enter a valid GitHub repository URL.");
    return;
  }

  try {
    console.info(`Fetching repository: ${repoUrl}`);
    fetchRepoButton.disabled = true;
    outputDiv.innerHTML = "<p>Fetching repository...</p>";
    
    const [owner, repo] = repoUrl.split('/').slice(-2);
    const files = await fetchRepoContents(owner, repo);
    
    outputDiv.innerHTML = "<p>Parsing files...</p>";
    const definitions = await parseFiles(files);
    displayDefinitions(definitions);
  } catch (error) {
    console.error(error);
    outputDiv.innerHTML = `<p>Error: ${error.message}</p>`;
  }
  fetchRepoButton.disabled = false;
});