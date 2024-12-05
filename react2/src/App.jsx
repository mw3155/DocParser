import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Input, Button, VStack, Text, useToast } from '@chakra-ui/react'
import Parser from 'web-tree-sitter'
import { Octokit } from 'octokit'

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [parser, setParser] = useState(null)
  const toast = useToast()

  useEffect(() => {
    async function initParser() {
      await Parser.init()
      const parser = new Parser()
      // Load JavaScript grammar as an example
      const Lang = await Parser.Language.load('/tree-sitter-javascript.wasm')
      parser.setLanguage(Lang)
      setParser(parser)
    }
    initParser()
  }, [])

  const extractFunctions = (tree) => {
    const functions = []
    const cursor = tree.walk()

    const visitNode = () => {
      const node = cursor.currentNode()

      if (node.type === 'function_declaration' ||
        node.type === 'method_definition' ||
        node.type === 'arrow_function') {
        functions.push(node.text)
      }

      if (cursor.gotoFirstChild()) {
        do {
          visitNode()
        } while (cursor.gotoNextSibling())
        cursor.gotoParent()
      }
    }

    visitNode()
    return functions
  }

  const handleSubmit = async () => {
    if (!repoUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a GitHub repository URL',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setLoading(true)
    try {
      // Extract owner and repo from URL
      const urlParts = repoUrl.split('/')
      const owner = urlParts[urlParts.length - 2]
      const repo = urlParts[urlParts.length - 1]

      const octokit = new Octokit()

      // Get repository contents
      const { data: files } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      })

      const jsFiles = files.filter(file =>
        file.type === 'file' &&
        (file.name.endsWith('.js') || file.name.endsWith('.jsx'))
      )

      let allFunctions = []

      for (const file of jsFiles) {
        const { data: content } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
        })

        const fileContent = atob(content.content)
        const tree = parser.parse(fileContent)
        const functions = extractFunctions(tree)

        if (functions.length > 0) {
          allFunctions.push(`// File: ${file.path}`)
          allFunctions.push(...functions)
          allFunctions.push('\n')
        }
      }

      // Create and download text file
      const blob = new Blob([allFunctions.join('\n')], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${repo}-functions.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Success',
        description: 'Functions extracted and downloaded successfully',
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ChakraProvider>
      <Box minH="100vh" p={8} bg="gray.50">
        <VStack spacing={8} maxW="container.md" mx="auto">
          <Text fontSize="2xl" fontWeight="bold">
            GitHub Repository Function Extractor
          </Text>
          <Text>
            Enter a GitHub repository URL to extract all function definitions
          </Text>
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            size="lg"
          />
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Extracting..."
            size="lg"
          >
            Extract Functions
          </Button>
        </VStack>
      </Box>
    </ChakraProvider>
  )
}

export default App
