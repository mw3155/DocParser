import { useState, useEffect } from 'react'
import './App.css'
import Parser from 'web-tree-sitter'

function App() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/mw3155/gift-picker')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parser, setParser] = useState(null)

  useEffect(() => {
    async function initParser() {
      try {
        await Parser.init({
          locateFile(scriptName) {
            return `/${scriptName}`
          }
        })
        
        const parser = new Parser()
        
        // Load JavaScript language
        const jsLang = await Parser.Language.load('/tree-sitter/tree-sitter-javascript.wasm')
        parser.setLanguage(jsLang)
        
        setParser(parser)
      } catch (error) {
        console.error('Failed to initialize parser:', error)
      }
    }
    initParser()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!parser) {
      setOutput('Parser not initialized')
      return
    }
    setLoading(true)
    
    try {
      // Extract owner and repo from GitHub URL
      const [, , , owner, repo] = repoUrl.split('/')
      
      // Fetch repo content through GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`)
      const data = await response.json()
      
      let functions = []
      
      // Filter for code files and parse them
      const codeFiles = data.tree.filter(file => 
        file.path.endsWith('.js') || 
        file.path.endsWith('.jsx') ||
        file.path.endsWith('.ts') ||
        file.path.endsWith('.tsx')
      )

      for (const file of codeFiles) {
        const content = await fetch(file.url).then(r => r.json())
        const tree = parser.parse(content)
        // Now you can traverse the syntax tree
        const functionNodes = tree.rootNode.descendantsOfType('function_declaration')
        functions.push(`// From ${file.path}\n${functionNodes.map(node => node.text).join('\n')}`)
      }

      setOutput(functions.join('\n\n'))
    } catch (error) {
      setOutput('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>GitHub Repository Function Scanner</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="Enter GitHub repository URL"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Repository'}
        </button>
      </form>
      {output && (
        <div className="output">
          <h2>Functions Found:</h2>
          <pre>{output}</pre>
          <button onClick={() => {
            const blob = new Blob([output], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'functions.txt'
            a.click()
          }}>
            Download as TXT
          </button>
        </div>
      )}
    </div>
  )
}

export default App
