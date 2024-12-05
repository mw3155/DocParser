import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Input, Button, VStack, Text, useToast } from '@chakra-ui/react'
import Parser from 'web-tree-sitter'
import { Octokit } from 'octokit'

function App() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/mw3155/gift-picker')
  const [loading, setLoading] = useState(false)
  const [parser, setParser] = useState(null)
  const toast = useToast()

  useEffect(() => {
    async function initParser() {
      try {
        await Parser.init()
        console.log('initialized parser')
        const parser = new Parser()
        const Lang = await Parser.Language.load('/tree-sitter-javascript.wasm')
        console.log('loaded lang', Lang)
        parser.setLanguage(Lang)
        setParser(parser)
      } catch (error) {
        console.error('Parser initialization failed:', error)
        toast({
          title: 'Error',
          description: 'Failed to initialize code parser',
          status: 'error',
          duration: 3000,
        })
      }
    }
    initParser()
  }, [])

  const extractFunctions = (tree) => {
    const functions = []
    const cursor = tree.walk()
    console.log('walking tree')

    const visitNode = () => {
      const node = cursor.currentNode()
      console.log('node', node)

      if (node.type === 'function_declaration' ||
        node.type === 'method_definition' ||
        node.type === 'arrow_function') {
        console.log('found function', node.text)
        functions.push(node.text)
      }

      if (cursor.gotoFirstChild()) {
        console.log('going to first child')
        do {
          console.log('visiting child')
          visitNode()
        } while (cursor.gotoNextSibling())
        console.log('going to parent')
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
      console.log('owner', owner)
      console.log('repo', repo)

      const octokit = new Octokit()

      // Get repository contents
      const { data: files } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      })
      console.log('files', files)

      const jsFiles = files.filter(file =>
        file.type === 'file' &&
        (file.name.endsWith('.js') || file.name.endsWith('.jsx'))
      )

      let allFunctions = []

      for (const file of jsFiles) {
        console.log('file', file)
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
