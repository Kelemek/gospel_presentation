// GitHub API Service for Gospel Presentation Data
import { GospelSection } from './types'

interface GitHubApiResponse {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  content: string
  encoding: string
}

interface GitHubUpdateResponse {
  content: {
    name: string
    path: string
    sha: string
    size: number
    url: string
    html_url: string
    git_url: string
    download_url: string
    type: string
  }
  commit: {
    sha: string
    node_id: string
    url: string
    html_url: string
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    tree: {
      sha: string
      url: string
    }
    message: string
    parents: Array<{
      sha: string
      url: string
      html_url: string
    }>
  }
}

class GitHubDataService {
  private readonly owner = 'Kelemek'
  private readonly repo = 'gospel_presentation'
  private readonly filePath = 'data/gospel-presentation.json'
  private readonly apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.filePath}`
  private readonly token: string

  constructor() {
    this.token = process.env.GITHUB_TOKEN || ''
    if (!this.token) {
      console.warn('GITHUB_TOKEN environment variable is not set. GitHub API functionality will be limited.')
    }
  }

  private getHeaders() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Gospel-Presentation-Admin/1.0'
    }
  }

  async getData(): Promise<GospelSection[]> {
    if (!this.token) {
      // Fallback to local JSON file if no GitHub token
      console.log('No GitHub token available, using fallback data')
      const fs = await import('fs')
      const path = await import('path')
      
      try {
        const dataPath = path.join(process.cwd(), '../data/gospel-presentation.json')
        const content = fs.readFileSync(dataPath, 'utf8')
        return JSON.parse(content)
      } catch (error) {
        console.error('Error reading local fallback data:', error)
        throw new Error('Failed to load gospel presentation data. GitHub token required for full functionality.')
      }
    }

    try {
      const response = await fetch(this.apiUrl, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const fileData: GitHubApiResponse = await response.json()
      
      // Decode base64 content
      const content = Buffer.from(fileData.content, 'base64').toString('utf8')
      const gospelData: GospelSection[] = JSON.parse(content)
      
      return gospelData
    } catch (error) {
      console.error('Error fetching data from GitHub:', error)
      throw new Error('Failed to fetch gospel presentation data')
    }
  }

  async saveData(data: GospelSection[], commitMessage: string = 'Update gospel presentation data via admin interface'): Promise<void> {
    if (!this.token) {
      throw new Error('GitHub token is required for saving data. Please set GITHUB_TOKEN environment variable.')
    }

    try {
      // First, get the current file to get its SHA
      const currentFileResponse = await fetch(this.apiUrl, {
        headers: this.getHeaders()
      })

      if (!currentFileResponse.ok) {
        throw new Error(`GitHub API error: ${currentFileResponse.status} ${currentFileResponse.statusText}`)
      }

      const currentFile: GitHubApiResponse = await currentFileResponse.json()
      const sha = currentFile.sha

      // Prepare the new content
      const newContent = JSON.stringify(data, null, 2)
      const encodedContent = Buffer.from(newContent).toString('base64')

      // Update the file
      const updateResponse = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent,
          sha: sha,
          committer: {
            name: 'Gospel Presentation Admin',
            email: 'admin@gospelpresentation.com'
          }
        })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.text()
        throw new Error(`GitHub API error: ${updateResponse.status} ${updateResponse.statusText} - ${errorData}`)
      }

      const result: GitHubUpdateResponse = await updateResponse.json()
      console.log('Successfully updated gospel presentation data:', result.commit.sha)
      
    } catch (error) {
      console.error('Error saving data to GitHub:', error)
      throw new Error('Failed to save gospel presentation data')
    }
  }

  async getCommitHistory(limit: number = 10): Promise<Array<{
    sha: string
    message: string
    author: string
    date: string
    url: string
  }>> {
    try {
      const commitsUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/commits?path=${this.filePath}&per_page=${limit}`
      
      const response = await fetch(commitsUrl, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const commits = await response.json()
      
      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url
      }))
    } catch (error) {
      console.error('Error fetching commit history:', error)
      throw new Error('Failed to fetch commit history')
    }
  }
}

export const githubDataService = new GitHubDataService()